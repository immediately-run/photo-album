import { useCallback, useRef, useState } from 'react';
import { addPhoto } from '../lib/albums';
import { isImageFile, processImage } from '../lib/image';

export interface UploadItem {
  key: string;
  name: string;
  status: 'queued' | 'working' | 'done' | 'error';
  /** 0..1 */
  progress: number;
  stage: string;
}

/** Sequential upload queue with per-file progress. Files are downscaled on a
 *  canvas before any bytes hit the store. */
export function useUploader(root: string, albumId: string, by: string, onAdded: () => void) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const seq = useRef(0);

  const patch = useCallback((key: string, p: Partial<UploadItem>) => {
    setItems((list) => list.map((it) => (it.key === key ? { ...it, ...p } : it)));
  }, []);

  const add = useCallback(
    async (files: File[]) => {
      const accepted = files.filter(isImageFile);
      const skipped = files.length - accepted.length;
      const fresh: UploadItem[] = accepted.map((f) => ({
        key: `${Date.now()}-${seq.current++}`,
        name: f.name,
        status: 'queued',
        progress: 0,
        stage: 'Waiting',
      }));
      if (skipped > 0) {
        fresh.push({
          key: `${Date.now()}-${seq.current++}`,
          name: `${skipped} file${skipped === 1 ? '' : 's'} skipped`,
          status: 'error',
          progress: 0,
          stage: 'Not an image',
        });
      }
      setItems((list) => [...list, ...fresh]);

      for (let i = 0; i < accepted.length; i++) {
        const file = accepted[i];
        const key = fresh[i].key;
        patch(key, { status: 'working', progress: 0.05, stage: 'Resizing' });
        try {
          const img = await processImage(file);
          patch(key, { progress: 0.3, stage: 'Saving image' });
          const taken = file.lastModified ? new Date(file.lastModified).toISOString() : null;
          await addPhoto(root, albumId, img, { name: file.name, taken, by }, (fraction, stage) =>
            patch(key, { progress: fraction, stage }),
          );
          patch(key, { status: 'done', progress: 1, stage: 'Done' });
          onAdded();
        } catch (e) {
          const msg = (e as { message?: string } | null)?.message ?? String(e);
          patch(key, { status: 'error', stage: msg });
        }
      }
    },
    [root, albumId, by, onAdded, patch],
  );

  const clear = useCallback(() => setItems((list) => list.filter((it) => it.status === 'working' || it.status === 'queued')), []);

  const active = items.some((it) => it.status === 'working' || it.status === 'queued');
  return { items, add, clear, active };
}
