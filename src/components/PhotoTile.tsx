import { thumbPath } from '../lib/albums';
import { who } from '../lib/format';
import type { Store } from '../lib/store';
import type { PhotoMeta } from '../lib/types';
import Photo from './Photo';

interface Props {
  store: Store;
  albumId: string;
  photo: PhotoMeta;
  me: string;
  showBy: boolean;
  isCover: boolean;
  onOpen: () => void;
}

function PhotoTile({ store, albumId, photo, me, showBy, isCover, onOpen }: Props) {
  const wide = photo.width / Math.max(1, photo.height) >= 1.7;
  const label = photo.caption || photo.name;
  return (
    <button
      type="button"
      className={`tile ${wide ? 'wide' : ''}`}
      onClick={onOpen}
      aria-label={`Open ${label}`}
      title={label}
    >
      <Photo store={store} path={thumbPath(store.root, albumId, photo.id)} mime="image/jpeg" alt={label} />
      {isCover && <span className="tile-badge">★</span>}
      {showBy && <span className="tile-by">{who(photo.by, me)}</span>}
    </button>
  );
}

export default PhotoTile;
