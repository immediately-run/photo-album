import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { useAlbumPhotos } from '../hooks/useAlbumPhotos';
import { useUploader } from '../hooks/useUploader';
import { albumDir, deleteAlbum, deletePhoto, readAlbum, resolveCover, saveAlbum, savePhotoMeta } from '../lib/albums';
import { formatDate, pluralize, who } from '../lib/format';
import { pollDir, type Store } from '../lib/store';
import type { Album, PhotoMeta } from '../lib/types';
import AlbumForm from './AlbumForm';
import Icon from './Icon';
import Lightbox from './Lightbox';
import PhotoGrid from './PhotoGrid';
import Slideshow from './Slideshow';
import UploadPanel from './UploadPanel';

interface Props {
  store: Store;
  albumId: string;
  readOnly: boolean;
  live: boolean;
  me: string;
  by: string;
  showBy: boolean;
  onBack: () => void;
}

function AlbumView({ store, albumId, readOnly, live, me, by, showBy, onBack }: Props) {
  const root = store.root;
  const [album, setAlbum] = useState<Album | null | undefined>(undefined);
  const [gen, bump] = useReducer((n: number) => n + 1, 0);
  const { photos, refresh } = useAlbumPhotos(root, albumId, live);
  const uploader = useUploader(root, albumId, by, refresh);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [slideshow, setSlideshow] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    readAlbum(root, albumId).then(
      (a) => {
        if (!cancelled) setAlbum(a);
      },
      () => {
        if (!cancelled) setAlbum(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [root, albumId, gen]);

  useEffect(() => {
    if (!live) return;
    return pollDir(albumDir(root, albumId), bump, 4000);
  }, [live, root, albumId]);

  const fail = (what: string) => (e: unknown) =>
    setError(`${what}: ${(e as { message?: string } | null)?.message ?? String(e)}`);

  const pick = () => fileInput.current?.click();
  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length) void uploader.add(files);
  };
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes('Files');
  const onDragOver = (e: DragEvent) => {
    if (readOnly || !hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!dragOver) setDragOver(true);
  };
  const onDragLeave = (e: DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragOver(false);
  };
  const onDrop = (e: DragEvent) => {
    if (readOnly) return;
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) void uploader.add(files);
  };

  const list = photos ?? [];
  const coverId = album ? (resolveCover(album, list)?.id ?? null) : null;

  const setCaption = useCallback(
    async (photo: PhotoMeta, caption: string) => {
      try {
        await savePhotoMeta(root, albumId, { ...photo, caption });
        refresh();
      } catch (e) {
        fail('Could not save the caption')(e);
      }
    },
    [root, albumId, refresh],
  );
  const removePhoto = useCallback(
    async (photo: PhotoMeta) => {
      try {
        await deletePhoto(root, albumId, photo);
        setLightbox((i) => {
          if (i === null) return null;
          const remaining = list.length - 1;
          return remaining <= 0 ? null : Math.min(i, remaining - 1);
        });
        refresh();
      } catch (e) {
        fail('Could not delete the photo')(e);
      }
    },
    [root, albumId, list.length, refresh],
  );
  const setCover = useCallback(
    async (photo: PhotoMeta) => {
      if (!album) return;
      try {
        await saveAlbum(root, { ...album, cover: photo.id });
        bump();
      } catch (e) {
        fail('Could not set the cover')(e);
      }
    },
    [root, album],
  );
  const saveDetails = async (v: { title: string; description: string }) => {
    if (!album) return;
    try {
      await saveAlbum(root, { ...album, ...v });
      setEditing(false);
      bump();
    } catch (e) {
      fail('Could not save the album')(e);
    }
  };
  const removeAlbum = async () => {
    try {
      await deleteAlbum(root, albumId);
      onBack();
    } catch (e) {
      fail('Could not delete the album')(e);
    }
  };

  if (album === undefined) return <p className="muted wrap">Loading album…</p>;
  if (album === null)
    return (
      <section className="wrap">
        <p className="error">This album is gone — someone may have deleted it.</p>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          <Icon name="back" size={16} /> All albums
        </button>
      </section>
    );

  return (
    <section
      className={`album-view ${dragOver ? 'drag-over' : ''}`}
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <nav className="crumbs">
        <button type="button" className="link" onClick={onBack}>
          <Icon name="back" size={16} /> All albums
        </button>
      </nav>

      {editing ? (
        <div className="card">
          <AlbumForm
            initial={{ title: album.title, description: album.description }}
            submitLabel="Save"
            onSubmit={saveDetails}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <div className="section-head">
          <div>
            <h2>{album.title}</h2>
            {album.description && <p className="lede">{album.description}</p>}
            <p className="muted small">
              {pluralize(list.length, 'photo')}
              {album.created && ` · created ${formatDate(album.created)}`}
              {showBy && ` by ${who(album.by, me)}`}
            </p>
          </div>
          <div className="actions">
            {list.length > 0 && (
              <button type="button" className="btn btn-ghost" onClick={() => setSlideshow(0)}>
                <Icon name="play" size={16} /> <span className="hide-sm">Slideshow</span>
              </button>
            )}
            {!readOnly && (
              <>
                <button type="button" className="icon-btn" onClick={() => setEditing(true)} aria-label="Edit album details" title="Edit album">
                  <Icon name="edit" />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setConfirmDelete((c) => !c)}
                  aria-label="Delete album"
                  title="Delete album"
                >
                  <Icon name="trash" />
                </button>
                <button type="button" className="btn btn-primary" onClick={pick} disabled={uploader.active}>
                  <Icon name="upload" size={16} /> Add photos
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="card confirm">
          <span>
            Delete “{album.title}” and its {pluralize(list.length, 'photo')}? This cannot be undone.
          </span>
          <button type="button" className="btn btn-danger" onClick={removeAlbum}>
            Delete album
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>
            Keep
          </button>
        </div>
      )}
      {error && (
        <p className="error">
          {error}{' '}
          <button type="button" className="link" onClick={() => setError(null)}>
            dismiss
          </button>
        </p>
      )}

      <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={onFiles} />

      {photos === null ? (
        <p className="muted">Loading photos…</p>
      ) : list.length === 0 ? (
        <div className={`empty dropzone ${readOnly ? '' : 'clickable'}`} onClick={readOnly ? undefined : pick}>
          <Icon name="upload" size={40} />
          <h3>{readOnly ? 'No photos here yet.' : 'Add photos.'}</h3>
          <p className="muted">
            {readOnly
              ? 'Whoever shared this space has not added anything yet.'
              : 'Drop pictures here or tap to choose. They are resized to 1600px before they are stored, so albums stay small.'}
          </p>
          {!readOnly && (
            <span className="btn btn-primary">
              <Icon name="upload" size={16} /> Choose photos
            </span>
          )}
        </div>
      ) : (
        <PhotoGrid
          store={store}
          albumId={albumId}
          photos={list}
          coverId={coverId}
          me={me}
          showBy={showBy}
          onOpen={setLightbox}
        />
      )}

      {dragOver && (
        <div className="drop-overlay" aria-hidden="true">
          <Icon name="upload" size={48} />
          <span>Drop to add to “{album.title}”</span>
        </div>
      )}

      <UploadPanel items={uploader.items} onClear={uploader.clear} />

      {lightbox !== null && list[lightbox] && (
        <Lightbox
          store={store}
          albumId={albumId}
          photos={list}
          index={lightbox}
          coverId={coverId}
          readOnly={readOnly}
          me={me}
          showBy={showBy}
          onClose={() => setLightbox(null)}
          onNavigate={setLightbox}
          onCaption={setCaption}
          onDelete={removePhoto}
          onSetCover={setCover}
          onSlideshow={() => {
            setSlideshow(lightbox);
            setLightbox(null);
          }}
        />
      )}
      {slideshow !== null && list.length > 0 && (
        <Slideshow store={store} albumId={albumId} photos={list} startIndex={Math.min(slideshow, list.length - 1)} onClose={() => setSlideshow(null)} />
      )}
    </section>
  );
}

export default AlbumView;
