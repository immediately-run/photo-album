import type { Store } from '../lib/store';
import type { PhotoMeta } from '../lib/types';
import PhotoTile from './PhotoTile';

interface Props {
  store: Store;
  albumId: string;
  photos: PhotoMeta[];
  coverId: string | null;
  me: string;
  showBy: boolean;
  onOpen: (index: number) => void;
}

function PhotoGrid({ store, albumId, photos, coverId, me, showBy, onOpen }: Props) {
  return (
    <div className="photo-grid">
      {photos.map((p, i) => (
        <PhotoTile
          key={p.id}
          store={store}
          albumId={albumId}
          photo={p}
          me={me}
          showBy={showBy}
          isCover={p.id === coverId}
          onOpen={() => onOpen(i)}
        />
      ))}
    </div>
  );
}

export default PhotoGrid;
