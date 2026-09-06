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

import {
  formatNumber,
} from '../utils/format';

import BranchCard from './BranchCard';
import GemShop from './GemShop';
import MissionBanner from './MissionBanner';
import DecorationShop from './DecorationShop';
import LevelBar from './LevelBar';
import GiftButton from './GiftButton';

const BOOST_DURATION_MS =
  10 * 60 * 1000;

export default function ShopFloor() {
  const branch =
    useGameStore(
      (s) =>
        s.branches[
          s.branches.length - 1
        ]
    );

  const money =
    useGameStore(
      (s) => s.money
    );

  const openNewBranch =
    useGameStore(
      (s) => s.openNewBranch
    );

  const startBoost =
    useGameStore(
      (s) => s.startBoost
    );

  const boostUntil =
    useGameStore(
      (s) => s.boostUntil
    );

  const noAds =
    useGameStore(
      (s) => s.noAds
    );

  const addGems =
    useGameStore(
      (s) => s.addGems
    );

  const setNoAds =
    useGameStore(
      (s) => s.setNoAds
    );

  const [busy, setBusy] =
    useState(false);

  const [restoreMsg, setRestoreMsg] =
    useState<string | null>(
      null
    );

  if (!branch) {
    return null;
  }

  const stage =
    Number(
      branch.id.split('-')[1]
    );

  const isFinalChapter =
    stage >= 6;

  const nextCost =
    isFinalChapter
      ? 0
      : chapterRequirement(stage);

  const progress =
    isFinalChapter
      ? 1
      : Math.min(
          money / nextCost,
          1
        );

  const remaining =
    Math.max(
      nextCost - money,
      0
    );

  const boosting =
    Date.now() <
    boostUntil;

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
      isFinalChapter
    ) {
      return;
    }

    setBusy(true);

    const ok =
      openNewBranch();

    if (ok) {
      await showInterstitialIfReady();
    }

    setBusy(false);
  }

  async function handleBuyGems() {
    if (busy) return;

    setBusy(true);

    const ok =
      await purchase(
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

    const ok =
      await purchase(
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

    if (
      restored.includes(
        PRODUCTS.REMOVE_ADS
      )
    ) {
      setNoAds(true);

      setRestoreMsg(
        '광고 제거가 복원되었어요.'
      );
    } else {
      setRestoreMsg(
        '복원할 구매 내역이 없어요.'
      );
    }

    setBusy(false);

    setTimeout(
      () =>
        setRestoreMsg(null),
      2500
    );
  }

  return (
    <main className="shop-floor">
      {/* ============================================
          Game HUD
      ============================================ */}

      <section className="chapter-hud">
        <div className="chapter-hud__main">
          <div>
            <span className="chapter-hud__eyebrow">
              CHAPTER {stage}
            </span>

            <h1>
              {stageName(stage)}
            </h1>

            <p>
              {stage < 6
                ? '다음 상권을 준비하세요'
                : '최종 상권에 도착했습니다'}
            </p>
          </div>

          <GiftButton />
        </div>

        <LevelBar />
      </section>

      {/* ============================================
          Mission
      ============================================ */}

      <MissionBanner />

      {/* ============================================
          Actual Game Scene
      ============================================ */}

      <section className="active-store">
        <BranchCard
          branch={branch}
        />
      </section>

      {/* ============================================
          Next Chapter
      ============================================ */}

      {!isFinalChapter && (
        <section className="next-chapter">
          <div className="next-chapter__header">
            <div>
              <span>
                NEXT AREA
              </span>

              <h2>
                {stage + 1}장 ·{' '}
                {stageName(
                  stage + 1
                )}
              </h2>
            </div>

            <strong>
              {formatNumber(
                nextCost
              )}
              원
            </strong>
          </div>

          <div className="chapter-progress">
            <div className="chapter-progress__track">
              <div
                className="chapter-progress__fill"
                style={{
                  width: `${
                    progress *
                    100
                  }%`,
                }}
              />
            </div>

            <div className="chapter-progress__labels">
              <span>
                {formatNumber(
                  money
                )}
                원
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
              ? `🚀 ${stage + 1}장으로 진입`
              : `🔒 ${formatNumber(
                  nextCost
                )}원 모으기`}
          </button>

          <div className="next-chapter__note">
            새 가게로 이동하면 현재 가게는
            영업을 종료하고 새로운 가게로
            교체됩니다.
          </div>
        </section>
      )}

      {/* ============================================
          Final Chapter
      ============================================ */}

      {isFinalChapter && (
        <section className="final-chapter">
          <div className="final-chapter__icon">
            🏆
          </div>

          <h2>
            도시 최고의 가게
          </h2>

          <p>
            피자 시티까지 도착했습니다.
            <br />
            이제 이 가게를 최대한 성장시키세요.
          </p>
        </section>
      )}

      {/* ============================================
          Power / Shop
      ============================================ */}

      <GemShop />

      <DecorationShop />

      <section className="action-tray">
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
      </section>
    </main>
  );
}
