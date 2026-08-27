// Client-side image processing: decode → downscale on a <canvas> → encode.
// Keeps spaces small (a phone photo is 3–8 MB; at 1600px JPEG q0.85 it is ~300 KB)
// and produces a 320px thumbnail for the grid.

import type { PhotoExt } from './types';

export const MAX_EDGE = 1600;
export const THUMB_EDGE = 320;
const JPEG_QUALITY = 0.85;
const THUMB_QUALITY = 0.8;

export interface ProcessedImage {
  bytes: Uint8Array;
  ext: PhotoExt;
  mime: string;
  width: number;
  height: number;
  thumb: Uint8Array;
}

type Drawable = ImageBitmap | HTMLImageElement;

async function decode(file: File): Promise<Drawable> {
  // createImageBitmap honours EXIF orientation and is off the main thread.
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* fall through to the <img> path (e.g. an unsupported option) */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Not a decodable image'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const sizeOf = (d: Drawable) =>
  'naturalWidth' in d ? { w: d.naturalWidth, h: d.naturalHeight } : { w: d.width, h: d.height };

function fit(w: number, h: number, maxEdge: number): { w: number; h: number } {
  const long = Math.max(w, h);
  if (long <= maxEdge) return { w, h };
  const k = maxEdge / long;
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

function draw(src: Drawable | HTMLCanvasElement, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h);
  return canvas;
}

/** True when any sampled pixel is not fully opaque. */
function hasTransparency(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  // Sample every 4th pixel — plenty to detect real transparency.
  for (let i = 3; i < data.length; i += 16) if (data[i] < 255) return true;
  return false;
}

function encode(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image encoding failed'))), mime, quality);
  });
}

const toBytes = async (b: Blob) => new Uint8Array(await b.arrayBuffer());

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|avif|heic|heif)$/i.test(file.name);
}

/**
 * Downscale `file` to at most {@link MAX_EDGE} px on the long edge. PNGs that
 * actually use transparency stay PNG; everything else becomes JPEG q0.85.
 */
export async function processImage(file: File): Promise<ProcessedImage> {
  const src = await decode(file);
  try {
    const { w: sw, h: sh } = sizeOf(src);
    if (!sw || !sh) throw new Error('Image has no pixels');

    const main = fit(sw, sh, MAX_EDGE);
    const canvas = draw(src, main.w, main.h);
    const keepPng = file.type === 'image/png' && hasTransparency(canvas);
    const mime = keepPng ? 'image/png' : 'image/jpeg';
    const bytes = await toBytes(await encode(canvas, mime, keepPng ? undefined : JPEG_QUALITY));

    const t = fit(main.w, main.h, THUMB_EDGE);
    const thumbCanvas = draw(canvas, t.w, t.h);
    if (keepPng) {
      // JPEG has no alpha: give transparent thumbnails a neutral backdrop.
      const ctx = thumbCanvas.getContext('2d')!;
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#1a1b26';
      ctx.fillRect(0, 0, t.w, t.h);
    }
    const thumb = await toBytes(await encode(thumbCanvas, 'image/jpeg', THUMB_QUALITY));

    return { bytes, ext: keepPng ? 'png' : 'jpg', mime, width: main.w, height: main.h, thumb };
  } finally {
    if ('close' in src) src.close();
  }
}

export const mimeFor = (ext: PhotoExt) => (ext === 'png' ? 'image/png' : 'image/jpeg');
