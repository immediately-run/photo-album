import { useCallback, useEffect, useReducer, useState } from 'react';
import { listPhotos, metaDir, photosDir } from '../lib/albums';
import { pollDir } from '../lib/store';
import type { PhotoMeta } from '../lib/types';

const POLL_MS = 4000;

/** The photos of one album, re-read on demand and — when `live` — every 4 s so
 *  other members' uploads appear (shared spaces get no watch events). */
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
    const stops = [
      pollDir(photosDir(root, albumId), bump, POLL_MS),
      pollDir(metaDir(root, albumId), bump, POLL_MS),
    ];
    return () => stops.forEach((stop) => stop());
  }, [live, root, albumId]);

  const refresh = useCallback(() => bump(), []);
  return { photos, refresh };
}
