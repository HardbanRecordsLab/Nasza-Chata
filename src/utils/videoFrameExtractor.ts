/**
 * CPU video → key frames (bez GPU) — canvas + pHash + sharpness
 * Użycie: extractKeyFrames(videoBlob, { maxFrames: 8, intervalSec: 1.5 })
 */

import { hashImageData, hammingDistance, laplacianVariance } from './imageHash';

export interface ExtractedFrame {
  dataUrl: string;
  timeSec: number;
  sharpness: number;
  hash: string;
}

export async function extractKeyFrames(
  videoBlob: Blob,
  opts: { maxFrames?: number; intervalSec?: number; minSharpness?: number; dedupHamming?: number } = {}
): Promise<ExtractedFrame[]> {
  const { maxFrames = 8, intervalSec = 1.2, minSharpness = 80, dedupHamming = 8 } = opts;

  const url = URL.createObjectURL(videoBlob);
  const video = document.createElement('video');
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Video load failed'));
    // timeout
    setTimeout(() => reject(new Error('Video timeout')), 8000);
  });

  const duration = video.duration || 10;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    URL.revokeObjectURL(url);
    return [];
  }

  const frames: ExtractedFrame[] = [];
  const hashes: string[] = [];

  // sample times: evenly spaced + jitter
  const times: number[] = [];
  for (let t = 0.5; t < duration - 0.5 && times.length < maxFrames * 2; t += intervalSec) {
    times.push(Math.min(t, duration - 0.3));
  }
  // if short video, ensure at least 3 samples
  if (times.length < 3 && duration > 1) {
    times.push(duration * 0.25, duration * 0.5, duration * 0.75);
  }

  for (const time of times) {
    if (frames.length >= maxFrames) break;
    try {
      await seekVideo(video, time);
      canvas.width = 640;
      canvas.height = Math.round((video.videoHeight / video.videoWidth) * 640) || 360;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75);

      const [sharpness, hash] = await Promise.all([laplacianVariance(dataUrl), hashImageData(dataUrl)]);

      if (sharpness < minSharpness) continue; // blurry

      // dedup via hamming
      let dup = false;
      for (const h of hashes) {
        if (hammingDistance(hash, h) < dedupHamming) {
          dup = true;
          break;
        }
      }
      if (dup) continue;

      hashes.push(hash);
      frames.push({ dataUrl, timeSec: time, sharpness, hash });
    } catch {
      continue;
    }
  }

  URL.revokeObjectURL(url);

  // sort by sharpness desc, take top maxFrames, then sort by time
  const sorted = frames.sort((a, b) => b.sharpness - a.sharpness).slice(0, maxFrames).sort((a, b) => a.timeSec - b.timeSec);
  return sorted;
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      // small delay for frame render
      setTimeout(resolve, 60);
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = time;
  });
}
