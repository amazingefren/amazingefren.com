import type { Asset } from '../../../contracts/writing/index.ts';

export const maximumImageBytes = 2 * 1024 * 1024;

const maximumDimension = 4096;
const compressionQualities = [0.82, 0.68, 0.54, 0.4, 0.28];

export type PreparedImage = {
  name: string;
  mime: Asset['mime'];
  dataUrl: string;
  compressed: boolean;
  bytes: number;
};

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!isImageType(file.type))
    throw new Error('Use a PNG, JPEG, WebP, or GIF image.');

  if (file.size <= maximumImageBytes) {
    const dataUrl = await readDataUrl(file);
    await loadImage(dataUrl);
    return {
      name: file.name,
      mime: file.type,
      dataUrl,
      compressed: false,
      bytes: file.size,
    };
  }

  const image = await loadFileImage(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  let { width, height } = fitDimensions(
    sourceWidth,
    sourceHeight,
    maximumDimension,
  );
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This image could not be compressed.');

  for (let attempt = 0; attempt < 8; attempt++) {
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    for (const quality of compressionQualities) {
      const blob = await encode(canvas, 'image/webp', quality);
      if (blob.size > maximumImageBytes) continue;
      return {
        name: webpName(file.name),
        mime: 'image/webp',
        dataUrl: await readDataUrl(blob),
        compressed: true,
        bytes: blob.size,
      };
    }
    ({ width, height } = fitDimensions(
      Math.floor(width * 0.8),
      Math.floor(height * 0.8),
      maximumDimension,
    ));
  }

  throw new Error('This image could not be compressed below 2 MiB.');
}

export function isImageType(value: string): value is Asset['mime'] {
  return (
    value === 'image/png' ||
    value === 'image/jpeg' ||
    value === 'image/webp' ||
    value === 'image/gif'
  );
}

export function fitDimensions(
  width: number,
  height: number,
  maximum: number,
): { width: number; height: number } {
  const scale = Math.min(1, maximum / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function loadFileImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  return loadImage(url).finally(() => URL.revokeObjectURL(url));
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('This image is malformed.'));
    image.src = source;
  });
}

function readDataUrl(value: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('This image could not be read.'));
    };
    reader.onerror = () => reject(new Error('This image could not be read.'));
    reader.readAsDataURL(value);
  });
}

function encode(
  canvas: HTMLCanvasElement,
  mime: 'image/webp',
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('This image could not be compressed.'));
      },
      mime,
      quality,
    );
  });
}

function webpName(name: string): string {
  const stem = name.replace(/\.[^/.]+$/, '') || 'image';
  return `${stem}.webp`;
}
