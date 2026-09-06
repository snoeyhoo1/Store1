import { useGameStore } from '../store/gameStore';
import { formatNumber } from '../utils/format';

export default function TopBar() {
  const money = useGameStore((s) => s.money);
  const gems = useGameStore((s) => s.gems);
  const incomePerSecond = useGameStore((s) => s.totalRevenuePerSec());
  const level = useGameStore((s) => s.playerLevel());

  const branch = useGameStore(
    (s) => s.branches[s.branches.length - 1]
  );

  const stage = branch
    ? Number(branch.id.split('-')[1] ?? 1)
    : 1;

  const levelProgress = Math.min(
    100,
    Math.round(
      (level.xpIntoLevel / Math.max(level.xpForNextLevel, 1)) * 100
    )
  );

  return (
    <header className="topbar">
      <div className="topbar__game-row">
        <div className="topbar__level">
          <div className="topbar__level-star">★</div>

          <div className="topbar__level-body">
            <div className="topbar__level-line">
              <strong>LV.{level.level}</strong>

              <span>
                {level.xpIntoLevel}/{level.xpForNextLevel}
              </span>
            </div>

            <div className="topbar__level-track">
              <span
                style={{
                  width: `${levelProgress}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="topbar__currency topbar__currency--cash">
          <span className="currency-icon">▣</span>

          <div>
            <strong>
              {formatNumber(money)}
            </strong>

            <small>
              +{formatNumber(incomePerSecond)}/초
            </small>
          </div>

          <button
            className="currency-plus"
            aria-label="현금 메뉴"
          >
            +
          </button>
        </div>

        <div className="topbar__currency topbar__currency--gem">
          <span className="currency-icon">◆</span>

          <strong>
            {formatNumber(gems)}
          </strong>

          <button
            className="currency-plus"
            aria-label="젬 메뉴"
          >
            +
          </button>
        </div>
      </div>

      <div className="topbar__store-row">
        <div className="topbar__store-title">
          <span className="topbar__store-icon">
            {branch?.id === 'branch-2'
              ? '🥐'
              : branch?.id === 'branch-3'
                ? '🍢'
                : branch?.id === 'branch-4'
                  ? '🍝'
                  : branch?.id === 'branch-5'
                    ? '🍦'
                    : branch?.id === 'branch-6'
                      ? '🍕'
                      : '☕'}
          </span>

          <div>
            <span>
              CHAPTER {stage}
            </span>

            <strong>
              {branch?.name ?? '본점'}
            </strong>
          </div>
        </div>

        <div className="topbar__quick-actions">
          <button aria-label="선물">
            🎁
          </button>

          <button aria-label="설정">
            ⚙
          </button>
        </div>
      </div>
    </header>
  );
}
