import { useEffect, useReducer, useState } from 'react';
import { albumsDir, createAlbum, listAlbums } from '../lib/albums';
import { pollDir, type Store } from '../lib/store';
import type { AlbumSummary } from '../lib/types';
import AlbumCard from './AlbumCard';
import AlbumForm from './AlbumForm';
import Icon from './Icon';

interface Props {
  store: Store;
  readOnly: boolean;
  live: boolean;
  me: string;
  by: string;
  showBy: boolean;
  onOpen: (albumId: string) => void;
}

function AlbumList({ store, readOnly, live, me, by, showBy, onOpen }: Props) {
  const [albums, setAlbums] = useState<AlbumSummary[] | null>(null);
  const [gen, bump] = useReducer((n: number) => n + 1, 0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listAlbums(store.root).then(
      (list) => {
        if (!cancelled) setAlbums(list);
      },
      () => {
        if (!cancelled) setAlbums([]);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [store.root, gen]);

  useEffect(() => {
    if (!live) return;
    return pollDir(albumsDir(store.root), bump, 4000);
  }, [live, store.root]);

  const create = async (v: { title: string; description: string }) => {
    setError(null);
    try {
      const album = await createAlbum(store.root, { ...v, by });
      setCreating(false);
      onOpen(album.id);
    } catch (e) {
      setError(`Could not create the album: ${(e as Error).message ?? e}`);
    }
  };

  const header = (
    <div className="section-head">
      <div>
        <h2>{store.kind === 'space' || (store.kind === 'dev' && store.spaceId) ? store.name ?? 'Shared albums' : 'Your albums'}</h2>
        <p className="muted">
          {readOnly
            ? 'You can look, but not add — this space was shared read-only.'
            : 'Albums are folders of pictures. Drop photos in; they are resized before they are stored.'}
        </p>
      </div>
      {!readOnly && !creating && albums !== null && albums.length > 0 && (
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          <Icon name="plus" size={16} /> New album
        </button>
      )}
    </div>
  );

  return (
    <section className="album-list">
      {header}
      {error && <p className="error">{error}</p>}
      {creating && (
        <div className="card">
          <AlbumForm submitLabel="Create album" onSubmit={create} onCancel={() => setCreating(false)} />
        </div>
      )}
      {albums === null ? (
        <p className="muted">Loading albums…</p>
      ) : albums.length === 0 && !creating ? (
        <div className="empty">
          <Icon name="images" size={40} />
          <h3>No albums yet.</h3>
          {readOnly ? (
            <p className="muted">Nothing has been added to this space so far.</p>
          ) : (
            <>
              <p className="muted">Make an album, then drop in your photos.</p>
              <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
                <Icon name="plus" size={16} /> Create your first album
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="albums">
          {albums.map((a) => (
            <AlbumCard key={a.id} store={store} album={a} me={me} showBy={showBy} onOpen={() => onOpen(a.id)} />
          ))}
        </div>
      )}
    </section>
  );
}

export default AlbumList;
