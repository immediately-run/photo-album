import fs from 'fs';
import { useEffect, useState } from 'react';
import { useObjectUrl } from '@immediately-run/sdk/hooks';
import type { Store } from '../lib/store';

export interface ImageUrl {
  url: string | null;
  loading: boolean;
  error: string | null;
}

const IDLE: ImageUrl = { url: null, loading: false, error: null };

/**
 * Object URL for an image at an absolute path inside `store`.
 *
 * On the host this is the SDK's `useObjectUrl(mount, relPath)`. When there is no
 * mount (local `vite dev`) — or the host read fails — it falls back to reading
 * the bytes through `fs` and building the blob URL itself, so the same component
 * works in both environments.
 */
export function useImageUrl(store: Store | null, absPath: string | null, mime?: string): ImageUrl {
  const mount = store?.mount ?? null;
  const rel =
    mount && absPath && absPath.startsWith(`${mount.path}/`) ? absPath.slice(mount.path.length + 1) : null;
  const hosted = useObjectUrl(mount, rel, mime ? { type: mime } : undefined);
  const fallback = !!absPath && (rel === null || hosted.error !== null);

  const [fb, setFb] = useState<{ path: string; url: string | null; error: string | null } | null>(null);

  useEffect(() => {
    if (!fallback || !absPath) return;
    let cancelled = false;
    let url: string | null = null;
    fs.promises.readFile(absPath).then(
      (bytes) => {
        if (cancelled) return;
        // `.slice()` yields a plain ArrayBuffer-backed view the Blob ctor accepts.
        url = URL.createObjectURL(new Blob([bytes.slice()], mime ? { type: mime } : undefined));
        setFb({ path: absPath, url, error: null });
      },
      (e: unknown) => {
        if (!cancelled) setFb({ path: absPath, url: null, error: String(e) });
      },
    );
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [fallback, absPath, mime]);

  if (!absPath) return IDLE;
  if (!fallback) return { url: hosted.url, loading: hosted.loading, error: null };
  const fresh = fb !== null && fb.path === absPath;
  return { url: fresh ? fb.url : null, loading: !fresh, error: fresh ? fb.error : null };
}
