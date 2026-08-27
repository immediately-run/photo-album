import { useImageUrl } from '../hooks/useImageUrl';
import type { Store } from '../lib/store';
import Icon from './Icon';

interface Props {
  store: Store;
  /** Absolute path inside the store. */
  path: string | null;
  mime?: string;
  alt: string;
  className?: string;
  draggable?: boolean;
}

/** An image read from the store's filesystem (object URL under the hood). */
function Photo({ store, path, mime, alt, className, draggable = false }: Props) {
  const { url, loading, error } = useImageUrl(store, path, mime);
  if (url) return <img className={className} src={url} alt={alt} draggable={draggable} />;
  return (
    <div className={`photo-ph ${className ?? ''} ${loading ? 'is-loading' : ''}`} role="img" aria-label={alt}>
      {!loading && <Icon name={error ? 'close' : 'image'} size={22} />}
    </div>
  );
}

export default Photo;
