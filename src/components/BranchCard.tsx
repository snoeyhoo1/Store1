import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Branch,
  useGameStore,
} from '../store/gameStore';

import {
  formatNumber,
} from '../utils/format';

import CustomerFigure from './CustomerFigure';
import ChairIcon from './ChairIcon';
import ZoneModal from './ZoneModal';

type ZoneKey =
  | 'counter'
  | 'seats'
  | 'growth'
  | null;

function UpgradeButton({
  label,
  sub,
  cost,
  money,
  onClick,
}: {
  label: string;
  sub: string;
  cost: number;
  money: number;
  onClick: () => void;
}) {
  const canAfford =
    money >= cost;

  return (
    <button
      className={`game-upgrade ${
        canAfford
          ? 'game-upgrade--active'
          : ''
      }`}
      onClick={onClick}
      disabled={!canAfford}
    >
      <strong>{label}</strong>

      <span>{sub}</span>

      <b>
        {formatNumber(cost)}원
      </b>
    </button>
  );
}

function getRepClass(
  reputation: number
) {
  if (reputation >= 70)
    return 'rep-good';

  if (reputation >= 35)
    return 'rep-mid';

  return 'rep-bad';
}

export default function BranchCard({
  branch,
}: {
  branch: Branch;
  defaultExpanded?: boolean;
}) {
  const money =
    useGameStore(
      (s) => s.money
    );

  const price =
    useGameStore(
      (s) => s.price(branch)
    );

  const costRatio =
    useGameStore(
      (s) => s.costRatio(branch)
    );

  const arrivalRate =
    useGameStore(
      (s) =>
        s.arrivalRatePerSec(branch)
    );

  const businessType =
    useGameStore(
      (s) => s.businessType(branch)
    );

  const upgradeTablesCost =
    useGameStore(
      (s) =>
        s.upgradeTablesCost(branch)
    );

  const hireStaffCost =
    useGameStore(
      (s) =>
        s.hireStaffCost(branch)
    );

  const upgradeMenuCost =
    useGameStore(
      (s) =>
        s.upgradeMenuCost(branch)
    );

  const upgradeMarketingCost =
    useGameStore(
      (s) =>
        s.upgradeMarketingCost(branch)
    );

  const upgradeCostSavingCost =
    useGameStore(
      (s) =>
        s.upgradeCostSavingCost(branch)
    );

  const upgradeTables =
    useGameStore(
      (s) => s.upgradeTables
    );

  const hireStaff =
    useGameStore(
      (s) => s.hireStaff
    );

  const upgradeMenu =
    useGameStore(
      (s) => s.upgradeMenu
    );

  const upgradeMarketing =
    useGameStore(
      (s) => s.upgradeMarketing
    );

  const upgradeCostSaving =
    useGameStore(
      (s) => s.upgradeCostSaving
    );

  const [activeZone, setActiveZone] =
    useState<ZoneKey>(null);

  const [floats, setFloats] =
    useState<
      {
        id: number;
        amount: number;
      }[]
    >([]);

  const previousServed =
    useRef(
      branch.totalServed
    );

  const previousQueue =
    useRef(
      branch.queueCount
    );

  const [arrivalPulse, setArrivalPulse] =
    useState(false);

  const profitPerCustomer =
    Math.round(
      price *
        (1 - costRatio)
    );

  // 손님 응대 시 돈이 위로 뜨는 효과
  useEffect(() => {
    const difference =
      branch.totalServed -
      previousServed.current;

    previousServed.current =
      branch.totalServed;

    if (difference <= 0) {
      return;
    }

    const id =
      Date.now() +
      Math.random();

    setFloats((current) => [
      ...current,
      {
        id,
        amount:
          difference *
          profitPerCustomer,
      },
    ]);

    const timer =
      setTimeout(() => {
        setFloats((current) =>
          current.filter(
            (item) =>
              item.id !== id
          )
        );
      }, 1100);

    return () =>
      clearTimeout(timer);
  }, [
    branch.totalServed,
    profitPerCustomer,
  ]);

  // 손님이 새로 들어오면 매장 전체에 작은 펄스
  useEffect(() => {
    if (
      branch.queueCount >
      previousQueue.current
    ) {
      setArrivalPulse(true);

      const timer =
        setTimeout(() => {
          setArrivalPulse(false);
        }, 350);

      previousQueue.current =
        branch.queueCount;

      return () =>
        clearTimeout(timer);
    }

    previousQueue.current =
      branch.queueCount;
  }, [
    branch.queueCount,
  ]);

  const seats =
    Array.from(
      {
        length: Math.min(
          branch.tables,
          12
        ),
      },
      (_, index) =>
        index <
        branch.queueCount
    );

  const visibleCustomers =
    seats
      .map(
        (occupied, index) =>
          occupied
            ? index
            : null
      )
      .filter(
        (value) =>
          value !== null
      ) as number[];

  return (
    <>
      <section
        className={`game-scene ${
          arrivalPulse
            ? 'game-scene--pulse'
            : ''
        }`}
      >
        {/* ================================================
            Scene Header
        ================================================= */}

        <div className="scene-header">
          <div>
            <div className="scene-header__eyebrow">
              TODAY'S STORE
            </div>

            <h2>
              {businessType.icon}{' '}
              {branch.name}
            </h2>

            <p>
              {businessType.subtitle}
            </p>
          </div>

          <div className="scene-status">
            <span
              className={`scene-status__dot ${
                branch.queueCount <
                branch.tables
                  ? 'scene-status__dot--open'
                  : 'scene-status__dot--busy'
              }`}
            />

            <span>
              {branch.queueCount <
              branch.tables
                ? '영업 중'
                : '혼잡'}
            </span>
          </div>
        </div>

        {/* ================================================
            2D Game Room
        ================================================= */}

        <div className="store-room">
          <div className="store-room__wall store-room__wall--back" />

          <div className="store-room__sign">
            <span>
              {businessType.icon}
            </span>

            <strong>
              {businessType.name}
            </strong>

            <small>
              OPEN
            </small>
          </div>

          {/* window */}
          <div className="store-window">
            <div className="window-light" />
            <div className="window-frame window-frame--v" />
            <div className="window-frame window-frame--h" />
          </div>

          {/* plant */}
          <div className="room-decoration room-decoration--plant">
            🪴
          </div>

          {/* lamp */}
          <div className="room-decoration room-decoration--lamp">
            💡
          </div>

          {/* counter */}
          <button
            className="room-counter"
            onClick={() =>
              setActiveZone(
                'counter'
              )
            }
          >
            <span className="room-counter__top">
              {businessType.icon}
            </span>

            <span className="room-counter__body">
              COUNTER
            </span>

            <span className="room-counter__staff">
              👨‍🍳 ×{' '}
              {branch.staffCount}
            </span>
          </button>

          {/* tables */}
          <div className="room-tables">
            {seats.map(
              (occupied, index) => (
                <button
                  key={index}
                  className={`room-table ${
                    occupied
                      ? 'room-table--busy'
                      : ''
                  }`}
                  onClick={() =>
                    setActiveZone(
                      'seats'
                    )
                  }
                >
                  <span className="room-table__surface">
                    <span className="room-table__emoji">
                      🪑
                    </span>
                  </span>

                  {occupied && (
                    <span className="room-table__customer">
                      <CustomerFigure
                        variant={
                          index
                        }
                      />
                    </span>
                  )}

                  {!occupied && (
                    <span className="room-table__empty">
                      <ChairIcon />
                    </span>
                  )}
                </button>
              )
            )}
          </div>

          {/* door */}
          <div className="store-door">
            <span>🚪</span>
            <small>입구</small>
          </div>

          {/* customers entering */}
          <div className="room-customers">
            {visibleCustomers
              .slice(0, 4)
              .map((index) => (
                <div
                  key={index}
                  className="walking-customer"
                >
                  <CustomerFigure
                    variant={
                      index + 2
                    }
                  />
                </div>
              ))}
          </div>

          {/* floating money */}
          <div className="money-float-layer">
            {floats.map(
              (float) => (
                <span
                  key={float.id}
                  className="money-float"
                >
                  +{formatNumber(
                    float.amount
                  )}
                </span>
              )
            )}
          </div>

          {/* Floor label */}
          <div className="room-floor-label">
            {branch.queueCount}/
            {branch.tables} 손님
          </div>
        </div>

        {/* ================================================
            Stats
        ================================================= */}

        <div className="scene-stats">
          <div className="scene-stat">
            <span>평판</span>

            <div className="rep-track">
              <div
                className={`rep-fill ${getRepClass(
                  branch.reputation
                )}`}
                style={{
                  width: `${branch.reputation}%`,
                }}
              />
            </div>

            <strong>
              {Math.round(
                branch.reputation
              )}
            </strong>
          </div>

          <div className="scene-stat-grid">
            <div>
              <small>
                객단가
              </small>

              <strong>
                {formatNumber(
                  price
                )}
                원
              </strong>
            </div>

            <div>
              <small>
                초당 수익
              </small>

              <strong>
                {formatNumber(
                  Math.min(
                    arrivalRate,
                    branch.staffCount /
                      12
                  ) *
                    profitPerCustomer
                )}
                원
              </strong>
            </div>

            <div>
              <small>
                직원
              </small>

              <strong>
                {branch.staffCount}명
              </strong>
            </div>

            <div>
              <small>
                좌석
              </small>

              <strong>
                {branch.tables}석
              </strong>
            </div>
          </div>
        </div>

        {/* ================================================
            Interactive Zones
        ================================================= */}

        <div className="scene-zone-grid">
          <button
            className="scene-zone"
            onClick={() =>
              setActiveZone(
                'counter'
              )
            }
          >
            <span className="scene-zone__icon">
              {businessType.icon}
            </span>

            <span>
              <strong>
                카운터
              </strong>

              <small>
                직원 · 메뉴
              </small>
            </span>

            <b>›</b>
          </button>

          <button
            className="scene-zone"
            onClick={() =>
              setActiveZone(
                'seats'
              )
            }
          >
            <span className="scene-zone__icon">
              🪑
            </span>

            <span>
              <strong>
                매장
              </strong>

              <small>
                좌석 확장
              </small>
            </span>

            <b>›</b>
          </button>

          <button
            className="scene-zone"
            onClick={() =>
              setActiveZone(
                'growth'
              )
            }
          >
            <span className="scene-zone__icon">
              📈
            </span>

            <span>
              <strong>
                성장
              </strong>

              <small>
                마케팅 · 원가
              </small>
            </span>

            <b>›</b>
          </button>
        </div>
      </section>

      {/* ================================================
          Upgrade Modals
      ================================================= */}

      {activeZone ===
        'counter' && (
        <ZoneModal
          title={`${businessType.name} 운영`}
          icon={
            businessType.icon
          }
          onClose={() =>
            setActiveZone(null)
          }
        >
          <UpgradeButton
            label="직원 고용"
            sub={`현재 ${branch.staffCount}명`}
            cost={hireStaffCost}
            money={money}
            onClick={() =>
              hireStaff(
                branch.id
              )
            }
          />

          <UpgradeButton
            label="메뉴 개발"
            sub={`Lv.${branch.menuLevel} → ${
              branch.menuLevel + 1
            }`}
            cost={upgradeMenuCost}
            money={money}
            onClick={() =>
              upgradeMenu(
                branch.id
              )
            }
          />
        </ZoneModal>
      )}

      {activeZone ===
        'seats' && (
        <ZoneModal
          title="매장 확장"
          icon="🪑"
          onClose={() =>
            setActiveZone(null)
          }
        >
          <UpgradeButton
            label="좌석 추가"
            sub={`현재 ${branch.tables}석`}
            cost={upgradeTablesCost}
            money={money}
            onClick={() =>
              upgradeTables(
                branch.id
              )
            }
          />
        </ZoneModal>
      )}

      {activeZone ===
        'growth' && (
        <ZoneModal
          title="경영 전략"
          icon="📈"
          onClose={() =>
            setActiveZone(null)
          }
        >
          <UpgradeButton
            label="마케팅"
            sub={`Lv.${branch.marketingLevel}`}
            cost={
              upgradeMarketingCost
            }
            money={money}
            onClick={() =>
              upgradeMarketing(
                branch.id
              )
            }
          />

          <UpgradeButton
            label="원가 절감"
            sub={`Lv.${branch.costLevel}`}
            cost={
              upgradeCostSavingCost
            }
            money={money}
            onClick={() =>
              upgradeCostSaving(
                branch.id
              )
            }
          />
        </ZoneModal>
      )}
    </>
  );
}
