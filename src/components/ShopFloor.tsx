import { useState } from 'react';

import {
  chapterRequirement,
  stageName,
  useGameStore,
} from '../store/gameStore';

import {
  showRewardedAd,
  showInterstitialIfReady,
} from '../services/ads';

import {
  purchase,
  restorePurchases,
  PRODUCTS,
} from '../services/iap';

import { formatNumber } from '../utils/format';

import BranchCard from './BranchCard';
import GemShop from './GemShop';
import MissionBanner from './MissionBanner';
import DecorationShop from './DecorationShop';
import LevelBar from './LevelBar';
import GiftButton from './GiftButton';

const BOOST_DURATION_MS = 10 * 60 * 1000;

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

export default function ShopFloor() {
  const branch = useGameStore(
    (s) => s.branches[s.branches.length - 1]
  );

  const money = useGameStore((s) => s.money);

  const openNewBranch = useGameStore(
    (s) => s.openNewBranch
  );

  const startBoost = useGameStore(
    (s) => s.startBoost
  );

  const boostUntil = useGameStore(
    (s) => s.boostUntil
  );

  const noAds = useGameStore(
    (s) => s.noAds
  );

  const addGems = useGameStore(
    (s) => s.addGems
  );

  const setNoAds = useGameStore(
    (s) => s.setNoAds
  );

  const [busy, setBusy] = useState(false);

  const [restoreMsg, setRestoreMsg] =
    useState<string | null>(null);

  if (!branch) return null;

  const stage = Number(
    branch.id.split('-')[1] ?? 1
  );

  const isFinalChapter = stage >= 6;

  const nextCost = isFinalChapter
    ? 0
    : chapterRequirement(stage);

  const progress = isFinalChapter
    ? 1
    : Math.min(
        money / Math.max(nextCost, 1),
        1
      );

  const remaining = Math.max(
    nextCost - money,
    0
  );

  const boosting =
    Date.now() < boostUntil;

  async function handleWatchAd() {
    if (busy) return;

    setBusy(true);

    const rewarded =
      await showRewardedAd();

    if (rewarded) {
      startBoost(
        BOOST_DURATION_MS
      );
    }

    setBusy(false);
  }

  async function handleOpenBranch() {
    if (
      busy ||
      isFinalChapter ||
      progress < 1
    ) {
      return;
    }

    setBusy(true);

    const ok = openNewBranch();

    if (ok) {
      await showInterstitialIfReady();

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }

    setBusy(false);
  }

  async function handleBuyGems() {
    if (busy) return;

    setBusy(true);

    const ok = await purchase(
      PRODUCTS.GEMS_SMALL
    );

    if (ok) {
      addGems(100);
    }

    setBusy(false);
  }

  async function handleRemoveAds() {
    if (busy) return;

    setBusy(true);

    const ok = await purchase(
      PRODUCTS.REMOVE_ADS
    );

    if (ok) {
      setNoAds(true);
    }

    setBusy(false);
  }

  async function handleRestore() {
    if (busy) return;

    setBusy(true);

    const restored =
      await restorePurchases();

    setRestoreMsg(
      restored.includes(
        PRODUCTS.REMOVE_ADS
      )
        ? '광고 제거가 복원되었어요.'
        : '복원할 구매 내역이 없어요.'
    );

    if (
      restored.includes(
        PRODUCTS.REMOVE_ADS
      )
    ) {
      setNoAds(true);
    }

    setBusy(false);

    window.setTimeout(
      () => setRestoreMsg(null),
      2500
    );
  }

  return (
    <main className="shop-floor">
      <section
        className="chapter-hud game-panel"
        id="home"
      >
        <div className="chapter-hud__main">
          <div>
            <span className="chapter-hud__eyebrow">
              AREA {stage}
            </span>

            <h1>
              {stageName(stage)}
            </h1>

            <p>
              {stage < 6
                ? '가게를 키워 다음 상권으로 진출하세요.'
                : '도시 최고의 가게를 완성하세요.'}
            </p>
          </div>

          <GiftButton />
        </div>

        <LevelBar />
      </section>

      <section
        className="mission-strip"
        id="missions"
      >
        <MissionBanner />
      </section>

      <section
        className="active-store"
        id="store"
      >
        <BranchCard branch={branch} />
      </section>

      <section
        className="next-chapter game-panel"
        id="chapter"
      >
        <div className="next-chapter__header">
          <div>
            <span>
              NEXT AREA
            </span>

            <h2>
              {isFinalChapter
                ? '🏆 최종 상권'
                : `${stage + 1}장 · ${stageName(
                    stage + 1
                  )}`}
            </h2>
          </div>

          {!isFinalChapter && (
            <strong>
              {formatNumber(nextCost)}원
            </strong>
          )}
        </div>

        {!isFinalChapter ? (
          <>
            <div className="chapter-progress">
              <div className="chapter-progress__track">
                <div
                  className="chapter-progress__fill"
                  style={{
                    width: `${progress * 100}%`,
                  }}
                />
              </div>

              <div className="chapter-progress__labels">
                <span>
                  {formatNumber(money)}원
                </span>

                <span>
                  {Math.round(
                    progress * 100
                  )}
                  %
                </span>
              </div>
            </div>

            {remaining > 0 ? (
              <p className="next-chapter__remaining">
                다음 가게까지{' '}
                <b>
                  {formatNumber(
                    remaining
                  )}
                  원
                </b>{' '}
                더 필요합니다.
              </p>
            ) : (
              <p className="next-chapter__ready">
                ✨ 새로운 상권을 열 수 있습니다!
              </p>
            )}

            <button
              className={`next-chapter__button ${
                progress >= 1
                  ? 'is-ready'
                  : ''
              }`}
              disabled={
                progress < 1 ||
                busy
              }
              onClick={
                handleOpenBranch
              }
            >
              {progress >= 1
                ? `🚀 ${
                    stage + 1
                  }장으로 진입`
                : `🔒 ${formatNumber(
                    nextCost
                  )}원 모으기`}
            </button>

            <div className="next-chapter__note">
              다음 가게로 이동하면 이전 가게는 사라지고
              새로운 매장으로 교체됩니다.
              <br />
              <b>
                새 상권은 이전 상권보다 훨씬 큰 금액 단위로 시작합니다.
              </b>
            </div>
          </>
        ) : (
          <div className="final-chapter">
            <div className="final-chapter__icon">
              🏆
            </div>

            <h2>
              피자 시티 정복 완료
            </h2>

            <p>
              최종 상권을 최고 레벨까지 성장시켜 보세요.
            </p>
          </div>
        )}
      </section>

      <section
        className="power-section"
        id="shop"
      >
        <GemShop />

        <DecorationShop />

        <div className="action-tray">
          <button
            className={`boost-button ${
              boosting
                ? 'is-active'
                : ''
            }`}
            onClick={
              handleWatchAd
            }
            disabled={busy}
          >
            {boosting
              ? '⚡ 수익 2배 진행 중'
              : '📺 광고 보고 10분 수익 2배'}
          </button>

          <div className="iap-row">
            <button
              className="iap-button"
              onClick={
                handleBuyGems
              }
              disabled={busy}
            >
              💎 젬 100개 구매
            </button>

            {!noAds && (
              <button
                className="iap-button"
                onClick={
                  handleRemoveAds
                }
                disabled={busy}
              >
                🚫 광고 제거
              </button>
            )}
          </div>

          <button
            className="restore-link"
            onClick={
              handleRestore
            }
            disabled={busy}
          >
            구매 복원
          </button>

          {restoreMsg && (
            <p className="restore-msg">
              {restoreMsg}
            </p>
          )}
        </div>
      </section>

      <section className="game-tip">
        <span>💡</span>

        <div>
          <strong>
            운영 팁
          </strong>

          <p>
            직원은 처리 속도를 올리고,
            좌석은 수용량을 늘립니다.
            메뉴·마케팅·원가 업그레이드를 조합해
            수익을 키우세요.
          </p>
        </div>
      </section>

      <nav
        className="game-bottom-nav"
        aria-label="게임 메뉴"
      >
        <button
          onClick={() =>
            scrollToId('store')
          }
        >
          <span>🏪</span>
          <b>가게</b>
        </button>

        <button
          onClick={() =>
            scrollToId('chapter')
          }
        >
          <span>★</span>
          <b>챕터</b>
        </button>

        <button
          className="game-bottom-nav__boost"
          onClick={
            handleWatchAd
          }
          disabled={busy}
        >
          <span>×2</span>
          <b>
            {boosting
              ? '부스트 중'
              : '부스트'}
          </b>
        </button>

        <button
          onClick={() =>
            scrollToId('missions')
          }
        >
          <span>📋</span>
          <b>미션</b>
        </button>

        <button
          onClick={() =>
            scrollToId('shop')
          }
        >
          <span>💎</span>
          <b>상점</b>
        </button>
      </nav>
    </main>
  );
}
