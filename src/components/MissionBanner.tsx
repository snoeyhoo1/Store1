import { useGameStore } from '../store/gameStore';

export default function MissionBanner() {
  const mission = useGameStore((s) => s.currentMission());
  const completedCount = useGameStore((s) => s.completedMissionIds.length);

  if (!mission) {
    return (
      <div className="mission-banner mission-banner--done">
        <span>🏆 모든 미션 완료! (총 {completedCount}개)</span>
      </div>
    );
  }

  const pct = (mission.progress / mission.target) * 100;

  return (
    <div className="mission-banner">
      <div className="mission-banner__row">
        <span className="mission-banner__label">📋 {mission.label}</span>
        <span className="mission-banner__reward">💎 {mission.rewardGems}</span>
      </div>
      <div className="mission-banner__track">
        <div className="mission-banner__fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="mission-banner__progress">
        {mission.progress}/{mission.target} · 총 {completedCount}개 완료
      </span>
    </div>
  );
}
