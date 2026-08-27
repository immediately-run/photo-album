import { useEffect, useState } from 'react';
import { useImageUrl } from '../hooks/useImageUrl';
import { useSwipe } from '../hooks/useSwipe';
import { photoPath } from '../lib/albums';
import { formatBytes, formatDate, who } from '../lib/format';
import { mimeFor } from '../lib/image';
import type { Store } from '../lib/store';
import type { PhotoMeta } from '../lib/types';
import Icon from './Icon';

interface Props {
  store: Store;
  albumId: string;
  photos: PhotoMeta[];
  index: number;
  coverId: string | null;
  readOnly: boolean;
  me: string;
  showBy: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onCaption: (photo: PhotoMeta, caption: string) => Promise<void>;
  onDelete: (photo: PhotoMeta) => Promise<void>;
  onSetCover: (photo: PhotoMeta) => Promise<void>;
  onSlideshow: () => void;
}

function Lightbox(props: Props) {
  const { store, albumId, photos, index, coverId, readOnly, me, showBy, onClose, onNavigate } = props;
  const photo = photos[index];
  const { url, loading, error } = useImageUrl(
    store,
    photo ? photoPath(store.root, albumId, photo) : null,
    photo ? mimeFor(photo.ext) : undefined,
  );
  const [draft, setDraft] = useState<string | null>(null); // null = not editing
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;
  const go = (i: number) => {
    setDraft(null);
    setConfirm(false);
    onNavigate(Math.max(0, Math.min(photos.length - 1, i)));
  };
  const swipe = useSwipe(
    () => hasNext && go(index + 1),
    () => hasPrev && go(index - 1),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (draft !== null) return; // typing a caption
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && hasNext) go(index + 1);
      else if (e.key === 'ArrowLeft' && hasPrev) go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, index, hasNext, hasPrev, onClose]);

  if (!photo) return null;

  const saveCaption = async () => {
    if (draft === null) return;
    setSaving(true);
    try {
      await props.onCaption(photo, draft.trim());
      setDraft(null);
    } finally {
      setSaving(false);
    }
  };
  const del = async () => {
    setSaving(true);
    try {
      await props.onDelete(photo);
    } finally {
      setSaving(false);
      setConfirm(false);
    }
  };
  const cover = async () => {
    setSaving(true);
    try {
      await props.onSetCover(photo);
    } finally {
      setSaving(false);
    }
  };

  const isCover = photo.id === coverId;
  const label = photo.caption || photo.name;
  const info = [
    formatDate(photo.taken ?? photo.added),
    `${photo.width}×${photo.height}`,
    formatBytes(photo.size),
    showBy ? `added by ${who(photo.by, me)}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={label}>
      <div className="lb-top">
        <span className="lb-count mono">
          {index + 1} / {photos.length}
        </span>
        <div className="lb-actions">
          <button type="button" className="icon-btn" onClick={props.onSlideshow} aria-label="Slideshow" title="Slideshow">
            <Icon name="play" />
          </button>
          {url && (
            <a className="icon-btn" href={url} download={photo.name || `${photo.id}.${photo.ext}`} aria-label="Download" title="Download">
              <Icon name="download" />
            </a>
          )}
          {!readOnly && (
            <>
              <button
                type="button"
                className={`icon-btn ${isCover ? 'on' : ''}`}
                onClick={cover}
                disabled={saving || isCover}
                aria-label={isCover ? 'This is the album cover' : 'Set as album cover'}
                title={isCover ? 'Album cover' : 'Set as cover'}
              >
                <Icon name="star" />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setConfirm((c) => !c)}
                disabled={saving}
                aria-label="Delete photo"
                title="Delete"
              >
                <Icon name="trash" />
              </button>
            </>
          )}
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close" title="Close (Esc)">
            <Icon name="close" />
          </button>
        </div>
      </div>

      <div className="lb-stage" {...swipe}>
        {url ? (
          <img src={url} alt={label} draggable={false} />
        ) : (
          <div className="lb-ph">{loading ? 'Loading…' : error ? 'Could not load this photo.' : ''}</div>
        )}
        {hasPrev && (
          <button type="button" className="lb-arrow left" onClick={() => go(index - 1)} aria-label="Previous">
            <Icon name="left" size={26} />
          </button>
        )}
        {hasNext && (
          <button type="button" className="lb-arrow right" onClick={() => go(index + 1)} aria-label="Next">
            <Icon name="right" size={26} />
          </button>
        )}
      </div>

      <div className="lb-bottom">
        {confirm ? (
          <div className="lb-confirm">
            <span>Delete this photo for everyone?</span>
            <button type="button" className="btn btn-danger" onClick={del} disabled={saving}>
              Delete
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirm(false)}>
              Keep
            </button>
          </div>
        ) : draft !== null ? (
          <form
            className="lb-caption-edit"
            onSubmit={(e) => {
              e.preventDefault();
              void saveCaption();
            }}
          >
            <input
              autoFocus
              value={draft}
              maxLength={300}
              placeholder="Write a caption"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setDraft(null);
              }}
            />
            <button type="submit" className="btn btn-primary" disabled={saving}>
              Save
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setDraft(null)}>
              Cancel
            </button>
          </form>
        ) : (
          <div className="lb-caption">
            <p className={photo.caption ? '' : 'muted'}>
              {photo.caption || (readOnly ? 'No caption' : 'No caption yet')}
              {!readOnly && (
                <button type="button" className="link" onClick={() => setDraft(photo.caption)}>
                  <Icon name="edit" size={14} /> {photo.caption ? 'Edit' : 'Add caption'}
                </button>
              )}
            </p>
            <p className="muted small">{info}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Lightbox;
