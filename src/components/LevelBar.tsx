import { useGameStore } from '../store/gameStore';

export default function LevelBar() {
  const { level, xpIntoLevel, xpForNextLevel } = useGameStore((s) => s.playerLevel());
  const pct = (xpIntoLevel / xpForNextLevel) * 100;

  return (
    <div className="level-bar">
      <span className="level-bar__badge">⭐ {level}</span>
      <div className="level-bar__track">
        <div className="level-bar__fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="level-bar__xp">
        {xpIntoLevel}/{xpForNextLevel}
      </span>
    </div>
  );
}
