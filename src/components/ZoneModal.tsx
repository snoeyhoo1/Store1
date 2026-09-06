import { ReactNode } from 'react';

export default function ZoneModal({
  title,
  icon,
  onClose,
  children,
}: {
  title: string;
  icon: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--zone" onClick={(e) => e.stopPropagation()}>
        <div className="modal__emoji">{icon}</div>
        <h2>{title}</h2>
        <div className="modal--zone__body">{children}</div>
        <button className="modal__button" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
