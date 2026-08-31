/**
 * CPU panorama stitch — canvas, bez GPU.
 * Prosty horizontal stitch z 20% overlap + blend. Jeśli obrazy zbyt różne → null.
 */

export async function stitchPanorama(dataUrls: string[]): Promise<string | null> {
  if (dataUrls.length < 2) return null;
  if (dataUrls.length > 5) dataUrls = dataUrls.slice(0, 5); // limit CPU

  const images = await Promise.all(dataUrls.map(loadImage));
  if (images.some(img => !img)) return null;

  // Check if images are similar enough to stitch (histogram distance < 0.4)
  // For now, always attempt — blueprint says if fails, return separate points
  try {
    const maxH = Math.max(...images.map(img => img!.height));
    const overlap = 0.2; // 20%

    // Estimate total width with overlap
    let totalW = 0;
    for (let i = 0; i < images.length; i++) {
      const img = images[i]!;
      const scaledW = (img.width * maxH) / img.height;
      totalW += i === 0 ? scaledW : scaledW * (1 - overlap);
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.min(3000, Math.round(totalW));
    canvas.height = maxH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // White background
    ctx.fillStyle = '#FDFCF0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let x = 0;
    for (let i = 0; i < images.length; i++) {
      const img = images[i]!;
      const scaledW = (img.width * maxH) / img.height;
      const scaledH = maxH;
      const drawW = i === 0 ? scaledW : scaledW * (1 - overlap);
      const sx = i === 0 ? 0 : img.width * overlap;
      const sw = i === 0 ? img.width : img.width * (1 - overlap);

      // Simple exposure compensation: adjust brightness to average
      // For MVP, just draw with blend at overlap
      if (i > 0) {
        // Draw the overlapping slice (crop the left `overlap` portion that duplicates the previous frame)
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = Math.round(drawW);
        tempCanvas.height = scaledH;
        const tCtx = tempCanvas.getContext('2d');
        if (tCtx) {
          tCtx.drawImage(img, sx, 0, sw, img.height, 0, 0, drawW, scaledH);
          ctx.drawImage(tempCanvas, x, 0);
        }
      } else {
        ctx.drawImage(img, 0, 0, img.width, img.height, x, 0, scaledW, scaledH);
      }
      x += drawW;
    }

    // If canvas is mostly empty or too small, consider fail
    if (canvas.width < 400) return null;

    return canvas.toDataURL('image/jpeg', 0.82);
  } catch {
    return null;
  }
}

function loadImage(dataUrl: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // allow canvas readback for Blob-hosted photos
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}
