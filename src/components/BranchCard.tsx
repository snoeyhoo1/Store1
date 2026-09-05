import { useEffect, useRef, useState } from 'react';
import { Branch, branchOrdinal, useGameStore } from '../store/gameStore';
import { formatBranchMoney } from '../utils/format';

function UpgradeButton({
  label,
  sub,
  cost,
  money,
  ordinal,
  onClick,
}: {
  label: string;
  sub: string;
  cost: number;
  money: number;
  ordinal: number;
  onClick: () => void;
}) {
  const canAfford = money >= cost;
  return (
    <button className={`upgrade-btn ${canAfford ? 'is-affordable' : ''}`} onClick={onClick} disabled={!canAfford}>
      <span className="upgrade-btn__label">{label}</span>
      <span className="upgrade-btn__sub">{sub}</span>
      <span className="upgrade-btn__cost">{formatBranchMoney(cost, ordinal)}</span>
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
  const prevServedRef = useRef(branch.totalServed);

  const ordinal = branchOrdinal(branch);
  const profitPerCustomer = Math.round(price * (1 - costRatio));

  // 손님이 새로 응대 완료될 때마다 "+수익" 텍스트를 잠깐 띄운다
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

  const seats = Array.from({ length: branch.tables }, (_, i) => i < branch.queueCount);

  return (
    <section className={`branch-card ${expanded ? '' : 'branch-card--collapsed'}`}>
      <button className="branch-card__header" onClick={() => setExpanded((e) => !e)}>
        <h3>{branch.name}</h3>
        <div className="branch-card__header-right">
          {!expanded && (
            <span className="branch-card__mini-rate">
              {formatBranchMoney(Math.min(arrivalRate, branch.staffCount / 12) * profitPerCustomer, ordinal)}/초
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
                <span key={i} className={`seat ${occupied ? 'seat--occupied' : ''}`}>
                  {occupied ? '🧑' : '🪑'}
                </span>
              ))}
            </div>
            {floats.map((f) => (
              <span key={f.id} className="float-text">
                +{formatBranchMoney(f.amount, ordinal)}
              </span>
            ))}
          </div>

          <div className="branch-stats">
            <span>객단가 {formatBranchMoney(price, ordinal)}</span>
            <span>마진 {formatBranchMoney(profitPerCustomer, ordinal)}/명</span>
            <span>시간당 방문 ~{Math.round(arrivalRate * 3600)}명</span>
            <span>서빙 {branch.staffCount}명</span>
          </div>

          <div className="upgrade-grid">
            <UpgradeButton label="좌석 추가" sub={`현재 ${branch.tables}석`} cost={upgradeTablesCost} money={money} ordinal={ordinal} onClick={() => upgradeTables(branch.id)} />
            <UpgradeButton label="직원 고용" sub={`현재 ${branch.staffCount}명`} cost={hireStaffCost} money={money} ordinal={ordinal} onClick={() => hireStaff(branch.id)} />
            <UpgradeButton label="메뉴 개발" sub={`+500원`} cost={upgradeMenuCost} money={money} ordinal={ordinal} onClick={() => upgradeMenu(branch.id)} />
            <UpgradeButton label="마케팅" sub={`유입 증가`} cost={upgradeMarketingCost} money={money} ordinal={ordinal} onClick={() => upgradeMarketing(branch.id)} />
            <UpgradeButton label="원가절감" sub={`마진 개선`} cost={upgradeCostSavingCost} money={money} ordinal={ordinal} onClick={() => upgradeCostSaving(branch.id)} />
          </div>
        </>
      )}
    </section>
  );
}
