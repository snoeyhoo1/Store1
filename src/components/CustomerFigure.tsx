interface Props {
  variant?: number; // 0~3, 색만 다른 캐릭터 배리에이션
  className?: string;
}

const SKIN_TONES = ['#e8b98a', '#c98a5a', '#f0c9a0', '#a86b45'];
const OUTFIT_COLORS = ['#7a9b76', '#c9573d', '#4a6fa5', '#c98a3d'];

export default function CustomerFigure({ variant = 0, className = '' }: Props) {
  const skin = SKIN_TONES[variant % SKIN_TONES.length];
  const outfit = OUTFIT_COLORS[variant % OUTFIT_COLORS.length];

  return (
    <svg viewBox="0 0 40 40" className={`customer-figure ${className}`} aria-hidden="true">
      {/* 몸통 */}
      <ellipse cx="20" cy="30" rx="10" ry="8" fill={outfit} />
      {/* 머리 */}
      <circle cx="20" cy="15" r="8" fill={skin} />
      {/* 머리카락 */}
      <path d="M12 13 A8 8 0 0 1 28 13 L28 10 A8 6 0 0 0 12 10 Z" fill="#3a281b" />
    </svg>
  );
}
