import { useGameStore } from '../store/gameStore';
import { formatNumber } from '../utils/format';

export default function TopBar() {
  const money =
    useGameStore(
      (s) => s.money
    );

  const gems =
    useGameStore(
      (s) => s.gems
    );

  const incomePerSecond =
    useGameStore(
      (s) =>
        s.totalRevenuePerSec()
    );

  const branch =
    useGameStore(
      (s) =>
        s.branches[
          s.branches.length - 1
        ]
    );

  const stage = branch
    ? Number(
        branch.id.split('-')[1]
      )
    : 1;

  return (
    <header className="topbar">
      <div className="topbar__title-row">
        <div className="topbar__brand">
          <span className="topbar__logo">
            {branch
              ? branch.id ===
                'branch-2'
                ? '🥐'
                : branch.id ===
                  'branch-3'
                ? '🍢'
                : branch.id ===
                  'branch-4'
                ? '🍝'
                : branch.id ===
                  'branch-5'
                ? '🍦'
                : branch.id ===
                  'branch-6'
                ? '🍕'
                : '☕'
              : '☕'}
          </span>

          <div>
            <strong>
              STORE1
            </strong>

            <small>
              CHAPTER {stage}
            </small>
          </div>
        </div>

        <div className="topbar__gem">
          <span>💎</span>
          <strong>
            {formatNumber(gems)}
          </strong>
        </div>
      </div>

      <div className="money-hud">
        <div className="money-hud__main">
          <span className="money-hud__label">
            CASH
          </span>

          <strong>
            {formatNumber(money)}
            <small>원</small>
          </strong>
        </div>

        <div className="money-hud__income">
          <span>
            +{formatNumber(
              incomePerSecond
            )}
            원/s
          </span>

          <i />
        </div>
      </div>
    </header>
  );
}
