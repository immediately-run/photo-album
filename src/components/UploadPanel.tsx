import type { UploadItem } from '../hooks/useUploader';
import Icon from './Icon';

interface Props {
  items: UploadItem[];
  onClear: () => void;
}

function UploadPanel({ items, onClear }: Props) {
  if (items.length === 0) return null;
  const done = items.filter((it) => it.status === 'done').length;
  const failed = items.filter((it) => it.status === 'error').length;
  const busy = items.some((it) => it.status === 'working' || it.status === 'queued');
  return (
    <aside className="upload-panel" aria-live="polite">
      <header>
        <strong>
          {busy ? `Adding photos… ${done} of ${items.length - failed}` : `Added ${done} photo${done === 1 ? '' : 's'}`}
          {failed > 0 && `, ${failed} failed`}
        </strong>
        {!busy && (
          <button type="button" className="icon-btn" onClick={onClear} aria-label="Dismiss">
            <Icon name="close" size={16} />
          </button>
        )}
      </header>
      <ul>
        {items.map((it) => (
          <li key={it.key} className={`up-${it.status}`}>
            <span className="up-name">{it.name}</span>
            <span className="up-stage">{it.stage}</span>
            <span className="up-bar">
              <span style={{ width: `${Math.round(it.progress * 100)}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default UploadPanel;
