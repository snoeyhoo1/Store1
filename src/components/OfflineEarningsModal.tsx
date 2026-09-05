interface Props {
  result: { earned: number; capped: boolean };
  onClose: () => void;
}

export default function OfflineEarningsModal({ result, onClose }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__emoji">🌙</div>
        <h2>다녀가신 동안</h2>
        <p>
          카페가 <strong>{Math.floor(result.earned).toLocaleString()}원</strong>을 벌었어요.
        </p>
        {result.capped && <p className="modal__note">(최대 정산 시간을 초과해 일부만 반영됐어요)</p>}
        <button className="modal__button" onClick={onClose}>
          받기
        </button>
      </div>
    </div>
  );
}
