import type { CapacitorConfig } from '@capacitor/cli';

// ⚠️ appId는 Play Console에 등록할 패키지명과 반드시 일치해야 하고,
// 출시 후에는 절대 바꿀 수 없습니다. 본인 도메인/닉네임으로 미리 정해두세요.
// 예: com.hyunsoo.cafetycoon
const config: CapacitorConfig = {
  appId: 'com.hyunsoo.cafetycoon',
  appName: '카페 키우기',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
