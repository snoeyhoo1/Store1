import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useGameStore } from './store/gameStore';
import { initAds, showBanner } from './services/ads';
import { initBilling } from './services/iap';
import TopBar from './components/TopBar';
import ShopFloor from './components/ShopFloor';
import OfflineEarningsModal from './components/OfflineEarningsModal';

export default function App() {
  const tick = useGameStore((s) => s.tick);
  const claimOfflineEarnings = useGameStore((s) => s.claimOfflineEarnings);
  const [offlinePopup, setOfflinePopup] = useState<{ earned: number; capped: boolean } | null>(null);
  const [hasNativeBanner, setHasNativeBanner] = useState(false);

  // 앱 시작 시 1회: 광고/결제 SDK 초기화 + 오프라인 수익 정산
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setHasNativeBanner(true);
      initAds().then(() => showBanner());
    }
    initBilling();
    const result = claimOfflineEarnings();
    if (result) setOfflinePopup(result);
  }, []);

  // 화면이 열려있는 동안: 1초마다 수익 정산 (실시간으로 숫자가 올라가는 느낌)
  useEffect(() => {
    const id = setInterval(() => tick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [tick]);

  // 앱이 백그라운드로 갔다가 돌아왔을 때도 정산 (모바일 웹뷰 대응)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick(Date.now());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [tick]);

  return (
    <div className={`app-shell ${hasNativeBanner ? 'app-shell--banner-space' : ''}`}>
      <TopBar />
      <ShopFloor />
      {offlinePopup && (
        <OfflineEarningsModal result={offlinePopup} onClose={() => setOfflinePopup(null)} />
      )}
    </div>
  );
}
