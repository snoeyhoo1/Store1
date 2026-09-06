import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { showRewardedAd, showInterstitialIfReady } from '../services/ads';
import { purchase, restorePurchases, PRODUCTS } from '../services/iap';
import { formatNumber } from '../utils/format';
import BranchCard from './BranchCard';
import GemShop from './GemShop';
import MissionBanner from './MissionBanner';
import DecorationShop from './DecorationShop';

const BOOST_DURATION_MS = 10 * 60 * 1000;

export default function ShopFloor() {
  const branches = useGameStore((s) => s.branches.filter((b) => b.opened));
  const money = useGameStore((s) => s.money);
  const newBranchCost = useGameStore((s) => s.newBranchCost());
  const openNewBranch = useGameStore((s) => s.openNewBranch);
  const startBoost = useGameStore((s) => s.startBoost);
  const boostUntil = useGameStore((s) => s.boostUntil);
  const noAds = useGameStore((s) => s.noAds);
  const addGems = useGameStore((s) => s.addGems);
  const setNoAds = useGameStore((s) => s.setNoAds);
  const [busy, setBusy] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);

  const boosting = Date.now() < boostUntil;
  const canOpenBranch = money >= newBranchCost;

  async function handleWatchAd() {
    if (busy) return;
    setBusy(true);
    const rewarded = await showRewardedAd();
    if (rewarded) startBoost(BOOST_DURATION_MS);
    setBusy(false);
  }

  async function handleOpenBranch() {
    if (busy) return;
    setBusy(true);
    const ok = openNewBranch();
    if (ok) {
      await showInterstitialIfReady();
    }
    setBusy(false);
  }

  async function handleBuyGems() {
    if (busy) return;
    setBusy(true);
    const ok = await purchase(PRODUCTS.GEMS_SMALL);
    if (ok) addGems(100);
    setBusy(false);
  }

  async function handleRemoveAds() {
    if (busy) return;
    setBusy(true);
    const ok = await purchase(PRODUCTS.REMOVE_ADS);
    if (ok) setNoAds(true);
    setBusy(false);
  }

  async function handleRestore() {
    if (busy) return;
    setBusy(true);
    const restored = await restorePurchases();
    if (restored.includes(PRODUCTS.REMOVE_ADS)) {
      setNoAds(true);
      setRestoreMsg('광고 제거가 복원되었어요.');
    } else {
      setRestoreMsg('복원할 구매 내역이 없어요.');
    }
    setBusy(false);
    setTimeout(() => setRestoreMsg(null), 2500);
  }

  return (
    <main className="shop-floor">
      <MissionBanner />

      <section className="branch-list">
        {branches.map((b, i) => (
          <BranchCard key={b.id} branch={b} defaultExpanded={i === branches.length - 1} />
        ))}
      </section>

      <button className={`expand-button ${canOpenBranch ? 'is-affordable' : ''}`} onClick={handleOpenBranch} disabled={!canOpenBranch || busy}>
        🏗️ 새 지점 열기 — {formatNumber(newBranchCost)}원
      </button>

      <GemShop />
      <DecorationShop />

      <section className="action-tray">
        <button className={`boost-button ${boosting ? 'is-active' : ''}`} onClick={handleWatchAd} disabled={busy}>
          {boosting ? '⚡ 수익 2배 진행 중' : '📺 광고 보고 10분 동안 수익 2배'}
        </button>
        <div className="iap-row">
          <button className="iap-button" onClick={handleBuyGems} disabled={busy}>
            💎 젬 100개 구매
          </button>
          {!noAds && (
            <button className="iap-button" onClick={handleRemoveAds} disabled={busy}>
              🚫 광고 제거
            </button>
          )}
        </div>
        <button className="restore-link" onClick={handleRestore} disabled={busy}>
          구매 복원
        </button>
        {restoreMsg && <p className="restore-msg">{restoreMsg}</p>}
      </section>
    </main>
  );
}
