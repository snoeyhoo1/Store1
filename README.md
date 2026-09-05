# 카페 키우기 (Cafe Tycoon) — Android 방치형 육성 게임

React + Capacitor로 만든 가게(카페) 키우기 게임입니다. 웹 코드베이스 그대로
Android 네이티브 앱(AAB)으로 빌드해서 Play 스토어에 낼 수 있어요.

> ⚠️ 이 대화 환경은 네트워크가 막혀 있어서 `npm install` / `npx cap add android`를
> 여기서 직접 실행해보지 못했습니다. 아래 순서대로 **본인 컴퓨터에서** 실행하면
> 정상적으로 프로젝트가 완성됩니다. (Node.js 18+ / Android Studio 필요)

## 0. 준비물

- Node.js 18 이상
- Android Studio (Android SDK, 에뮬레이터 포함)
- Google Play Console 개발자 계정 (최초 1회 $25, 평생 유효)
- Google AdMob 계정 (무료)

## 1. 로컬에서 실행해보기 (웹 프리뷰)

```bash
npm install
npm run dev
```

브라우저에서 게임이 뜹니다. 광고/IAP는 여기서는 `confirm()` 창으로
시뮬레이션되니 로직/밸런스 확인용으로 쓰세요.

## 2. Android 프로젝트 생성

```bash
npm run build          # dist/ 생성
npx cap add android    # 최초 1회, android/ 폴더 생성
npm run cap:sync       # 코드 수정할 때마다 반복
npm run cap:open       # Android Studio 열림
```

Android Studio에서 에뮬레이터나 실제 기기로 Run 하면 앱이 실행됩니다.

## 3. AdMob 연동

이 프로젝트는 Capacitor 공식 문서가 추천하는 **`@capacitor-community/admob`**(Capacitor 6 호환, `@6` 태그)를
씁니다. `src/services/ads.ts`에 배너/보상형/전면광고가 전부 이미 연결되어 있어요 — 아래 순서대로
본인 계정 정보만 채우면 바로 동작합니다.

1. https://admob.google.com 에서 앱 등록 → 배너·보상형·전면 광고 단위 각 1개씩 생성
2. `src/services/ads.ts` 상단의 `TEST_BANNER_ID` / `TEST_REWARDED_ID` / `TEST_INTERSTITIAL_ID`를
   실제 ID로 교체
3. `android/app/src/main/AndroidManifest.xml`의 `<application>` 안에 추가:
   ```xml
   <meta-data
       android:name="com.google.android.gms.ads.APPLICATION_ID"
       android:value="실제_AdMob_앱_ID"/>
   ```
4. 각 `showBanner` / `prepareRewardVideoAd` / `prepareInterstitial` 호출에 있는 `isTesting: true`를
   **출시 빌드에서는 반드시 지우세요.** 테스트 ID+isTesting 조합은 실제 배포에서도 항상 테스트
   광고만 보여주는 안전장치인데, 실 서비스에서는 꺼야 진짜 광고가 나갑니다.
5. **EEA/영국 사용자 대상 정식 출시 전에는 동의(UMP) 흐름을 반드시 추가하세요.**
   `AdMob.requestConsentInfo()` → 필요 시 `AdMob.showConsentForm()` — 이게 없으면 Play 정책 위반입니다.
   (`initAds()` 안에 자리만 잡아뒀고 실제 호출은 비어 있음 — 플러그인 README의 "UMP" 예제 참고)
6. **출시 직전까지는 테스트 ID로 개발하고, 스토어에 올리는 빌드에서만 실제 ID로 바꾸세요.**
   실제 ID로 자기 광고를 계속 클릭/시청하면 계정이 정지될 수 있습니다.

## 4. 인앱결제(IAP) 연동

`src/services/iap.ts`는 뼈대만 있습니다. 실제 결제를 붙이려면:

1. Play Console에서 이 앱을 최소 1번 "비공개 테스트" 트랙에 업로드 (인앱상품은 앱이 한 번 올라가야 등록 가능)
2. 수익 창출 → 인앱 상품에서 `gems_small_100`, `gems_large_600`, `remove_ads` 상품 생성
   (파일에 있는 `PRODUCTS` 값과 정확히 같은 ID로)
3. Billing 플러그인 선택해서 설치 (예: `cordova-plugin-purchase`를 Capacitor로 래핑하거나,
   커뮤니티의 Capacitor Billing 플러그인 중 최신 유지보수되는 것을 확인해서 설치 — 이 생태계는
   변화가 잦아서 이 문서에 특정 플러그인을 못박지 않았습니다)
4. `iap.ts`의 `initBilling` / `purchase` / `restorePurchases` 내부만 실제 API 호출로 교체
   (바깥 컴포넌트/스토어는 이 3개 함수만 호출하므로 다른 코드는 안 건드려도 됨)
5. **"구매 복원" 버튼은 필수입니다** — Google 정책상 non-consumable(광고 제거 등)은
   기기 변경/재설치 시 복원 수단을 반드시 제공해야 심사를 통과합니다. 지금은 자리만
   잡혀 있고 실제 구현은 비어 있으니 꼭 채워주세요.

## 5. 앱 아이콘 / 스플래시

지금은 기본 Capacitor 아이콘 그대로입니다. 아이콘 이미지(1024x1024 등)를 준비한 뒤:

```bash
npm install -D @capacitor/assets
npx capacitor-assets generate
```

## 6. Play 스토어 제출 체크리스트

- [ ] 패키지명(`capacitor.config.ts`의 `appId`) 확정 — **출시 후 변경 불가**
- [ ] 개인정보처리방침 URL (광고/분석 SDK를 쓰므로 필수) — 무료 생성기로도 충분, 실제 수집 항목 반영
- [ ] 콘텐츠 등급 설문 작성
- [ ] 스토어 등록정보: 스크린샷 최소 2장, 짧은 설명/자세한 설명, 앱 아이콘
- [ ] 대상 API 레벨 — Play가 요구하는 최신 `targetSdkVersion` 확인 (Capacitor 최신 버전 쓰면 보통 충족)
- [ ] 서명된 AAB 빌드 (`android/` → Android Studio에서 Generate Signed Bundle)
- [ ] 비공개 테스트 → (선택) 비공개 출시 검토 → 프로덕션 순서로 단계적 출시 추천

## 7. 지금 이 코드가 "MVP"인 이유 — 다음 작업 우선순위

1. ~~젬 소비처가 없음~~ → 젬 상점("즉시 손님 채우기" 20💎, "30분 수익 3배" 50💎) 추가로 해결됨.
   다만 두 개뿐이라 반복 플레이 시 금방 질릴 수 있음 — 스킨/가챠 등 추가 여지 있음.
2. **프레스티지(리셋 후 영구 보너스) 없음.** 지점을 여러 개 다 깬 유저의 다음 목표가 없어서
   장기 리텐션이 약합니다.
3. **튜토리얼/온보딩 없음.** 첫 실행 화면에 "직원을 먼저 고용해보세요" 같은 유도가 필요합니다.
4. **비주얼 에셋이 이모지 수준.** 실제 일러스트/픽셀아트로 바꾸면 체감 품질이 크게 오릅니다.

## 8. 광고 노출 지점 정리 (v3)

- **배너**: 앱 실행 중 항상 하단에 표시 (`showBanner`) — UI가 안 가리도록 `App.tsx`에서
  네이티브일 때만 하단 여백을 확보해뒀습니다.
- **보상형**: "광고 보고 10분 수익 2배" 버튼 — 사용자가 직접 눌러야만 노출 (강제 노출 없음).
- **전면광고**: 새 지점을 열 때 (`showInterstitialIfReady`) — 화면 전환 타이밍이라 이탈감이
  적은 지점입니다. 마지막 노출로부터 60초 안 지났으면 자동으로 건너뜁니다(스팸 방지, `ads.ts`
  상단의 `INTERSTITIAL_MIN_GAP_MS`로 조절 가능).

`src/store/gameStore.ts`가 게임 로직의 전부이고 나머지는 화면 표시용이라,
새 시설이나 젬 소비처를 추가할 때 이 파일 위주로 건드리면 됩니다.
