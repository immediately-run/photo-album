// Album + photo persistence over the store's filesystem.
//
// Layout (one file per record — LWW-safe for several members of a space):
//   <root>/albums/<albumId>/album.json
//   <root>/albums/<albumId>/photos/<photoId>.<ext>   the downscaled bytes
//   <root>/albums/<albumId>/thumbs/<photoId>.jpg     320px thumbnail
//   <root>/albums/<albumId>/meta/<photoId>.json      caption, dates, author, size
import fs from 'fs';
import { ensureDir, listFiles, newId, readJson, removeFile, writeJson } from './store';
import type { ProcessedImage } from './image';
import type { Album, AlbumSummary, PhotoMeta } from './types';

const join = (...p: string[]) => p.join('/').replace(/\/+/g, '/');

export const albumsDir = (root: string) => join(root, 'albums');
export const albumDir = (root: string, albumId: string) => join(root, 'albums', albumId);
export const albumJsonPath = (root: string, albumId: string) => join(albumDir(root, albumId), 'album.json');
export const photosDir = (root: string, albumId: string) => join(albumDir(root, albumId), 'photos');
export const thumbsDir = (root: string, albumId: string) => join(albumDir(root, albumId), 'thumbs');
export const metaDir = (root: string, albumId: string) => join(albumDir(root, albumId), 'meta');
export const photoPath = (root: string, albumId: string, p: Pick<PhotoMeta, 'id' | 'ext'>) =>
  join(photosDir(root, albumId), `${p.id}.${p.ext}`);
export const thumbPath = (root: string, albumId: string, photoId: string) =>
  join(thumbsDir(root, albumId), `${photoId}.jpg`);
export const metaPath = (root: string, albumId: string, photoId: string) =>
  join(metaDir(root, albumId), `${photoId}.json`);

const isAlbum = (v: unknown): v is Album =>
  !!v && typeof v === 'object' && typeof (v as Album).id === 'string' && typeof (v as Album).title === 'string';
const isMeta = (v: unknown): v is PhotoMeta =>
  !!v && typeof v === 'object' && typeof (v as PhotoMeta).id === 'string' && typeof (v as PhotoMeta).ext === 'string';

/** Chronological: by the date taken (falling back to when it was added), then id. */
export function sortPhotos(list: PhotoMeta[]): PhotoMeta[] {
  const key = (p: PhotoMeta) => p.taken ?? p.added;
  return [...list].sort((a, b) => key(a).localeCompare(key(b)) || a.id.localeCompare(b.id));
}

export async function listPhotos(root: string, albumId: string): Promise<PhotoMeta[]> {
  const names = await listFiles(metaDir(root, albumId), '.json');
  const metas = await Promise.all(
    names.map((n) => readJson<unknown>(join(metaDir(root, albumId), n), null)),
  );
  return sortPhotos(metas.filter(isMeta));
}

export async function readAlbum(root: string, albumId: string): Promise<Album | null> {
  const a = await readJson<unknown>(albumJsonPath(root, albumId), null);
  return isAlbum(a) ? a : null;
}

export function resolveCover(album: Album, photos: PhotoMeta[]): PhotoMeta | null {
  return photos.find((p) => p.id === album.cover) ?? photos[0] ?? null;
}

export async function summarize(root: string, album: Album): Promise<AlbumSummary> {
  const photos = await listPhotos(root, album.id);
  return { ...album, count: photos.length, coverPhoto: resolveCover(album, photos) };
}

/** Newest album first. Unreadable folders (a member mid-write) are skipped. */
export async function listAlbums(root: string): Promise<AlbumSummary[]> {
  let ids: string[] = [];
  try {
    ids = (await fs.promises.readdir(albumsDir(root))).filter((n) => !n.startsWith('.'));
  } catch {
    return [];
  }
  const albums = (await Promise.all(ids.map((id) => readAlbum(root, id)))).filter(isAlbum);
  const out = await Promise.all(albums.map((a) => summarize(root, a)));
  return out.sort((a, b) => b.created.localeCompare(a.created));
}

export async function createAlbum(
  root: string,
  input: { title: string; description?: string; by: string },
): Promise<Album> {
  const album: Album = {
    id: newId(),
    title: input.title.trim() || 'Untitled album',
    description: (input.description ?? '').trim(),
    cover: null,
    created: new Date().toISOString(),
    by: input.by,
  };
  await ensureDir(photosDir(root, album.id));
  await ensureDir(thumbsDir(root, album.id));
  await ensureDir(metaDir(root, album.id));
  await writeJson(albumJsonPath(root, album.id), album);
  return album;
}

export async function saveAlbum(root: string, album: Album): Promise<void> {
  await writeJson(albumJsonPath(root, album.id), album);
}

async function removeTree(dir: string): Promise<void> {
  try {
    await fs.promises.rm(dir, { recursive: true, force: true });
    return;
  } catch {
    /* backend without recursive rm — walk it */
  }
  let names: string[] = [];
  try {
    names = await fs.promises.readdir(dir);
  } catch {
    return;
  }
  for (const n of names) {
    const p = join(dir, n);
    let isDir = false;
    try {
      isDir = (await fs.promises.stat(p)).isDirectory();
    } catch {
      continue;
    }
    if (isDir) await removeTree(p);
    else await removeFile(p);
  }
  try {
    await fs.promises.rmdir(dir);
  } catch {
    /* already gone */
  }
}

export async function deleteAlbum(root: string, albumId: string): Promise<void> {
  await removeTree(albumDir(root, albumId));
}

export type Progress = (fraction: number, stage: string) => void;

/** Write one photo: bytes, then thumbnail, then the meta record (so a half-written
 *  photo never shows up in listings — the meta file is the commit). */
export async function addPhoto(
  root: string,
  albumId: string,
  img: ProcessedImage,
  info: { name: string; taken: string | null; by: string },
  onProgress: Progress = () => {},
): Promise<PhotoMeta> {
  const meta: PhotoMeta = {
    id: newId(),
    ext: img.ext,
    caption: '',
    taken: info.taken,
    added: new Date().toISOString(),
    by: info.by,
    width: img.width,
    height: img.height,
    size: img.bytes.byteLength,
    name: info.name,
  };
  await ensureDir(photosDir(root, albumId));
  await ensureDir(thumbsDir(root, albumId));
  await ensureDir(metaDir(root, albumId));
  onProgress(0.35, 'Saving image');
  await fs.promises.writeFile(photoPath(root, albumId, meta), img.bytes);
  onProgress(0.75, 'Saving thumbnail');
  await fs.promises.writeFile(thumbPath(root, albumId, meta.id), img.thumb);
  onProgress(0.9, 'Saving details');
  await writeJson(metaPath(root, albumId, meta.id), meta);
  onProgress(1, 'Done');
  return meta;
}

export async function savePhotoMeta(root: string, albumId: string, meta: PhotoMeta): Promise<void> {
  await writeJson(metaPath(root, albumId, meta.id), meta);
}

export async function deletePhoto(root: string, albumId: string, meta: PhotoMeta): Promise<void> {
  // Meta first so listings stop showing it even if a byte-delete fails midway.
  await removeFile(metaPath(root, albumId, meta.id));
  await removeFile(thumbPath(root, albumId, meta.id));
  await removeFile(photoPath(root, albumId, meta));
}
