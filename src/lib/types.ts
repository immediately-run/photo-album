// Data model. One file per record so several space members can write
// concurrently without clobbering each other (last-write-wins per file).

/** `<store>/albums/<id>/album.json` */
export interface Album {
  id: string;
  title: string;
  description: string;
  /** photoId used as the album cover, or null for "first photo". */
  cover: string | null;
  /** ISO timestamp. */
  created: string;
  /** Login of whoever created the album ("someone" when the host has no login). */
  by: string;
}

export type PhotoExt = 'jpg' | 'png';

/** `<store>/albums/<albumId>/meta/<photoId>.json` — one per photo. */
export interface PhotoMeta {
  id: string;
  ext: PhotoExt;
  caption: string;
  /** ISO timestamp the picture was taken (best effort: the file's mtime). */
  taken: string | null;
  /** ISO timestamp it was added to the album. */
  added: string;
  by: string;
  width: number;
  height: number;
  /** Size in bytes of the stored (downscaled) image. */
  size: number;
  /** Original file name, kept for downloads. */
  name: string;
}

export interface AlbumSummary extends Album {
  count: number;
  /** The resolved cover: the chosen one when it still exists, else the first photo. */
  coverPhoto: PhotoMeta | null;
}
