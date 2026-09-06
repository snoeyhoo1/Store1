import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================
// STORE1 GAME CORE V2
// 현재 매장 하나만 운영하는 챕터형 타이쿤
//
// 1장 카페
// 2장 베이커리
// 3장 분식집
// 4장 레스토랑
// 5장 아이스크림
// 6장 피자
//
// 다음 챕터로 넘어가면 이전 매장은 제거된다.
// 대신 lifetime 통계는 유지된다.
// ============================================================

const BASE_SERVICE_SECONDS = 12;
const BASE_PRICE = 4500;

const MAX_OFFLINE_SECONDS = 2 * 60 * 60;
const OFFLINE_RATE = 0.5;

const DAILY_GIFT_INTERVAL_MS = 20 * 60 * 60 * 1000;

export interface BusinessType {
  name: string;
  icon: string;
  itemLabel: string;
  subtitle: string;
}

export const BUSINESS_TYPES: BusinessType[] = [
  {
    name: '카페',
    icon: '☕',
    itemLabel: '커피 한 잔',
    subtitle: '동네에서 시작하는 첫 번째 매장',
  },
  {
    name: '베이커리',
    icon: '🥐',
    itemLabel: '빵 한 개',
    subtitle: '빵 냄새로 거리를 채워보세요',
  },
  {
    name: '분식집',
    icon: '🍢',
    itemLabel: '떡볶이 한 그릇',
    subtitle: '사람이 몰리는 골목 상권',
  },
  {
    name: '레스토랑',
    icon: '🍝',
    itemLabel: '파스타 한 접시',
    subtitle: '고급 상권으로 진출합니다',
  },
  {
    name: '아이스크림',
    icon: '🍦',
    itemLabel: '아이스크림 한 컵',
    subtitle: '대형 상권을 장악하세요',
  },
  {
    name: '피자집',
    icon: '🍕',
    itemLabel: '피자 한 판',
    subtitle: '도시 최고의 매장',
  },
];

export const CHAPTER_NAMES = [
  '동네 카페',
  '베이커리 거리',
  '분식 골목',
  '미식 거리',
  '아이스크림 타운',
  '피자 시티',
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
  statKey:
    | 'lifetimeServed'
    | 'lifetimeStaffHired'
    | 'lifetimeBranchesOpened';
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

  playerLevel: () => {
    level: number;
    xpIntoLevel: number;
    xpForNextLevel: number;
  };

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

  claimOfflineEarnings: () => {
    earned: number;
    capped: boolean;
  } | null;

  startBoost: (durationMs: number) => void;

  spendGemsFillSeats: () => boolean;
  spendGemsSuperBoost: () => boolean;

  addGems: (amount: number) => void;
  setNoAds: (value: boolean) => void;

  claimDailyGift: () => number | null;

  purchaseDecoration: (id: string) => boolean;
  claimDecoration: (id: string) => boolean;
}

// ============================================================
// 챕터 해금 비용
// ============================================================

export function chapterRequirement(stage: number): number {
  if (stage <= 1) return 250_000;

  return Math.ceil(
    250_000 * Math.pow(20, stage - 1)
  );
}

// 1호점 -> 250,000
// 2호점 -> 5,000,000
// 3호점 -> 100,000,000
// 4호점 -> 2,000,000,000
// 5호점 -> 40,000,000,000
//
// 6호점 이후는 현재 콘텐츠가 끝난다.

// ============================================================
// 챕터별 기본 객단가
// ============================================================

export function chapterBasePrice(stage: number): number {
  return BASE_PRICE * Math.pow(10, stage - 1);
}

// 1장 4,500
// 2장 45,000
// 3장 450,000
// 4장 4,500,000
// 5장 45,000,000
// 6장 450,000,000

// ============================================================
// Branch helpers
// ============================================================

export function branchOrdinal(branch: Branch): number {
  const n = parseInt(
    branch.id.split('-')[1] ?? '1',
    10
  );

  return Number.isNaN(n) ? 1 : n;
}

export function businessTypeOf(
  branch: Branch
): BusinessType {
  const index = Math.max(
    0,
    Math.min(
      BUSINESS_TYPES.length - 1,
      branchOrdinal(branch) - 1
    )
  );

  return BUSINESS_TYPES[index];
}

export function stageName(stage: number): string {
  return (
    CHAPTER_NAMES[
      Math.max(
        0,
        Math.min(CHAPTER_NAMES.length - 1, stage - 1)
      )
    ] ?? '새로운 상권'
  );
}

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.max(min, Math.min(max, value));
}

// ============================================================
// Branch factory
// ============================================================

function makeBranch(
  id: string,
  name: string
): Branch {
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

const INITIAL_BRANCHES: Branch[] = [
  makeBranch('branch-1', '본점'),
];

// ============================================================
// Decorations
// ============================================================

const DECORATION_DEFS: Omit<
  Decoration,
  'purchasedAt' | 'claimedAt'
>[] = [
  {
    id: 'plant',
    name: '화분',
    emoji: '🪴',
    gemCost: 15,
    unlockHours: 1,
    reputationBonus: 0.02,
  },
  {
    id: 'art',
    name: '그림 액자',
    emoji: '🖼️',
    gemCost: 30,
    unlockHours: 4,
    reputationBonus: 0.03,
  },
  {
    id: 'lamp',
    name: '분위기 조명',
    emoji: '💡',
    gemCost: 50,
    unlockHours: 8,
    reputationBonus: 0.04,
  },
  {
    id: 'music',
    name: '스피커',
    emoji: '🎵',
    gemCost: 80,
    unlockHours: 24,
    reputationBonus: 0.06,
  },
  {
    id: 'sign',
    name: '네온 간판',
    emoji: '🔆',
    gemCost: 150,
    unlockHours: 48,
    reputationBonus: 0.1,
  },
];

const INITIAL_DECORATIONS: Decoration[] =
  DECORATION_DEFS.map((d) => ({
    ...d,
    purchasedAt: null,
    claimedAt: null,
  }));

// ============================================================
// Missions
// ============================================================

const MISSIONS: Mission[] = [
  {
    id: 'm1',
    label: '손님 10명 응대하기',
    statKey: 'lifetimeServed',
    target: 10,
    rewardGems: 10,
  },
  {
    id: 'm2',
    label: '직원 2명 고용하기',
    statKey: 'lifetimeStaffHired',
    target: 2,
    rewardGems: 15,
  },
  {
    id: 'm3',
    label: '손님 50명 응대하기',
    statKey: 'lifetimeServed',
    target: 50,
    rewardGems: 20,
  },
  {
    id: 'm4',
    label: '2호점 열기',
    statKey: 'lifetimeBranchesOpened',
    target: 2,
    rewardGems: 30,
  },
  {
    id: 'm5',
    label: '손님 200명 응대하기',
    statKey: 'lifetimeServed',
    target: 200,
    rewardGems: 40,
  },
  {
    id: 'm6',
    label: '직원 5명 고용하기',
    statKey: 'lifetimeStaffHired',
    target: 5,
    rewardGems: 40,
  },
  {
    id: 'm7',
    label: '3호점 열기',
    statKey: 'lifetimeBranchesOpened',
    target: 3,
    rewardGems: 60,
  },
  {
    id: 'm8',
    label: '손님 1,000명 응대하기',
    statKey: 'lifetimeServed',
    target: 1000,
    rewardGems: 100,
  },
  {
    id: 'm9',
    label: '직원 10명 고용하기',
    statKey: 'lifetimeStaffHired',
    target: 10,
    rewardGems: 100,
  },
  {
    id: 'm10',
    label: '5호점 열기',
    statKey: 'lifetimeBranchesOpened',
    target: 5,
    rewardGems: 150,
  },
];

// ============================================================
// Economy
// ============================================================

function priceOf(branch: Branch): number {
  const stage = branchOrdinal(branch);

  const base = chapterBasePrice(stage);

  // 메뉴 업그레이드마다 객단가가 조금씩 상승
  const menuMultiplier = Math.pow(
    1.12,
    branch.menuLevel
  );

  return Math.round(base * menuMultiplier);
}

function costRatioOf(branch: Branch): number {
  return clamp(
    0.35 - 0.03 * branch.costLevel,
    0.15,
    0.35
  );
}

function baseArrivalRate(branch: Branch): number {
  const stage = branchOrdinal(branch);

  // 챕터가 높아질수록 상권 자체가 조금 좋아진다.
  return (
    0.08 +
    0.01 * (stage - 1) +
    0.03 * branch.marketingLevel
  );
}

function reputationMultiplier(
  branch: Branch,
  decorationBonus: number
): number {
  return clamp(
    0.5 +
      branch.reputation / 200 +
      decorationBonus,
    0.5,
    1.5
  );
}

function priceMultiplier(
  branch: Branch
): number {
  // 메뉴 업그레이드가 너무 많아지면 방문률이 약간 낮아짐.
  return 1 / (
    1 +
    branch.menuLevel * 0.055
  );
}

function arrivalRateOf(
  branch: Branch,
  decorationBonus = 0
): number {
  return (
    baseArrivalRate(branch) *
    reputationMultiplier(
      branch,
      decorationBonus
    ) *
    priceMultiplier(branch)
  );
}

function serviceRateOf(
  branch: Branch
): number {
  return (
    branch.staffCount /
    BASE_SERVICE_SECONDS
  );
}

function computeDecorationBonus(
  decorations: Decoration[]
): number {
  return decorations
    .filter((d) => d.claimedAt !== null)
    .reduce(
      (sum, d) =>
        sum + d.reputationBonus,
      0
    );
}

// ============================================================
// Simulation
// ============================================================

function simulateBranch(
  branch: Branch,
  dtSeconds: number,
  decorationBonus: number
): {
  branch: Branch;
  revenue: number;
  served: number;
} {
  if (
    !branch.opened ||
    dtSeconds <= 0
  ) {
    return {
      branch,
      revenue: 0,
      served: 0,
    };
  }

  let {
    arrivalAcc,
    serviceAcc,
    queueCount,
    reputation,
    totalServed,
    totalMissed,
  } = branch;

  const arrivalRate =
    arrivalRateOf(
      branch,
      decorationBonus
    );

  arrivalAcc +=
    arrivalRate * dtSeconds;

  let missed = 0;

  while (arrivalAcc >= 1) {
    arrivalAcc -= 1;

    if (
      queueCount <
      branch.tables
    ) {
      queueCount += 1;
    } else {
      missed += 1;
    }
  }

  totalMissed += missed;

  const serviceRate =
    serviceRateOf(branch);

  serviceAcc +=
    serviceRate * dtSeconds;

  let served = 0;

  while (
    serviceAcc >= 1 &&
    queueCount > 0
  ) {
    serviceAcc -= 1;
    queueCount -= 1;
    served += 1;
  }

  totalServed += served;

  reputation = clamp(
    reputation -
      missed * 1.2 +
      (missed === 0
        ? dtSeconds * 0.03
        : 0),
    0,
    100
  );

  const revenue =
    served *
    priceOf(branch) *
    (1 - costRatioOf(branch));

  return {
    branch: {
      ...branch,
      arrivalAcc,
      serviceAcc,
      queueCount,
      reputation,
      totalServed,
      totalMissed,
    },
    revenue,
    served,
  };
}

function currentMultiplier(
  boostUntil: number,
  superBoostUntil: number,
  nowMs: number
): number {
  let multiplier = 1;

  if (nowMs < boostUntil) {
    multiplier *= 2;
  }

  if (nowMs < superBoostUntil) {
    multiplier *= 3;
  }

  return multiplier;
}

// ============================================================
// Store
// ============================================================

export const useGameStore =
  create<GameState>()(
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

        decorations:
          INITIAL_DECORATIONS,

        completedMissionIds: [],

        lastGiftClaimedAt: 0,

        price: priceOf,

        costRatio: costRatioOf,

        arrivalRatePerSec: (branch) =>
          arrivalRateOf(
            branch,
            get().decorationBonus()
          ),

        serviceRatePerSec:
          serviceRateOf,

        decorationBonus: () =>
          computeDecorationBonus(
            get().decorations
          ),

        businessType:
          businessTypeOf,

        expectedRevenuePerSec:
          (branch) => {
            const rate = Math.min(
              arrivalRateOf(
                branch,
                get().decorationBonus()
              ),
              serviceRateOf(branch)
            );

            return (
              rate *
              priceOf(branch) *
              (1 - costRatioOf(branch))
            );
          },

        totalRevenuePerSec: () => {
          const state = get();

          const branch =
            state.branches[
              state.branches.length - 1
            ];

          if (!branch) return 0;

          const multiplier =
            currentMultiplier(
              state.boostUntil,
              state.superBoostUntil,
              Date.now()
            );

          return (
            state.expectedRevenuePerSec(
              branch
            ) * multiplier
          );
        },

        playerLevel: () => {
          const state = get();

          const xp =
            state.lifetimeServed +
            state.lifetimeStaffHired *
              10 +
            state.lifetimeBranchesOpened *
              50;

          const xpPerLevel = 100;

          const level =
            Math.floor(
              xp / xpPerLevel
            ) + 1;

          const xpIntoLevel =
            xp % xpPerLevel;

          return {
            level,
            xpIntoLevel,
            xpForNextLevel:
              xpPerLevel,
          };
        },

        currentMission: () => {
          const state = get();

          const next = MISSIONS.find(
            (mission) =>
              !state.completedMissionIds.includes(
                mission.id
              )
          );

          if (!next) return null;

          const progress = Math.min(
            state[next.statKey],
            next.target
          );

          return {
            ...next,
            progress,
          };
        },

        canClaimGift: () =>
          Date.now() -
            get().lastGiftClaimedAt >=
          DAILY_GIFT_INTERVAL_MS,

        businessType:
          businessTypeOf,

        // ==================================================
        // Upgrade costs
        // ==================================================

        upgradeTablesCost: (branch) =>
          Math.ceil(
            300 *
              Math.pow(
                1.24,
                branch.tables - 4
              ) *
              branchOrdinal(branch)
          ),

        hireStaffCost: (branch) =>
          Math.ceil(
            2000 *
              Math.pow(
                1.42,
                branch.staffCount - 1
              ) *
              branchOrdinal(branch)
          ),

        upgradeMenuCost: (branch) =>
          Math.ceil(
            1000 *
              branchOrdinal(branch) *
              Math.pow(
                1.24,
                branch.menuLevel
              )
          ),

        upgradeMarketingCost: (branch) =>
          Math.ceil(
            800 *
              branchOrdinal(branch) *
              Math.pow(
                1.28,
                branch.marketingLevel
              )
          ),

        upgradeCostSavingCost: (branch) =>
          Math.ceil(
            1200 *
              branchOrdinal(branch) *
              Math.pow(
                1.32,
                branch.costLevel
              )
          ),

        // ==================================================
        // Next chapter cost
        // ==================================================

        newBranchCost: () => {
          const state = get();

          const current =
            state.branches[
              state.branches.length - 1
            ];

          if (!current) {
            return chapterRequirement(1);
          }

          const stage =
            branchOrdinal(current);

          if (
            stage >=
            BUSINESS_TYPES.length
          ) {
            return Infinity;
          }

          return chapterRequirement(
            stage
          );
        },

        // ==================================================
        // Upgrades
        // ==================================================

        upgradeTables: (branchId) => {
          const state = get();

          const branch =
            state.branches.find(
              (b) => b.id === branchId
            );

          if (!branch) return false;

          const cost =
            state.upgradeTablesCost(
              branch
            );

          if (state.money < cost) {
            return false;
          }

          set({
            money:
              state.money - cost,

            branches:
              state.branches.map(
                (b) =>
                  b.id === branchId
                    ? {
                        ...b,
                        tables:
                          b.tables + 1,
                      }
                    : b
              ),
          });

          return true;
        },

        hireStaff: (branchId) => {
          const state = get();

          const branch =
            state.branches.find(
              (b) => b.id === branchId
            );

          if (!branch) return false;

          const cost =
            state.hireStaffCost(
              branch
            );

          if (state.money < cost) {
            return false;
          }

          set({
            money:
              state.money - cost,

            lifetimeStaffHired:
              state.lifetimeStaffHired +
              1,

            branches:
              state.branches.map(
                (b) =>
                  b.id === branchId
                    ? {
                        ...b,
                        staffCount:
                          b.staffCount +
                          1,
                      }
                    : b
              ),
          });

          return true;
        },

        upgradeMenu: (branchId) => {
          const state = get();

          const branch =
            state.branches.find(
              (b) => b.id === branchId
            );

          if (!branch) return false;

          const cost =
            state.upgradeMenuCost(
              branch
            );

          if (state.money < cost) {
            return false;
          }

          set({
            money:
              state.money - cost,

            branches:
              state.branches.map(
                (b) =>
                  b.id === branchId
                    ? {
                        ...b,
                        menuLevel:
                          b.menuLevel +
                          1,
                      }
                    : b
              ),
          });

          return true;
        },

        upgradeMarketing: (branchId) => {
          const state = get();

          const branch =
            state.branches.find(
              (b) => b.id === branchId
            );

          if (!branch) return false;

          const cost =
            state.upgradeMarketingCost(
              branch
            );

          if (state.money < cost) {
            return false;
          }

          set({
            money:
              state.money - cost,

            branches:
              state.branches.map(
                (b) =>
                  b.id === branchId
                    ? {
                        ...b,
                        marketingLevel:
                          b.marketingLevel +
                          1,
                      }
                    : b
              ),
          });

          return true;
        },

        upgradeCostSaving: (branchId) => {
          const state = get();

          const branch =
            state.branches.find(
              (b) => b.id === branchId
            );

          if (!branch) return false;

          const cost =
            state.upgradeCostSavingCost(
              branch
            );

          if (state.money < cost) {
            return false;
          }

          set({
            money:
              state.money - cost,

            branches:
              state.branches.map(
                (b) =>
                  b.id === branchId
                    ? {
                        ...b,
                        costLevel:
                          b.costLevel +
                          1,
                      }
                    : b
              ),
          });

          return true;
        },

        // ==================================================
        // 다음 가게
        // ==================================================

        openNewBranch: () => {
          const state = get();

          const current =
            state.branches[
              state.branches.length - 1
            ];

          if (!current) return false;

          const currentStage =
            branchOrdinal(current);

          if (
            currentStage >=
            BUSINESS_TYPES.length
          ) {
            return false;
          }

          const cost =
            chapterRequirement(
              currentStage
            );

          if (state.money < cost) {
            return false;
          }

          const nextStage =
            currentStage + 1;

          const nextType =
            BUSINESS_TYPES[
              nextStage - 1
            ];

          const newBranch =
            makeBranch(
              `branch-${nextStage}`,
              `${nextStage}호점`
            );

          // 새 매장은 이전 매장을 완전히 교체한다.
          // 이전 매장 기록은 lifetime 통계에만 남는다.
          set({
            money:
              state.money - cost,

            lifetimeBranchesOpened:
              state.lifetimeBranchesOpened +
              1,

            branches: [
              {
                ...newBranch,
              },
            ],
          });

          return true;
        },

        // ==================================================
        // Main tick
        // ==================================================

        tick: (nowMs) => {
          const state = get();

          const dtSeconds =
            Math.max(
              0,
              (nowMs -
                state.lastTick) /
                1000
            );

          if (dtSeconds <= 0) {
            return;
          }

          const branch =
            state.branches[
              state.branches.length - 1
            ];

          if (!branch) {
            set({
              lastTick: nowMs,
            });

            return;
          }

          const multiplier =
            currentMultiplier(
              state.boostUntil,
              state.superBoostUntil,
              nowMs
            );

          const bonus =
            state.decorationBonus();

          const result =
            simulateBranch(
              branch,
              dtSeconds,
              bonus
            );

          set({
            money:
              state.money +
              result.revenue *
                multiplier,

            lifetimeServed:
              state.lifetimeServed +
              result.served,

            branches: [
              result.branch,
            ],

            lastTick: nowMs,
          });
        },

        // ==================================================
        // Offline
        // ==================================================

        claimOfflineEarnings: () => {
          const state = get();

          const now = Date.now();

          const elapsedMs =
            now - state.lastTick;

          if (elapsedMs < 30_000) {
            set({
              lastTick: now,
            });

            return null;
          }

          const cappedSeconds =
            Math.min(
              elapsedMs / 1000,
              MAX_OFFLINE_SECONDS
            );

          const branch =
            state.branches[
              state.branches.length - 1
            ];

          if (!branch) {
            set({
              lastTick: now,
            });

            return null;
          }

          const bonus =
            state.decorationBonus();

          const result =
            simulateBranch(
              branch,
              cappedSeconds,
              bonus
            );

          const earned = Math.round(
            result.revenue *
              OFFLINE_RATE
          );

          set({
            money:
              state.money + earned,

            lifetimeServed:
              state.lifetimeServed +
              result.served,

            branches: [
              result.branch,
            ],

            lastTick: now,
          });

          return {
            earned,
            capped:
              elapsedMs >
              MAX_OFFLINE_SECONDS *
                1000,
          };
        },

        // ==================================================
        // Boost
        // ==================================================

        startBoost: (durationMs) => {
          const now = Date.now();

          set((state) => ({
            boostUntil:
              Math.max(
                state.boostUntil,
                now
              ) + durationMs,
          }));
        },

        // ==================================================
        // Gems
        // ==================================================

        spendGemsFillSeats: () => {
          const state = get();

          const cost = 20;

          if (state.gems < cost) {
            return false;
          }

          const branch =
            state.branches[
              state.branches.length - 1
            ];

          if (!branch) return false;

          set({
            gems:
              state.gems - cost,

            branches: [
              {
                ...branch,
                queueCount:
                  branch.tables,
              },
            ],
          });

          return true;
        },

        spendGemsSuperBoost: () => {
          const state = get();

          const cost = 50;

          if (state.gems < cost) {
            return false;
          }

          const now = Date.now();

          set({
            gems:
              state.gems - cost,

            superBoostUntil:
              Math.max(
                state.superBoostUntil,
                now
              ) +
              30 * 60 * 1000,
          });

          return true;
        },

        addGems: (amount) =>
          set((state) => ({
            gems:
              state.gems + amount,
          })),

        setNoAds: (value) =>
          set({
            noAds: value,
          }),

        // ==================================================
        // Daily gift
        // ==================================================

        claimDailyGift: () => {
          const state = get();

          if (!state.canClaimGift()) {
            return null;
          }

          const reward = 15;

          set({
            gems:
              state.gems + reward,

            lastGiftClaimedAt:
              Date.now(),
          });

          return reward;
        },

        // ==================================================
        // Decorations
        // ==================================================

        purchaseDecoration: (id) => {
          const state = get();

          const decoration =
            state.decorations.find(
              (d) => d.id === id
            );

          if (
            !decoration ||
            decoration.purchasedAt !==
              null ||
            state.gems <
              decoration.gemCost
          ) {
            return false;
          }

          set({
            gems:
              state.gems -
              decoration.gemCost,

            decorations:
              state.decorations.map(
                (d) =>
                  d.id === id
                    ? {
                        ...d,
                        purchasedAt:
                          Date.now(),
                      }
                    : d
              ),
          });

          return true;
        },

        claimDecoration: (id) => {
          const state = get();

          const decoration =
            state.decorations.find(
              (d) => d.id === id
            );

          if (
            !decoration ||
            decoration.purchasedAt ===
              null ||
            decoration.claimedAt !==
              null
          ) {
            return false;
          }

          const readyAt =
            decoration.purchasedAt +
            decoration.unlockHours *
              60 *
              60 *
              1000;

          if (
            Date.now() < readyAt
          ) {
            return false;
          }

          set({
            decorations:
              state.decorations.map(
                (d) =>
                  d.id === id
                    ? {
                        ...d,
                        claimedAt:
                          Date.now(),
                      }
                    : d
              ),
          });

          return true;
        },
      }),

      {
        name: 'cafe-tycoon-save',
      }
    )
  );

// ============================================================
// Mission auto reward
// ============================================================

useGameStore.subscribe(
  (state) => {
    const mission =
      state.currentMission();

    if (!mission) return;

    if (
      mission.progress >=
        mission.target &&
      !state.completedMissionIds.includes(
        mission.id
      )
    ) {
      useGameStore.setState({
        gems:
          state.gems +
          mission.rewardGems,

        completedMissionIds: [
          ...state.completedMissionIds,
          mission.id,
        ],
      });
    }
  }
);
