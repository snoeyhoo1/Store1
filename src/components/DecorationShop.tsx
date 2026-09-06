import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
}

export default function DecorationShop() {
  const decorations = useGameStore((s) => s.decorations);
  const gems = useGameStore((s) => s.gems);
  const purchaseDecoration = useGameStore((s) => s.purchaseDecoration);
  const claimDecoration = useGameStore((s) => s.claimDecoration);
  const [, forceTick] = useState(0);

  // 카운트다운 표시를 위해 1초마다 리렌더 (실제 판정은 store가 Date.now()로 함)
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="decoration-shop">
      <h4 className="decoration-shop__title">🛋️ 인테리어 (영구 평판 보너스)</h4>
      <div className="decoration-shop__grid">
        {decorations.map((d) => {
          const now = Date.now();
          const isClaimed = d.claimedAt !== null;
          const isPurchased = d.purchasedAt !== null && !isClaimed;
          const readyAt = d.purchasedAt ? d.purchasedAt + d.unlockHours * 60 * 60 * 1000 : 0;
          const isReady = isPurchased && now >= readyAt;

          return (
            <div key={d.id} className={`deco-card ${isClaimed ? 'deco-card--owned' : ''}`}>
              <span className="deco-card__emoji">{d.emoji}</span>
              <span className="deco-card__name">{d.name}</span>
              <span className="deco-card__bonus">+{Math.round(d.reputationBonus * 100)}% 평판</span>
              {isClaimed && <span className="deco-card__owned-badge">보유 중</span>}
              {!isClaimed && !isPurchased && (
                <button className="deco-card__btn" onClick={() => purchaseDecoration(d.id)} disabled={gems < d.gemCost}>
                  💎 {d.gemCost}
                </button>
              )}
              {isPurchased && !isReady && <span className="deco-card__timer">⏳ {formatRemaining(readyAt - now)}</span>}
              {isReady && (
                <button className="deco-card__btn deco-card__btn--ready" onClick={() => claimDecoration(d.id)}>
                  받기
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
