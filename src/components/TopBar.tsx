import { useGameStore } from '../store/gameStore';
import { formatNumber } from '../utils/format';

export default function TopBar() {
  const money = useGameStore((s) => s.money);
  const gems = useGameStore((s) => s.gems);
  const incomePerSecond = useGameStore((s) => s.totalRevenuePerSec());

  return (
    <header className="topbar">
      <div className="topbar__title">
        <span className="topbar__logo">☕</span>
        <span>카페 키우기</span>
      </div>
      <div className="topbar__stats">
        <div className="stat stat--money">
          <span className="stat__value">{formatNumber(money)}</span>
          <span className="stat__label">원 · 초당 {formatNumber(incomePerSecond)}</span>
        </div>
        <div className="stat stat--gems">
          <span className="stat__value">💎 {formatNumber(gems)}</span>
        </div>
      </div>
    </header>
  );
}
