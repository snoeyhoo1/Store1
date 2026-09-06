interface Props {
  className?: string;
}

export default function ChairIcon({ className = '' }: Props) {
  return (
    <svg viewBox="0 0 40 40" className={`chair-icon ${className}`} aria-hidden="true">
      <rect x="12" y="18" width="16" height="4" rx="2" fill="currentColor" />
      <rect x="12" y="22" width="3" height="12" rx="1.5" fill="currentColor" />
      <rect x="25" y="22" width="3" height="12" rx="1.5" fill="currentColor" />
      <rect x="13" y="8" width="14" height="10" rx="3" fill="currentColor" />
    </svg>
  );
}
