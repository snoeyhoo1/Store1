import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ────────────────────────────────────────────────────────────
// 게임 모델: "손님이 알아서 찾아오는" 매장 시뮬레이션
//
//   손님 도착률(마케팅레벨)  = BASE_ARRIVAL + 0.03 * 마케팅레벨      (명/초)
//   최종 도착률              = 도착률 * (평판배율(0.5~1.0) + 장식품 보너스) * 가격배율
//   서빙 처리량              = 직원수 / BASE_SERVICE_SECONDS         (명/초)
//   좌석(tables)             = 동시에 매장 안에 있을 수 있는 손님 수 상한
//
// 지점마다 "업종(메뉴 테마)"이 다르고, 새 지점을 열면 바로 손님을 받는 게 아니라
// 일정 시간 "공사 중" 상태를 거칩니다. 자세한 수치 근거는 BALANCE.md 참고.
// ────────────────────────────────────────────────────────────

const BASE_SERVICE_SECONDS = 12; // 직원 1명이 손님 1명 응대하는 데 걸리는 시간(초)
const BASE_PRICE = 4500; // 기본 객단가(원)
const MAX_OFFLINE_SECONDS = 2 * 60 * 60; // 오프라인 정산 최대 2시간
const OFFLINE_RATE = 0.5; // 오프라인 동안은 접속 중 수익의 50%만 인정
const DAILY_GIFT_INTERVAL_MS = 20 * 60 * 60 * 1000; // 20시간마다 선물상자 재충전

export interface BusinessType {
  name: string;
  icon: string;
  itemLabel: string; // "커피 한 잔"처럼 객단가 옆에 붙는 품목명
}

export const BUSINESS_TYPES: BusinessType[] = [
  { name: '카페', icon: '☕', itemLabel: '커피 한 잔' },
  { name: '베이커리', icon: '🥐', itemLabel: '빵 한 개' },
  { name: '분식집', icon: '🍢', itemLabel: '떡볶이 한 그릇' },
  { name: '레스토랑', icon: '🍝', itemLabel: '파스타 한 접시' },
  { name: '아이스크림 가게', icon: '🍦', itemLabel: '아이스크림 한 컵' },
  { name: '피자집', icon: '🍕', itemLabel: '피자 한 판' },
];

export interface Branch {
  id: string;
  name: string;
  opened: boolean;

  tables: number;
  staffCount: number;
  menuLevel: number;
  marketingLevel: number;
  costLevel: number;

  reputation: number;
  queueCount: number;
  arrivalAcc: number;
  serviceAcc: number;

  totalServed: number;
  totalMissed: number;
}

export interface Decoration {
  id: string;
  name: string;
  emoji: string;
  gemCost: number;
  unlockHours: number;
  reputationBonus: number;
  purchasedAt: number | null;
  claimedAt: number | null;
}

export interface Mission {
  id: string;
  label: string;
  statKey: 'lifetimeServed' | 'lifetimeStaffHired' | 'lifetimeBranchesOpened';
  target: number;
  rewardGems: number;
}

export interface GameState {
  money: number;
  gems: number;
  noAds: boolean;
  lastTick: number;
  boostUntil: number;
  superBoostUntil: number;
  branches: Branch[];

  lifetimeServed: number;
  lifetimeStaffHired: number;
  lifetimeBranchesOpened: number;

  decorations: Decoration[];
  completedMissionIds: string[];
  lastGiftClaimedAt: number;

  price: (branch: Branch) => number;
  costRatio: (branch: Branch) => number;
  arrivalRatePerSec: (branch: Branch) => number;
  serviceRatePerSec: (branch: Branch) => number;
  expectedRevenuePerSec: (branch: Branch) => number;
  totalRevenuePerSec: () => number;
  decorationBonus: () => number;
  playerLevel: () => { level: number; xpIntoLevel: number; xpForNextLevel: number };
  currentMission: () => (Mission & { progress: number }) | null;
  canClaimGift: () => boolean;
  businessType: (branch: Branch) => BusinessType;

  upgradeTablesCost: (branch: Branch) => number;
  hireStaffCost: (branch: Branch) => number;
  upgradeMenuCost: (branch: Branch) => number;
  upgradeMarketingCost: (branch: Branch) => number;
  upgradeCostSavingCost: (branch: Branch) => number;
  newBranchCost: () => number;

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
  claimDailyGift: () => number | null;
  purchaseDecoration: (id: string) => boolean;
  claimDecoration: (id: string) => boolean;
}

function makeBranch(id: string, name: string): Branch {
  return {
    id,
    name,
    opened: true,
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

const DECORATION_DEFS: Omit<Decoration, 'purchasedAt' | 'claimedAt'>[] = [
  { id: 'plant', name: '화분', emoji: '🪴', gemCost: 15, unlockHours: 1, reputationBonus: 0.02 },
  { id: 'art', name: '그림 액자', emoji: '🖼️', gemCost: 30, unlockHours: 4, reputationBonus: 0.03 },
  { id: 'lamp', name: '분위기 조명', emoji: '💡', gemCost: 50, unlockHours: 8, reputationBonus: 0.04 },
  { id: 'music', name: '스피커', emoji: '🎵', gemCost: 80, unlockHours: 24, reputationBonus: 0.06 },
  { id: 'sign', name: '네온 간판', emoji: '🔆', gemCost: 150, unlockHours: 48, reputationBonus: 0.1 },
];

const INITIAL_DECORATIONS: Decoration[] = DECORATION_DEFS.map((d) => ({ ...d, purchasedAt: null, claimedAt: null }));

const MISSIONS: Mission[] = [
  { id: 'm1', label: '손님 10명 응대하기', statKey: 'lifetimeServed', target: 10, rewardGems: 10 },
  { id: 'm2', label: '직원 2명 고용하기', statKey: 'lifetimeStaffHired', target: 2, rewardGems: 15 },
  { id: 'm3', label: '손님 50명 응대하기', statKey: 'lifetimeServed', target: 50, rewardGems: 20 },
  { id: 'm4', label: '2호점 열기', statKey: 'lifetimeBranchesOpened', target: 2, rewardGems: 30 },
  { id: 'm5', label: '손님 200명 응대하기', statKey: 'lifetimeServed', target: 200, rewardGems: 40 },
  { id: 'm6', label: '직원 5명 고용하기', statKey: 'lifetimeStaffHired', target: 5, rewardGems: 40 },
  { id: 'm7', label: '3호점 열기', statKey: 'lifetimeBranchesOpened', target: 3, rewardGems: 60 },
  { id: 'm8', label: '손님 1,000명 응대하기', statKey: 'lifetimeServed', target: 1000, rewardGems: 100 },
  { id: 'm9', label: '직원 10명 고용하기', statKey: 'lifetimeStaffHired', target: 10, rewardGems: 100 },
  { id: 'm10', label: '5호점 열기', statKey: 'lifetimeBranchesOpened', target: 5, rewardGems: 150 },
];

/** branch id("branch-3")에서 순번(1부터)을 뽑아냄 */
export function branchOrdinal(branch: Branch): number {
  const n = parseInt(branch.id.split('-')[1] ?? '1', 10);
  return Number.isNaN(n) ? 1 : n;
}

export function businessTypeOf(branch: Branch): BusinessType {
  const idx = (branchOrdinal(branch) - 1) % BUSINESS_TYPES.length;
  return BUSINESS_TYPES[idx];
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
  return 0.08 + 0.03 * branch.marketingLevel;
}

function reputationMultiplier(branch: Branch, decorationBonus: number): number {
  return clamp(0.5 + branch.reputation / 200 + decorationBonus, 0.5, 1.5);
}

function priceMultiplier(branch: Branch): number {
  const price = priceOf(branch);
  return 1 / (1 + (price / BASE_PRICE - 1) * 0.3);
}

function arrivalRateOf(branch: Branch, decorationBonus = 0): number {
  return baseArrivalRate(branch) * reputationMultiplier(branch, decorationBonus) * priceMultiplier(branch);
}

function serviceRateOf(branch: Branch): number {
  return branch.staffCount / BASE_SERVICE_SECONDS;
}

function computeDecorationBonus(decorations: Decoration[]): number {
  return decorations.filter((d) => d.claimedAt !== null).reduce((sum, d) => sum + d.reputationBonus, 0);
}

/**
 * 매장 하나를 dtSeconds만큼 앞으로 시뮬레이션합니다. 온라인일 때는 dt=1(초)로 자주
 * 호출하고, 오프라인 복귀 시에는 경과한 전체 초를 한 번에 넣어 계산합니다(근사치).
 */
function simulateBranch(
  branch: Branch,
  dtSeconds: number,
  decorationBonus: number
): { branch: Branch; revenue: number; served: number } {
  if (!branch.opened || dtSeconds <= 0) return { branch, revenue: 0, served: 0 };

  let { arrivalAcc, serviceAcc, queueCount, reputation, totalServed, totalMissed } = branch;

  const arrivalRate = arrivalRateOf(branch, decorationBonus);
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

  reputation = clamp(reputation - missed * 1.2 + (missed === 0 ? dtSeconds * 0.03 : 0), 0, 100);

  const revenue = served * priceOf(branch) * (1 - costRatioOf(branch));

  return {
    branch: { ...branch, arrivalAcc, serviceAcc, queueCount, reputation, totalServed, totalMissed },
    revenue,
    served,
  };
}

function currentMultiplier(boostUntil: number, superBoostUntil: number, nowMs: number): number {
  let m = 1;
  if (nowMs < boostUntil) m *= 2;
  if (nowMs < superBoostUntil) m *= 3;
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

      lifetimeServed: 0,
      lifetimeStaffHired: 0,
      lifetimeBranchesOpened: 1,

      decorations: INITIAL_DECORATIONS,
      completedMissionIds: [],
      lastGiftClaimedAt: 0,

      price: priceOf,
      costRatio: costRatioOf,
      arrivalRatePerSec: (branch) => arrivalRateOf(branch, get().decorationBonus()),
      serviceRatePerSec: serviceRateOf,
      decorationBonus: () => computeDecorationBonus(get().decorations),
      businessType: businessTypeOf,
      expectedRevenuePerSec: (branch) => {
        const rate = Math.min(arrivalRateOf(branch, get().decorationBonus()), serviceRateOf(branch));
        return rate * priceOf(branch) * (1 - costRatioOf(branch));
      },
      totalRevenuePerSec: () => {
        const state = get();
        const now = Date.now();
        const boosted = currentMultiplier(state.boostUntil, state.superBoostUntil, now);
        return (
          state.branches.filter((b) => b.opened).reduce((sum, b) => sum + state.expectedRevenuePerSec(b), 0) * boosted
        );
      },

      playerLevel: () => {
        const state = get();
        const xp = state.lifetimeServed + state.lifetimeStaffHired * 10 + state.lifetimeBranchesOpened * 50;
        const xpPerLevel = 100;
        const level = Math.floor(xp / xpPerLevel) + 1;
        const xpIntoLevel = xp % xpPerLevel;
        return { level, xpIntoLevel, xpForNextLevel: xpPerLevel };
      },

      currentMission: () => {
        const state = get();
        const next = MISSIONS.find((m) => !state.completedMissionIds.includes(m.id));
        if (!next) return null;
        const progress = Math.min(state[next.statKey], next.target);
        return { ...next, progress };
      },

      canClaimGift: () => Date.now() - get().lastGiftClaimedAt >= DAILY_GIFT_INTERVAL_MS,

      // 성장 배율을 예전보다 완만하게 잡아서, 숫자가 한 번에 확 뛰지 않고 K/M 단위 안에서
      // 조금씩 조금씩 늘어나는 느낌을 유지합니다.
      upgradeTablesCost: (b) => Math.ceil(300 * Math.pow(1.22, b.tables - 4)),
      hireStaffCost: (b) => Math.ceil(2000 * Math.pow(1.4, b.staffCount - 1)),
      upgradeMenuCost: (b) => Math.ceil(1000 * Math.pow(1.22, b.menuLevel)),
      upgradeMarketingCost: (b) => Math.ceil(800 * Math.pow(1.25, b.marketingLevel)),
      upgradeCostSavingCost: (b) => Math.ceil(1200 * Math.pow(1.3, b.costLevel)),
      newBranchCost: () => {
        const openedCount = get().branches.filter((b) => b.opened).length;
        // 대기 타이머 대신, 다음 지점 비용 자체를 크게 벌려서 "돈을 모으는 시간"이
        // 확실히 걸리도록 함 — 성장률을 업그레이드들보다 훨씬 가파르게 유지.
        return Math.ceil(15000 * Math.pow(2.0, openedCount - 1));
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
          lifetimeStaffHired: state.lifetimeStaffHired + 1,
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
        const nextIndex = openedCount + 1;
        const newBranch = makeBranch(`branch-${nextIndex}`, `${nextIndex}호점`);
        set({
          money: state.money - cost,
          lifetimeBranchesOpened: state.lifetimeBranchesOpened + 1,
          branches: [...state.branches, newBranch],
        });
        return true;
      },

      tick: (nowMs) => {
        const state = get();
        const dtSeconds = Math.max(0, (nowMs - state.lastTick) / 1000);
        if (dtSeconds <= 0) return;
        const boosted = currentMultiplier(state.boostUntil, state.superBoostUntil, nowMs);
        const bonus = state.decorationBonus();
        let totalRevenue = 0;
        let totalServedThisTick = 0;
        const nextBranches = state.branches.map((b) => {
          const { branch, revenue, served } = simulateBranch(b, dtSeconds, bonus);
          totalRevenue += revenue;
          totalServedThisTick += served;
          return branch;
        });
        set({
          money: state.money + totalRevenue * boosted,
          lifetimeServed: state.lifetimeServed + totalServedThisTick,
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
        const bonus = state.decorationBonus();
        let totalRevenue = 0;
        let totalServedOffline = 0;
        const nextBranches = state.branches.map((b) => {
          const { branch, revenue, served } = simulateBranch(b, cappedSeconds, bonus);
          totalRevenue += revenue;
          totalServedOffline += served;
          return branch;
        });
        const earned = Math.round(totalRevenue * OFFLINE_RATE);
        set({
          money: state.money + earned,
          lifetimeServed: state.lifetimeServed + totalServedOffline,
          branches: nextBranches,
          lastTick: now,
        });
        return { earned, capped: elapsedMs > MAX_OFFLINE_SECONDS * 1000 };
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

      claimDailyGift: () => {
        const state = get();
        if (!state.canClaimGift()) return null;
        const reward = 15;
        set({ gems: state.gems + reward, lastGiftClaimedAt: Date.now() });
        return reward;
      },

      purchaseDecoration: (id) => {
        const state = get();
        const d = state.decorations.find((x) => x.id === id);
        if (!d || d.purchasedAt !== null || state.gems < d.gemCost) return false;
        set({
          gems: state.gems - d.gemCost,
          decorations: state.decorations.map((x) => (x.id === id ? { ...x, purchasedAt: Date.now() } : x)),
        });
        return true;
      },

      claimDecoration: (id) => {
        const state = get();
        const d = state.decorations.find((x) => x.id === id);
        if (!d || d.purchasedAt === null || d.claimedAt !== null) return false;
        const readyAt = d.purchasedAt + d.unlockHours * 60 * 60 * 1000;
        if (Date.now() < readyAt) return false;
        set({
          decorations: state.decorations.map((x) => (x.id === id ? { ...x, claimedAt: Date.now() } : x)),
        });
        return true;
      },
    }),
    { name: 'cafe-tycoon-save' }
  )
);

useGameStore.subscribe((state) => {
  const mission = state.currentMission();
  if (!mission) return;
  if (mission.progress >= mission.target && !state.completedMissionIds.includes(mission.id)) {
    useGameStore.setState({
      gems: state.gems + mission.rewardGems,
      completedMissionIds: [...state.completedMissionIds, mission.id],
    });
  }
});
