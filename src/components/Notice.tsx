import Icon from './Icon';

interface Props {
  text: string | null;
  onDismiss: () => void;
}

function Notice({ text, onDismiss }: Props) {
  if (!text) return null;
  return (
    <div className="notice" role="status">
      <span>{text}</span>
      <button type="button" className="icon-btn" onClick={onDismiss} aria-label="Dismiss">
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}

export default Notice;
