import { useGameStore } from '../store/gameStore';

export default function GemShop() {
  const gems = useGameStore((s) => s.gems);
  const spendGemsFillSeats = useGameStore((s) => s.spendGemsFillSeats);
  const spendGemsSuperBoost = useGameStore((s) => s.spendGemsSuperBoost);
  const superBoostUntil = useGameStore((s) => s.superBoostUntil);
  const boosting = Date.now() < superBoostUntil;

  return (
    <section className="gem-shop">
      <h4 className="gem-shop__title">💎 젬 상점</h4>
      <div className="gem-shop__row">
        <button className="gem-btn" onClick={() => spendGemsFillSeats()} disabled={gems < 20}>
          <span>⚡ 즉시 손님 채우기</span>
          <span className="gem-btn__cost">💎 20</span>
        </button>
        <button className={`gem-btn ${boosting ? 'is-active' : ''}`} onClick={() => spendGemsSuperBoost()} disabled={gems < 50}>
          <span>{boosting ? '🌟 3배 진행 중' : '🌟 30분 수익 3배'}</span>
          <span className="gem-btn__cost">💎 50</span>
        </button>
      </div>
    </section>
  );
}
