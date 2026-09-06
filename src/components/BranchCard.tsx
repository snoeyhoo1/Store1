import { useEffect, useRef, useState } from 'react';
import { Branch, useGameStore } from '../store/gameStore';
import { formatNumber } from '../utils/format';
import CustomerFigure from './CustomerFigure';
import ChairIcon from './ChairIcon';
import ZoneModal from './ZoneModal';

type ZoneKey = 'counter' | 'seats' | 'growth' | null;

function UpgradeButton({
  label,
  sub,
  cost,
  money,
  onClick,
}: {
  label: string;
  sub: string;
  cost: number;
  money: number;
  onClick: () => void;
}) {
  const canAfford = money >= cost;
  return (
    <button className={`upgrade-btn ${canAfford ? 'is-affordable' : ''}`} onClick={onClick} disabled={!canAfford}>
      <span className="upgrade-btn__label">{label}</span>
      <span className="upgrade-btn__sub">{sub}</span>
      <span className="upgrade-btn__cost">{formatNumber(cost)}원</span>
    </button>
  );
}

function reputationTone(rep: number): string {
  if (rep >= 70) return 'rep--good';
  if (rep >= 35) return 'rep--mid';
  return 'rep--bad';
}

export default function BranchCard({ branch, defaultExpanded }: { branch: Branch; defaultExpanded: boolean }) {
  const money = useGameStore((s) => s.money);
  const price = useGameStore((s) => s.price(branch));
  const costRatio = useGameStore((s) => s.costRatio(branch));
  const arrivalRate = useGameStore((s) => s.arrivalRatePerSec(branch));
  const businessType = useGameStore((s) => s.businessType(branch));

  const upgradeTablesCost = useGameStore((s) => s.upgradeTablesCost(branch));
  const hireStaffCost = useGameStore((s) => s.hireStaffCost(branch));
  const upgradeMenuCost = useGameStore((s) => s.upgradeMenuCost(branch));
  const upgradeMarketingCost = useGameStore((s) => s.upgradeMarketingCost(branch));
  const upgradeCostSavingCost = useGameStore((s) => s.upgradeCostSavingCost(branch));

  const upgradeTables = useGameStore((s) => s.upgradeTables);
  const hireStaff = useGameStore((s) => s.hireStaff);
  const upgradeMenu = useGameStore((s) => s.upgradeMenu);
  const upgradeMarketing = useGameStore((s) => s.upgradeMarketing);
  const upgradeCostSaving = useGameStore((s) => s.upgradeCostSaving);

  const [expanded, setExpanded] = useState(defaultExpanded);
  const [floats, setFloats] = useState<{ id: number; amount: number }[]>([]);
  const [justArrivedIdx, setJustArrivedIdx] = useState<number | null>(null);
  const [activeZone, setActiveZone] = useState<ZoneKey>(null);
  const prevServedRef = useRef(branch.totalServed);
  const prevQueueRef = useRef(branch.queueCount);

  const profitPerCustomer = Math.round(price * (1 - costRatio));

  useEffect(() => {
    const diff = branch.totalServed - prevServedRef.current;
    prevServedRef.current = branch.totalServed;
    if (diff <= 0) return;
    const id = Date.now() + Math.random();
    setFloats((f) => [...f, { id, amount: diff * profitPerCustomer }]);
    const timer = setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch.totalServed]);

  useEffect(() => {
    if (branch.queueCount > prevQueueRef.current) {
      const idx = branch.queueCount - 1;
      setJustArrivedIdx(idx);
      const timer = setTimeout(() => setJustArrivedIdx((cur) => (cur === idx ? null : cur)), 500);
      prevQueueRef.current = branch.queueCount;
      return () => clearTimeout(timer);
    }
    prevQueueRef.current = branch.queueCount;
  }, [branch.queueCount]);

  const seats = Array.from({ length: branch.tables }, (_, i) => i < branch.queueCount);

  return (
    <section className={`branch-card ${expanded ? '' : 'branch-card--collapsed'}`}>
      <button className="branch-card__header" onClick={() => setExpanded((e) => !e)}>
        <h3>
          {businessType.icon} {branch.name} <span className="branch-card__type">· {businessType.name}</span>
        </h3>
        <div className="branch-card__header-right">
          {!expanded && (
            <span className="branch-card__mini-rate">
              {formatNumber(Math.min(arrivalRate, branch.staffCount / 12) * profitPerCustomer)}원/초
            </span>
          )}
          <span className="branch-card__chevron">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <>
          <div className="reputation-row">
            <span className="reputation-row__label">평판</span>
            <div className="reputation-bar">
              <div className={`reputation-bar__fill ${reputationTone(branch.reputation)}`} style={{ width: `${branch.reputation}%` }} />
            </div>
            <span className="reputation-row__value">{Math.round(branch.reputation)}</span>
          </div>

          <div className="seat-row-wrap">
            <div className="seat-row" aria-label={`좌석 ${branch.queueCount}/${branch.tables}`}>
              {seats.map((occupied, i) => (
                <span key={i} className={`seat ${occupied ? 'seat--occupied' : ''} ${i === justArrivedIdx ? 'seat--pop' : ''}`}>
                  {occupied ? <CustomerFigure variant={i} /> : <ChairIcon />}
                </span>
              ))}
            </div>
            {floats.map((f) => (
              <span key={f.id} className="float-text">
                +{formatNumber(f.amount)}원
              </span>
            ))}
          </div>

          <div className="branch-stats">
            <span>
              {businessType.itemLabel} {formatNumber(price)}원
            </span>
            <span>마진 {formatNumber(profitPerCustomer)}원/명</span>
            <span>시간당 방문 ~{Math.round(arrivalRate * 3600)}명</span>
          </div>

          <div className="zone-row">
            <button className="zone-btn" onClick={() => setActiveZone('counter')}>
              <span className="zone-btn__icon">{businessType.icon}</span>
              <span className="zone-btn__label">카운터</span>
              <span className="zone-btn__sub">직원 {branch.staffCount}명</span>
            </button>
            <button className="zone-btn" onClick={() => setActiveZone('seats')}>
              <span className="zone-btn__icon">🪑</span>
              <span className="zone-btn__label">좌석</span>
              <span className="zone-btn__sub">{branch.tables}석</span>
            </button>
            <button className="zone-btn" onClick={() => setActiveZone('growth')}>
              <span className="zone-btn__icon">📈</span>
              <span className="zone-btn__label">경영</span>
              <span className="zone-btn__sub">마케팅 Lv.{branch.marketingLevel}</span>
            </button>
          </div>
        </>
      )}

      {activeZone === 'counter' && (
        <ZoneModal title={`${businessType.name} 카운터`} icon={businessType.icon} onClose={() => setActiveZone(null)}>
          <UpgradeButton label="직원 고용" sub={`현재 ${branch.staffCount}명`} cost={hireStaffCost} money={money} onClick={() => hireStaff(branch.id)} />
          <UpgradeButton label="메뉴 개발" sub={`+500원`} cost={upgradeMenuCost} money={money} onClick={() => upgradeMenu(branch.id)} />
        </ZoneModal>
      )}
      {activeZone === 'seats' && (
        <ZoneModal title="좌석 관리" icon="🪑" onClose={() => setActiveZone(null)}>
          <UpgradeButton label="좌석 추가" sub={`현재 ${branch.tables}석`} cost={upgradeTablesCost} money={money} onClick={() => upgradeTables(branch.id)} />
        </ZoneModal>
      )}
      {activeZone === 'growth' && (
        <ZoneModal title="경영 전략" icon="📈" onClose={() => setActiveZone(null)}>
          <UpgradeButton label="마케팅" sub="유입 증가" cost={upgradeMarketingCost} money={money} onClick={() => upgradeMarketing(branch.id)} />
          <UpgradeButton label="원가절감" sub="마진 개선" cost={upgradeCostSavingCost} money={money} onClick={() => upgradeCostSaving(branch.id)} />
        </ZoneModal>
      )}
    </section>
  );
}
