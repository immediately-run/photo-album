import { useCallback, useEffect, useReducer, useState } from 'react';
import { albumDir, listPhotos } from '../lib/albums';
import { watchDir } from '../lib/store';
import type { PhotoMeta } from '../lib/types';


/** The photos of one album, re-read on demand and — when `live` — watched
 *  (R3-901: the relay surfaces other members' uploads as watch events). */
export function useAlbumPhotos(root: string, albumId: string, live: boolean) {
  const [photos, setPhotos] = useState<PhotoMeta[] | null>(null);
  const [gen, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    let cancelled = false;
    listPhotos(root, albumId).then(
      (list) => {
        if (!cancelled) setPhotos(list);
      },
      () => {
        if (!cancelled) setPhotos([]);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [root, albumId, gen]);

  useEffect(() => {
    if (!live) return;
    // R3-901: one recursive watch on the album dir replaces the photos/ + meta/
    // polls (both live under it; the relay reports the changed path).
    return watchDir(albumDir(root, albumId), bump);
  }, [live, root, albumId]);

  const refresh = useCallback(() => bump(), []);
  return { photos, refresh };
}
