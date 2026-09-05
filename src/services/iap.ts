import { Capacitor } from '@capacitor/core';

// ⚠️ 실제 상품 ID는 Play Console > 수익 창출 > 인앱 상품에서 만든 것과
// 정확히 똑같은 문자열이어야 합니다. 여기 적힌 값은 예시입니다.
export const PRODUCTS = {
  GEMS_SMALL: 'gems_small_100', // 소액 젬 팩
  GEMS_LARGE: 'gems_large_600', // 대용량 젬 팩
  REMOVE_ADS: 'remove_ads', // 광고 제거 (non-consumable)
} as const;

export type ProductId = (typeof PRODUCTS)[keyof typeof PRODUCTS];

/**
 * NOTE: capacitor-community 계열 Billing 플러그인은 프로젝트 상황에 따라
 * (cordova-plugin-purchase 래핑 vs 자체 구현) API 모양이 달라서, 여기서는
 * "무엇을 연결해야 하는지"를 명확히 하는 스켈레톤만 제공합니다.
 * 실제 연동 시 README의 IAP 섹션을 참고해서 이 파일 내부만 교체하면 되도록
 * 바깥(store, 컴포넌트)에서는 이 함수들만 호출합니다.
 */

export async function initBilling(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  // TODO: 선택한 Billing 플러그인의 initialize/connect 호출
}

export async function purchase(productId: ProductId): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return window.confirm(`[테스트 모드] "${productId}" 결제를 완료한 것으로 처리할까요?`);
  }
  // TODO: 실제 결제 플로우 연결
  // 성공 시 Play가 영수증을 주면, 서버(또는 최소한 클라이언트 검증)를 거쳐
  // true를 반환하고 gameStore.addGems / setNoAds 를 호출하세요.
  console.warn('purchase(): 아직 실제 Billing 플러그인이 연결되지 않았습니다.', productId);
  return false;
}

export async function restorePurchases(): Promise<ProductId[]> {
  if (!Capacitor.isNativePlatform()) return [];
  // TODO: 기기 변경/재설치 시 "구매 복원" — 특히 광고 제거는 필수 구현.
  return [];
}
