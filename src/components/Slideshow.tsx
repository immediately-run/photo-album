import { useEffect, useState } from 'react';
import { photoPath } from '../lib/albums';
import { mimeFor } from '../lib/image';
import type { Store } from '../lib/store';
import type { PhotoMeta } from '../lib/types';
import Icon from './Icon';
import Photo from './Photo';

interface Props {
  store: Store;
  albumId: string;
  photos: PhotoMeta[];
  startIndex: number;
  onClose: () => void;
}

const INTERVAL_MS = 4000;

function Slideshow({ store, albumId, photos, startIndex, onClose }: Props) {
  const [index, setIndex] = useState(startIndex);
  const [playing, setPlaying] = useState(true);
  const n = photos.length;

  useEffect(() => {
    if (!playing || n < 2) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % n), INTERVAL_MS);
    return () => clearTimeout(t);
  }, [playing, index, n]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === ' ') {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % n);
      else if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + n) % n);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [n, onClose]);

  const photo = photos[index];
  if (!photo) return null;
  const next = photos[(index + 1) % n];

  return (
    <div className="slideshow" role="dialog" aria-modal="true" aria-label="Slideshow">
      <div className="ss-stage" onClick={() => setPlaying((p) => !p)}>
        <Photo
          key={photo.id}
          store={store}
          path={photoPath(store.root, albumId, photo)}
          mime={mimeFor(photo.ext)}
          alt={photo.caption || photo.name}
          className="ss-img"
        />
        {/* Warm the next image so the advance is instant. */}
        {n > 1 && (
          <div className="ss-preload" aria-hidden="true">
            <Photo store={store} path={photoPath(store.root, albumId, next)} mime={mimeFor(next.ext)} alt="" />
          </div>
        )}
      </div>
      <div className="ss-bar">
        <span key={index} className={`ss-progress ${playing ? 'run' : ''}`} style={{ animationDuration: `${INTERVAL_MS}ms` }} />
      </div>
      <div className="ss-bottom">
        <p className="ss-caption">{photo.caption}</p>
        <div className="ss-controls">
          <button type="button" className="icon-btn" onClick={() => setIndex((i) => (i - 1 + n) % n)} aria-label="Previous">
            <Icon name="left" />
          </button>
          <button type="button" className="icon-btn" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'}>
            <Icon name={playing ? 'pause' : 'play'} />
          </button>
          <button type="button" className="icon-btn" onClick={() => setIndex((i) => (i + 1) % n)} aria-label="Next">
            <Icon name="right" />
          </button>
          <span className="mono small">
            {index + 1} / {n}
          </span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Exit slideshow">
            <Icon name="close" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Slideshow;
