import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ────────────────────────────────────────────────────────────
// 게임 모델: "손님이 알아서 찾아오는" 카페 시뮬레이션
//
//   손님 도착률(마케팅레벨)  = BASE_ARRIVAL + 0.03 * 마케팅레벨      (명/초)
//   최종 도착률              = 도착률 * 평판배율(0.5~1.0) * 가격배율
//   서빙 처리량              = 직원수 / BASE_SERVICE_SECONDS         (명/초)
//   좌석(tables)             = 동시에 매장 안에 있을 수 있는 손님 수 상한
//                              (좌석이 꽉 차면 도착한 손님은 그냥 발길을 돌림 = 놓친 손님)
//
// 즉 "직원 수"가 실제 처리 속도(매출 상한)를 결정하고, "좌석 수"는 손님을
// 놓치지 않기 위한 버퍼 역할, "마케팅/평판/가격"은 애초에 얼마나 많은 손님이
// 오느냐를 결정합니다 — 어느 한 곳에만 투자하면 병목이 생기도록 설계했습니다.
// 자세한 수치 근거는 BALANCE.md 참고.
// ────────────────────────────────────────────────────────────

const BASE_SERVICE_SECONDS = 12; // 직원 1명이 손님 1명 응대하는 데 걸리는 시간(초)
const BASE_PRICE = 4500; // 기본 객단가(원) — 아메리카노 한 잔 느낌
const MAX_OFFLINE_SECONDS = 2 * 60 * 60; // 오프라인 정산 최대 2시간
const OFFLINE_RATE = 0.5; // 오프라인 동안은 접속 중 수익의 50%만 인정

export interface Branch {
  id: string;
  name: string;
  opened: boolean;

  tables: number; // 좌석 수 (수용 상한)
  staffCount: number; // 직원 수 (처리 속도)
  menuLevel: number; // 메뉴 개발 레벨 (가격에 반영)
  marketingLevel: number; // 마케팅 레벨 (도착률에 반영)
  costLevel: number; // 원가절감 레벨

  reputation: number; // 0~100
  queueCount: number; // 현재 매장 안 손님 수 (대기+응대중)
  arrivalAcc: number; // 내부 시뮬레이션 누적값 (도착)
  serviceAcc: number; // 내부 시뮬레이션 누적값 (서빙 완료)

  totalServed: number;
  totalMissed: number;
}

export interface GameState {
  money: number;
  gems: number;
  noAds: boolean;
  lastTick: number;
  boostUntil: number;
  superBoostUntil: number;
  branches: Branch[];

  // 파생값
  price: (branch: Branch) => number;
  costRatio: (branch: Branch) => number;
  arrivalRatePerSec: (branch: Branch) => number;
  serviceRatePerSec: (branch: Branch) => number;
  expectedRevenuePerSec: (branch: Branch) => number;
  totalRevenuePerSec: () => number;

  upgradeTablesCost: (branch: Branch) => number;
  hireStaffCost: (branch: Branch) => number;
  upgradeMenuCost: (branch: Branch) => number;
  upgradeMarketingCost: (branch: Branch) => number;
  upgradeCostSavingCost: (branch: Branch) => number;
  newBranchCost: () => number;

  // 액션
  upgradeTables: (branchId: string) => boolean;
  hireStaff: (branchId: string) => boolean;
  upgradeMenu: (branchId: string) => boolean;
  upgradeMarketing: (branchId: string) => boolean;
  upgradeCostSaving: (branchId: string) => boolean;
  openNewBranch: () => boolean;

  tick: (nowMs: number) => void;
  claimOfflineEarnings: () => { earned: number; capped: boolean } | null;
  startBoost: (durationMs: number) => void;
  spendGemsFillSeats: () => boolean;
  spendGemsSuperBoost: () => boolean;
  addGems: (amount: number) => void;
  setNoAds: (value: boolean) => void;
}

function makeBranch(id: string, name: string): Branch {
  return {
    id,
    name,
    opened: id === 'branch-1',
    tables: 4,
    staffCount: 1,
    menuLevel: 0,
    marketingLevel: 0,
    costLevel: 0,
    reputation: 60,
    queueCount: 0,
    arrivalAcc: 0,
    serviceAcc: 0,
    totalServed: 0,
    totalMissed: 0,
  };
}

const INITIAL_BRANCHES: Branch[] = [makeBranch('branch-1', '본점')];

/** branch id("branch-3")에서 순번(1부터)을 뽑아냄 — 통화 단위 결정에 사용 */
export function branchOrdinal(branch: Branch): number {
  const n = parseInt(branch.id.split('-')[1] ?? '1', 10);
  return Number.isNaN(n) ? 1 : n;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function priceOf(branch: Branch): number {
  return BASE_PRICE + 500 * branch.menuLevel;
}

function costRatioOf(branch: Branch): number {
  return clamp(0.35 - 0.03 * branch.costLevel, 0.15, 0.35);
}

function baseArrivalRate(branch: Branch): number {
  return 0.08 + 0.03 * branch.marketingLevel; // 명/초
}

function reputationMultiplier(branch: Branch): number {
  return 0.5 + branch.reputation / 200; // 0.5 ~ 1.0
}

function priceMultiplier(branch: Branch): number {
  const price = priceOf(branch);
  return 1 / (1 + (price / BASE_PRICE - 1) * 0.3);
}

function arrivalRateOf(branch: Branch): number {
  return baseArrivalRate(branch) * reputationMultiplier(branch) * priceMultiplier(branch);
}

function serviceRateOf(branch: Branch): number {
  return branch.staffCount / BASE_SERVICE_SECONDS;
}

/**
 * 매장 하나를 dtSeconds 만큼 앞으로 시뮬레이션합니다.
 * 온라인일 때는 dt=1(초) 로 자주 호출하고, 오프라인 복귀 시에는
 * 경과한 전체 초를 한 번에 넣어 "몰아서" 계산합니다 (근사치).
 */
function simulateBranch(branch: Branch, dtSeconds: number): { branch: Branch; revenue: number } {
  if (!branch.opened || dtSeconds <= 0) return { branch, revenue: 0 };

  let { arrivalAcc, serviceAcc, queueCount, reputation, totalServed, totalMissed } = branch;

  const arrivalRate = arrivalRateOf(branch);
  arrivalAcc += arrivalRate * dtSeconds;
  let missed = 0;
  while (arrivalAcc >= 1) {
    arrivalAcc -= 1;
    if (queueCount < branch.tables) {
      queueCount += 1;
    } else {
      missed += 1;
    }
  }
  totalMissed += missed;

  const serviceRate = serviceRateOf(branch);
  serviceAcc += serviceRate * dtSeconds;
  let served = 0;
  while (serviceAcc >= 1 && queueCount > 0) {
    serviceAcc -= 1;
    queueCount -= 1;
    served += 1;
  }
  totalServed += served;

  // 평판: 손님을 놓치면 깎이고, 안 놓쳤으면 서서히 회복
  reputation = clamp(reputation - missed * 1.2 + (missed === 0 ? dtSeconds * 0.03 : 0), 0, 100);

  const revenue = served * priceOf(branch) * (1 - costRatioOf(branch));

  return {
    branch: { ...branch, arrivalAcc, serviceAcc, queueCount, reputation, totalServed, totalMissed },
    revenue,
  };
}

function currentMultiplier(boostUntil: number, superBoostUntil: number, nowMs: number): number {
  let m = 1;
  if (nowMs < boostUntil) m *= 2; // 광고 시청 보너스
  if (nowMs < superBoostUntil) m *= 3; // 젬으로 산 프로모션
  return m;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      money: 3000,
      gems: 0,
      noAds: false,
      lastTick: Date.now(),
      boostUntil: 0,
      superBoostUntil: 0,
      branches: INITIAL_BRANCHES,

      price: priceOf,
      costRatio: costRatioOf,
      arrivalRatePerSec: arrivalRateOf,
      serviceRatePerSec: serviceRateOf,
      expectedRevenuePerSec: (branch) => {
        const rate = Math.min(arrivalRateOf(branch), serviceRateOf(branch));
        return rate * priceOf(branch) * (1 - costRatioOf(branch));
      },
      totalRevenuePerSec: () => {
        const state = get();
        const boosted = currentMultiplier(state.boostUntil, state.superBoostUntil, Date.now());
        return (
          state.branches.filter((b) => b.opened).reduce((sum, b) => sum + state.expectedRevenuePerSec(b), 0) * boosted
        );
      },

      upgradeTablesCost: (b) => Math.ceil(300 * Math.pow(1.28, b.tables - 4)),
      hireStaffCost: (b) => Math.ceil(2500 * Math.pow(1.5, b.staffCount - 1)),
      upgradeMenuCost: (b) => Math.ceil(1200 * Math.pow(1.3, b.menuLevel)),
      upgradeMarketingCost: (b) => Math.ceil(1000 * Math.pow(1.35, b.marketingLevel)),
      upgradeCostSavingCost: (b) => Math.ceil(1500 * Math.pow(1.4, b.costLevel)),
      newBranchCost: () => {
        const openedCount = get().branches.filter((b) => b.opened).length;
        return Math.ceil(20000 * Math.pow(2.2, openedCount - 1));
      },

      upgradeTables: (branchId) => {
        const state = get();
        const b = state.branches.find((x) => x.id === branchId);
        if (!b) return false;
        const cost = state.upgradeTablesCost(b);
        if (state.money < cost) return false;
        set({
          money: state.money - cost,
          branches: state.branches.map((x) => (x.id === branchId ? { ...x, tables: x.tables + 1 } : x)),
        });
        return true;
      },

      hireStaff: (branchId) => {
        const state = get();
        const b = state.branches.find((x) => x.id === branchId);
        if (!b) return false;
        const cost = state.hireStaffCost(b);
        if (state.money < cost) return false;
        set({
          money: state.money - cost,
          branches: state.branches.map((x) => (x.id === branchId ? { ...x, staffCount: x.staffCount + 1 } : x)),
        });
        return true;
      },

      upgradeMenu: (branchId) => {
        const state = get();
        const b = state.branches.find((x) => x.id === branchId);
        if (!b) return false;
        const cost = state.upgradeMenuCost(b);
        if (state.money < cost) return false;
        set({
          money: state.money - cost,
          branches: state.branches.map((x) => (x.id === branchId ? { ...x, menuLevel: x.menuLevel + 1 } : x)),
        });
        return true;
      },

      upgradeMarketing: (branchId) => {
        const state = get();
        const b = state.branches.find((x) => x.id === branchId);
        if (!b) return false;
        const cost = state.upgradeMarketingCost(b);
        if (state.money < cost) return false;
        set({
          money: state.money - cost,
          branches: state.branches.map((x) => (x.id === branchId ? { ...x, marketingLevel: x.marketingLevel + 1 } : x)),
        });
        return true;
      },

      upgradeCostSaving: (branchId) => {
        const state = get();
        const b = state.branches.find((x) => x.id === branchId);
        if (!b) return false;
        const cost = state.upgradeCostSavingCost(b);
        if (state.money < cost) return false;
        set({
          money: state.money - cost,
          branches: state.branches.map((x) => (x.id === branchId ? { ...x, costLevel: x.costLevel + 1 } : x)),
        });
        return true;
      },

      openNewBranch: () => {
        const state = get();
        const cost = state.newBranchCost();
        if (state.money < cost) return false;
        const openedCount = state.branches.filter((b) => b.opened).length;
        const closedSlot = state.branches.find((b) => !b.opened);
        const nextIndex = openedCount + 1;
        if (closedSlot) {
          set({
            money: state.money - cost,
            branches: state.branches.map((b) => (b.id === closedSlot.id ? { ...b, opened: true } : b)),
          });
        } else {
          const newBranch = makeBranch(`branch-${nextIndex}`, `${nextIndex}호점`);
          set({
            money: state.money - cost,
            branches: [...state.branches, { ...newBranch, opened: true }],
          });
        }
        return true;
      },

      tick: (nowMs) => {
        const state = get();
        const dtSeconds = Math.max(0, (nowMs - state.lastTick) / 1000);
        if (dtSeconds <= 0) return;
        const boosted = currentMultiplier(state.boostUntil, state.superBoostUntil, nowMs);
        let totalRevenue = 0;
        const nextBranches = state.branches.map((b) => {
          const { branch, revenue } = simulateBranch(b, dtSeconds);
          totalRevenue += revenue;
          return branch;
        });
        set({
          money: state.money + totalRevenue * boosted,
          branches: nextBranches,
          lastTick: nowMs,
        });
      },

      claimOfflineEarnings: () => {
        const state = get();
        const now = Date.now();
        const elapsedMs = now - state.lastTick;
        if (elapsedMs < 30_000) {
          set({ lastTick: now });
          return null;
        }
        const cappedSeconds = Math.min(elapsedMs / 1000, MAX_OFFLINE_SECONDS);
        let totalRevenue = 0;
        const nextBranches = state.branches.map((b) => {
          const { branch, revenue } = simulateBranch(b, cappedSeconds);
          totalRevenue += revenue;
          return branch;
        });
        const earned = Math.round(totalRevenue * OFFLINE_RATE);
        set({ money: state.money + earned, branches: nextBranches, lastTick: now });
        return { earned, capped: elapsedMs / 1000 > MAX_OFFLINE_SECONDS };
      },

      startBoost: (durationMs) => {
        const now = Date.now();
        set((state) => ({ boostUntil: Math.max(state.boostUntil, now) + durationMs }));
      },

      spendGemsFillSeats: () => {
        const state = get();
        const cost = 20;
        if (state.gems < cost) return false;
        set({
          gems: state.gems - cost,
          branches: state.branches.map((b) => (b.opened ? { ...b, queueCount: b.tables } : b)),
        });
        return true;
      },

      spendGemsSuperBoost: () => {
        const state = get();
        const cost = 50;
        if (state.gems < cost) return false;
        const now = Date.now();
        set({
          gems: state.gems - cost,
          superBoostUntil: Math.max(state.superBoostUntil, now) + 30 * 60 * 1000,
        });
        return true;
      },

      addGems: (amount) => set((state) => ({ gems: state.gems + amount })),
      setNoAds: (value) => set({ noAds: value }),
    }),
    { name: 'cafe-tycoon-save' }
  )
);
