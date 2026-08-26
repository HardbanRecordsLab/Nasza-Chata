/**
 * Client-side image compression via <canvas>.
 * Resizes to max dimension and re-encodes as JPEG.
 */

export async function compressImage(
  input: File | string, // File or dataUrl
  maxDim = 1920,
  quality = 0.8
): Promise<string> {
  const dataUrl: string =
    typeof input === 'string'
      ? input
      : await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = reject;
          r.readAsDataURL(input);
        });

  // If not an image data URL, return as-is (e.g. already Blob URL)
  if (dataUrl.startsWith('https://') || !dataUrl.startsWith('data:image')) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      // Skip canvas if already small enough and quality would be wasted
      if (w === img.width && h === img.height && quality >= 0.95) {
        resolve(dataUrl);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      try {
        const out = canvas.toDataURL('image/jpeg', quality);
        resolve(out);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function uploadToBlob(
  dataUrlOrFile: string | File,
  filename: string,
  folder: string,
  mimeType = 'image/jpeg'
): Promise<string | null> {
  try {
    let dataUrl: string;
    if (typeof dataUrlOrFile === 'string') {
      dataUrl = dataUrlOrFile;
    } else {
      dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(dataUrlOrFile);
      });
    }

    // Already a Blob URL — no need to re-upload
    if (dataUrl.startsWith('https://')) return dataUrl;

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: dataUrl, filename, folder, mimeType }),
    });
    if (res.ok) {
      const { url } = await res.json();
      return url;
    }
  } catch (e) {
    console.error('uploadToBlob failed:', e);
  }
  return null;
}
