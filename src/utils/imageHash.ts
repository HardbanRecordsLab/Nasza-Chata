/**
 * CPU-only image dedup — pHash + Hamming, histogram, sharpness (Laplacian variance)
 * Bez GPU, tylko canvas.
 */

export function hashImageData(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 8;
      canvas.height = 8;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve('');
      ctx.drawImage(img, 0, 0, 8, 8);
      const data = ctx.getImageData(0, 0, 8, 8).data;
      const gray: number[] = [];
      for (let i = 0; i < data.length; i += 4) {
        gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      }
      const avg = gray.reduce((a, b) => a + b, 0) / gray.length;
      let hash = '';
      gray.forEach(v => (hash += v >= avg ? '1' : '0'));
      resolve(hash);
    };
    img.onerror = () => resolve('');
    img.src = dataUrl;
  });
}

export function hammingDistance(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

export function histogramDistance(aDataUrl: string, bDataUrl: string): Promise<number> {
  return Promise.all([getHistogram(aDataUrl), getHistogram(bDataUrl)]).then(([ha, hb]) => {
    let sum = 0;
    for (let i = 0; i < ha.length; i++) sum += Math.abs(ha[i] - hb[i]);
    return sum / 2; // 0..1
  });
}

function getHistogram(dataUrl: string): Promise<number[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(new Array(16).fill(0));
      ctx.drawImage(img, 0, 0, 32, 32);
      const d = ctx.getImageData(0, 0, 32, 32).data;
      const hist = new Array(16).fill(0);
      for (let i = 0; i < d.length; i += 4) {
        const g = Math.round((0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 16);
        hist[Math.min(15, g)]++;
      }
      const total = 32 * 32;
      resolve(hist.map(v => v / total));
    };
    img.onerror = () => resolve(new Array(16).fill(0));
    img.src = dataUrl;
  });
}

export function laplacianVariance(dataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(0);
      ctx.drawImage(img, 0, 0, 64, 64);
      const d = ctx.getImageData(0, 0, 64, 64).data;
      const gray: number[] = [];
      for (let i = 0; i < d.length; i += 4) gray.push(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      // simple Laplacian kernel variance
      let sum = 0;
      let sumSq = 0;
      let n = 0;
      for (let y = 1; y < 63; y++) {
        for (let x = 1; x < 63; x++) {
          const idx = y * 64 + x;
          const lap = -4 * gray[idx] + gray[idx - 1] + gray[idx + 1] + gray[idx - 64] + gray[idx + 64];
          sum += lap;
          sumSq += lap * lap;
          n++;
        }
      }
      const mean = sum / n;
      const variance = sumSq / n - mean * mean;
      resolve(variance);
    };
    img.onerror = () => resolve(0);
    img.src = dataUrl;
  });
}
