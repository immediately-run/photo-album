import { thumbPath } from '../lib/albums';
import { formatDate, pluralize, who } from '../lib/format';
import type { Store } from '../lib/store';
import type { AlbumSummary } from '../lib/types';
import Icon from './Icon';
import Photo from './Photo';

interface Props {
  store: Store;
  album: AlbumSummary;
  me: string;
  showBy: boolean;
  onOpen: () => void;
}

function AlbumCard({ store, album, me, showBy, onOpen }: Props) {
  const cover = album.coverPhoto;
  return (
    <button type="button" className="album-card" onClick={onOpen}>
      <div className="album-cover">
        {cover ? (
          <Photo
            store={store}
            path={thumbPath(store.root, album.id, cover.id)}
            mime="image/jpeg"
            alt={album.title}
          />
        ) : (
          <div className="album-cover-empty">
            <Icon name="images" size={28} />
          </div>
        )}
      </div>
      <div className="album-body">
        <h3>{album.title}</h3>
        <p className="muted">
          {pluralize(album.count, 'photo')}
          {album.created && ` · ${formatDate(album.created)}`}
          {showBy && ` · by ${who(album.by, me)}`}
        </p>
      </div>
    </button>
  );
}

export default AlbumCard;
