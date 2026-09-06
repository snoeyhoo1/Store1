import { useState } from 'react';
import { useGameStore } from '../store/gameStore';

export default function GiftButton() {
  const canClaim = useGameStore((s) => s.canClaimGift());
  const claimDailyGift = useGameStore((s) => s.claimDailyGift);
  const [toast, setToast] = useState<number | null>(null);

  function handleClick() {
    const reward = claimDailyGift();
    if (reward === null) return;
    setToast(reward);
    setTimeout(() => setToast(null), 1800);
  }

  return (
    <div className="gift-button-wrap">
      <button className={`gift-button ${canClaim ? 'is-ready' : ''}`} onClick={handleClick} disabled={!canClaim}>
        🎁
        {canClaim && <span className="gift-button__dot" />}
      </button>
      {toast !== null && <span className="gift-toast">+{toast}💎</span>}
    </div>
  );
}
