import { Capacitor } from '@capacitor/core';

// ⚠️ 아래 테스트 ID는 Google이 제공하는 공식 "항상 테스트 광고만 나오는" ID입니다.
// 실제 배포 전에는 반드시 본인 AdMob 계정에서 발급받은 실제 광고 단위 ID로 교체하세요.
// 테스트 ID로 실 서비스를 내보내면 광고가 아예 안 뜨거나(정상), 실제 ID를 테스트 중에
// 쓰면 계정이 정지될 수 있습니다 — 반대로 섞지 않도록 주의.
const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';
const TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712';

// 전면광고 스팸 방지용 최소 간격 (밀리초)
const INTERSTITIAL_MIN_GAP_MS = 60_000;
let lastInterstitialAt = 0;
let initialized = false;

// @capacitor-community/admob 는 웹 빌드에서 import하면 에러가 나므로,
// 네이티브(Android/iOS)일 때만 동적으로 로드합니다.
async function loadPlugin() {
  if (!Capacitor.isNativePlatform()) return null;
  return import('@capacitor-community/admob');
}

export async function initAds() {
  const mod = await loadPlugin();
  if (!mod || initialized) return;
  const { AdMob } = mod;
  // initialize()에 이어 트래킹/동의(UMP) 상태를 확인하는 것이 정석이지만,
  // 최소 동작을 위해 여기서는 초기화만 합니다. EEA/영국향 정식 출시 전에는
  // AdMob.requestConsentInfo() / showConsentForm() 흐름을 추가하세요 (Play 정책 요구사항).
  await AdMob.initialize();
  initialized = true;
}

export async function showBanner() {
  const mod = await loadPlugin();
  if (!mod) return; // 웹 프리뷰에서는 배너 생략
  const { AdMob, BannerAdPosition, BannerAdSize } = mod;
  await AdMob.showBanner({
    adId: TEST_BANNER_ID,
    adSize: BannerAdSize.BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 0,
    isTesting: true, // ⚠️ 실제 출시 빌드에서는 반드시 제거하세요
  });
}

export async function hideBanner() {
  const mod = await loadPlugin();
  if (!mod) return;
  await mod.AdMob.hideBanner();
}

/**
 * 보상형 광고를 보여주고, 사용자가 끝까지 시청해 보상을 받았을 때만 true를 반환합니다.
 * 웹 프리뷰(브라우저)에서는 실제 광고 SDK가 없으므로 confirm 창으로 시뮬레이션합니다.
 */
export async function showRewardedAd(): Promise<boolean> {
  const mod = await loadPlugin();
  if (!mod) {
    return window.confirm('[테스트 모드] 보상형 광고를 끝까지 시청한 것으로 처리할까요?');
  }
  const { AdMob, RewardAdPluginEvents } = mod;
  let rewarded = false;
  const handle = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
    rewarded = true;
  });
  try {
    await AdMob.prepareRewardVideoAd({ adId: TEST_REWARDED_ID, isTesting: true });
    await AdMob.showRewardVideoAd();
  } catch (e) {
    console.warn('보상형 광고 로드 실패, 사용자는 보상을 받지 못합니다.', e);
  } finally {
    await handle.remove();
  }
  return rewarded;
}

/**
 * 전면광고(interstitial). 새 지점을 열 때처럼 화면이 바뀌는 타이밍에 씁니다.
 * 마지막 노출로부터 INTERSTITIAL_MIN_GAP_MS가 지나지 않았으면 조용히 무시합니다
 * (연속 노출은 이탈률만 올리고 실익이 없음).
 */
export async function showInterstitialIfReady(): Promise<void> {
  const now = Date.now();
  if (now - lastInterstitialAt < INTERSTITIAL_MIN_GAP_MS) return;
  const mod = await loadPlugin();
  if (!mod) return; // 웹 프리뷰에서는 생략 (confirm 스팸 방지)
  const { AdMob } = mod;
  try {
    await AdMob.prepareInterstitial({ adId: TEST_INTERSTITIAL_ID, isTesting: true });
    await AdMob.showInterstitial();
    lastInterstitialAt = now;
  } catch (e) {
    console.warn('전면광고 로드 실패 — 조용히 넘어감(사용자 흐름을 막지 않음).', e);
  }
}
