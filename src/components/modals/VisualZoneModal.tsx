import React, { useState, useRef, useCallback } from 'react';
import { VisualZone, VisualEntry, RoomTag } from '../../types';
import { useChata } from '../../context/ChataContext';
import { isTaskScheduledOnDate } from '../../utils/recurrenceEngine';
import {
  X,
  Camera,
  Video,
  MapPin,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  SplitSquareHorizontal,
  Tag,
  SkipForward,
  RotateCcw,
  Play,
  Pause,
  Check,
  Plus,
  Eye,
} from 'lucide-react';

interface VisualZoneModalProps {
  zone: VisualZone;
  onClose: () => void;
}

type ModalView = 'timeline' | 'capture' | 'compare' | 'detail' | 'walkin';

const DEFAULT_ANGLES: Record<string, string[]> = {
  room: ['Od drzwi', 'Od okna', 'Widok ogólny'],
  garden: ['Z lewej', 'Z prawej', 'Z góry tarasu'],
  utility: ['Widok ogólny', 'Szczegóły'],
};

export const VisualZoneModal: React.FC<VisualZoneModalProps> = ({ zone, onClose }) => {
  const {
    currentProfile,
    updateVisualZone,
    addVisualEntry,
    deleteVisualEntry,
    showToast,
    tasks,
    completions,
    createWalkinGraph,
    createAutoHotspots,
  } = useChata();

  const [view, setView] = useState<ModalView>(
    zone.entries.length > 0 ? 'timeline' : 'capture'
  );
  const [selectedEntry, setSelectedEntry] = useState<VisualEntry | null>(null);
  const [compareEntry, setCompareEntry] = useState<VisualEntry | null>(null);
  const [filterAngle, setFilterAngle] = useState<string>('all');
  const [walkinEntry, setWalkinEntry] = useState<VisualEntry | null>(null);
  const [isBuildingWalkin, setIsBuildingWalkin] = useState(false);

  // Capture flow state
  const [captureMode, setCaptureMode] = useState<'photo' | 'video'>('photo');
  const [captureAngles, setCaptureAngles] = useState<string[]>(
    zone.captureAngles || DEFAULT_ANGLES[zone.zoneType] || DEFAULT_ANGLES.room
  );
  const [currentAngleIdx, setCurrentAngleIdx] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState<{ angle: string; dataUrl: string }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hotspot state
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagPos, setNewTagPos] = useState<{ x: number; y: number } | null>(null);
  const [newTagLabel, setNewTagLabel] = useState('');
  const [editingTags, setEditingTags] = useState<RoomTag[]>([]);
  const imageRef = useRef<HTMLImageElement>(null);

  // Sorted entries
  const sortedEntries = [...zone.entries].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
  );

  // Filtered entries
  const filteredEntries = filterAngle === 'all'
    ? sortedEntries
    : sortedEntries.filter(e => e.angleLabel === filterAngle);

  // Unique angles
  const uniqueAngles = [...new Set(sortedEntries.map(e => e.angleLabel).filter(Boolean))];

  // Default comparison: latest vs ~30 days ago
  const getDefaultCompare = () => {
    if (sortedEntries.length < 2) return null;
    const latest = sortedEntries[sortedEntries.length - 1];
    const latestDate = new Date(latest.capturedAt).getTime();
    const monthAgo = latestDate - 30 * 24 * 60 * 60 * 1000;
    // Find closest to month ago
    let best = sortedEntries[0];
    for (const e of sortedEntries) {
      const diff = Math.abs(new Date(e.capturedAt).getTime() - monthAgo);
      const bestDiff = Math.abs(new Date(best.capturedAt).getTime() - monthAgo);
      if (diff < bestDiff && e.id !== latest.id) best = e;
    }
    return best.id !== latest.id ? { a: latest, b: best } : null;
  };

  // Start camera for capture
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: captureMode === 'video',
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      showToast('Błąd kamery', 'Nie udało się uruchomić aparatu', 'error');
    }
  }, [captureMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Take photo — capture is already compressed via canvas (1920px, jpeg 0.8)
  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;

    const maxDim = 1920;
    let w = video.videoWidth;
    let h = video.videoHeight;
    if (w > maxDim || h > maxDim) {
      const ratio = Math.min(maxDim / w, maxDim / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const angle = captureAngles[currentAngleIdx] || 'Zdjęcie';
    setCapturedPhotos(prev => [...prev, { angle, dataUrl }]);

    if (currentAngleIdx < captureAngles.length - 1) {
      setCurrentAngleIdx(prev => prev + 1);
    }
    // No auto-save — user clicks „Zapisz" (avoids stale-closure race, lets user review)
  }, [currentAngleIdx, captureAngles]);

  // Start video recording
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    try {
      const mr = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setVideoBlob(blob);
        // Generate thumbnail
        if (videoRef.current && canvasRef.current) {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          canvas.width = video.videoWidth / 2;
          canvas.height = video.videoHeight / 2;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            setVideoThumbnail(canvas.toDataURL('image/jpeg', 0.6));
          }
        }
      };
      mediaRecorderRef.current = mr;
      mr.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 25) {
            stopRecording();
            return 25;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      showToast('Błąd nagrywania', 'Twoja przeglądarka nie obsługuje MediaRecorder', 'error');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopCamera();
  }, [stopCamera]);

  // Save all captured entries — photos via Blob, video via Blob
  const saveAllEntries = useCallback(async (
    photosOverride?: { angle: string; dataUrl: string }[],
    videoBlobOverride?: Blob | null,
  ) => {
    const photos = photosOverride ?? capturedPhotos;
    const vBlob = videoBlobOverride !== undefined ? videoBlobOverride : videoBlob;

    // Upload photos to Blob (with compression already done via canvas)
    for (const photo of photos) {
      let mediaUrl = photo.dataUrl;
      try {
        const filename = `photo-${zone.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`;
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: photo.dataUrl,
            filename,
            folder: `visual-zones/${zone.id}`,
            mimeType: 'image/jpeg',
          }),
        });
        if (res.ok) {
          const { url } = await res.json();
          mediaUrl = url;
        }
      } catch (e) {
        console.warn('Photo Blob upload failed, using dataUrl fallback', e);
      }
      addVisualEntry(zone.id, {
        capturedAt: new Date().toISOString(),
        capturedById: currentProfile.id,
        capturedByName: currentProfile.name,
        mediaType: 'photo',
        mediaUrl,
        angleLabel: photo.angle,
      });
    }

    // Upload video to Blob if any
    if (vBlob) {
      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(vBlob);
        });
        const filename = `video-${zone.id}-${Date.now()}.webm`;
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: base64,
            filename,
            folder: `visual-zones/${zone.id}`,
            mimeType: 'video/webm',
          }),
        });
        if (res.ok) {
          const { url } = await res.json();
          addVisualEntry(zone.id, {
            capturedAt: new Date().toISOString(),
            capturedById: currentProfile.id,
            capturedByName: currentProfile.name,
            mediaType: 'video',
            mediaUrl: url,
            thumbnailUrl: videoThumbnail || undefined,
            angleLabel: captureAngles[0] || 'Wideo',
          });
        } else {
          const videoUrl = URL.createObjectURL(vBlob);
          addVisualEntry(zone.id, {
            capturedAt: new Date().toISOString(),
            capturedById: currentProfile.id,
            capturedByName: currentProfile.name,
            mediaType: 'video',
            mediaUrl: videoUrl,
            thumbnailUrl: videoThumbnail || undefined,
            angleLabel: captureAngles[0] || 'Wideo',
          });
        }
      } catch {
        const videoUrl = URL.createObjectURL(vBlob);
        addVisualEntry(zone.id, {
          capturedAt: new Date().toISOString(),
          capturedById: currentProfile.id,
          capturedByName: currentProfile.name,
          mediaType: 'video',
          mediaUrl: videoUrl,
          thumbnailUrl: videoThumbnail || undefined,
          angleLabel: captureAngles[0] || 'Wideo',
        });
      }
    }

    setCapturedPhotos([]);
    setVideoBlob(null);
    setVideoThumbnail(null);
    setCurrentAngleIdx(0);
    setView('timeline');
    showToast('Zapisano wpisy wizualne', `${photos.length + (vBlob ? 1 : 0)} wpisów`, 'success');
  }, [capturedPhotos, videoBlob, videoThumbnail, zone.id, captureAngles, currentProfile, addVisualEntry, showToast]);

  // Handle image click for hotspot
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isAddingTag || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setNewTagPos({ x, y });
  };

  const saveTag = () => {
    if (!newTagPos || !newTagLabel.trim() || !selectedEntry) return;
    const newTag: RoomTag = {
      id: 'tag-' + Date.now(),
      x: newTagPos.x,
      y: newTagPos.y,
      label: newTagLabel.trim(),
    };
    setEditingTags(prev => [...prev, newTag]);
    setIsAddingTag(false);
    setNewTagPos(null);
    setNewTagLabel('');
    showToast('Punkt dodany', newTag.label, 'success');
  };

  // Format date for display
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // ---- RENDER: CAPTURE VIEW ----
  if (view === 'capture') {
    const angle = captureAngles[currentAngleIdx] || 'Zdjęcie';
    const progress = ((currentAngleIdx + 1) / captureAngles.length) * 100;

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black animate-in fade-in">
        {/* Header */}
        <div className="p-4 flex items-center justify-between bg-black/80 absolute top-0 left-0 right-0 z-20">
          <div>
            <h3 className="text-white font-bold text-sm">{zone.name}</h3>
            <p className="text-emerald-400 text-xs font-mono">
              Kąt {currentAngleIdx + 1}/{captureAngles.length}: {angle}
            </p>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }} className="p-2 bg-white/20 rounded-full text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="absolute top-14 left-0 right-0 z-20 px-4">
          <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Camera / Preview */}
        <div className="flex-1 relative flex items-center justify-center bg-zinc-900">
          <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />

          {/* Capture mode toggle */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex bg-black/60 rounded-full p-1">
            <button
              onClick={() => setCaptureMode('photo')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                captureMode === 'photo' ? 'bg-emerald-500 text-white' : 'text-white/60'
              }`}
            >
              <Camera className="w-4 h-4 inline mr-1" /> Zdjęcie
            </button>
            <button
              onClick={() => setCaptureMode('video')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                captureMode === 'video' ? 'bg-red-500 text-white' : 'text-white/60'
              }`}
            >
              <Video className="w-4 h-4 inline mr-1" /> Wideo
            </button>
          </div>

          {/* Angle instruction */}
          <div className="absolute bottom-24 inset-x-0 flex justify-center z-20">
            <div className="bg-black/70 px-4 py-2 rounded-full">
              <p className="text-white text-sm font-bold text-center">
                📸 Zrób zdjęcie: <span className="text-emerald-400">{angle}</span>
              </p>
              <p className="text-white/60 text-xs text-center">({currentAngleIdx + 1}/{captureAngles.length})</p>
            </div>
          </div>

          {/* Recording timer */}
          {isRecording && (
            <div className="absolute top-24 right-4 z-20 bg-red-500 px-3 py-1 rounded-full flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white text-xs font-mono font-bold">{recordingTime}s / 25s</span>
            </div>
          )}
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-0 inset-x-0 p-8 flex justify-center bg-gradient-to-t from-black/80 to-transparent z-20">
          {captureMode === 'photo' ? (
            <button
              onClick={takePhoto}
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center border-4 border-zinc-300 hover:scale-105 active:scale-95 transition-all shadow-xl"
            >
              <div className="w-16 h-16 rounded-full border-2 border-emerald-500 border-dashed" />
              <Camera className="w-8 h-8 text-emerald-600 absolute" />
            </button>
          ) : !isRecording ? (
            <button
              onClick={startRecording}
              className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"
            >
              <div className="w-16 h-16 rounded-full border-4 border-white/50" />
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl animate-pulse"
            >
              <div className="w-8 h-8 bg-white rounded-sm" />
            </button>
          )}
        </div>

        {/* Captured photos preview strip */}
        {capturedPhotos.length > 0 && (
          <div className="absolute bottom-32 left-0 right-0 z-20 px-4">
            <div className="flex gap-2 overflow-x-auto pb-2 items-end">
              {capturedPhotos.map((p, i) => (
                <div key={i} className="relative shrink-0">
                  <img src={p.dataUrl} alt={p.angle} className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-400" />
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] bg-emerald-500 text-white px-1 rounded font-bold whitespace-nowrap">
                    {p.angle}
                  </span>
                </div>
              ))}
              <button
                onClick={() => { stopCamera(); saveAllEntries(); }}
                className="shrink-0 h-16 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg"
              >
                <Check className="w-4 h-4" /> Zapisz {capturedPhotos.length}
              </button>
            </div>
          </div>
        )}
        {videoBlob && (
          <div className="absolute bottom-32 left-0 right-0 z-20 px-4 flex justify-center">
            <button
              onClick={() => { stopCamera(); saveAllEntries(); }}
              className="px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold flex items-center gap-2 shadow-xl"
            >
              <Check className="w-4 h-4" /> Zapisz wideo
            </button>
          </div>
        )}
      </div>
    );
  }

  // ---- RENDER: COMPARE VIEW ----
  if (view === 'compare' && selectedEntry && compareEntry) {
    const [left, right] = new Date(selectedEntry.capturedAt).getTime() >= new Date(compareEntry.capturedAt).getTime()
      ? [selectedEntry, compareEntry]
      : [compareEntry, selectedEntry];

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-zinc-900 animate-in fade-in">
        <div className="p-4 flex items-center justify-between bg-zinc-900 border-b border-white/10">
          <button onClick={() => setView('timeline')} className="p-2 text-white/60 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <SplitSquareHorizontal className="w-4 h-4 text-emerald-400" />
            Porównanie
          </h3>
          <button onClick={onClose} className="p-2 text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col sm:flex-row gap-1 p-2 overflow-hidden">
          {/* Left (older) */}
          <div className="flex-1 relative rounded-2xl overflow-hidden bg-black">
            {right.mediaType === 'video' ? (
              <video src={right.mediaUrl} controls poster={right.thumbnailUrl} className="w-full h-full object-contain" />
            ) : (
              <img src={right.mediaUrl} alt="" className="w-full h-full object-contain" />
            )}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 p-3">
              <p className="text-white text-xs font-bold">{formatDate(right.capturedAt)}</p>
              <p className="text-white/60 text-[10px]">{right.angleLabel} • {right.capturedByName}</p>
            </div>
          </div>

          {/* Right (newer) */}
          <div className="flex-1 relative rounded-2xl overflow-hidden bg-black">
            {left.mediaType === 'video' ? (
              <video src={left.mediaUrl} controls poster={left.thumbnailUrl} className="w-full h-full object-contain" />
            ) : (
              <img src={left.mediaUrl} alt="" className="w-full h-full object-contain" />
            )}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 p-3">
              <p className="text-white text-xs font-bold">{formatDate(left.capturedAt)}</p>
              <p className="text-white/60 text-[10px]">{left.angleLabel} • {left.capturedByName}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- RENDER: DETAIL VIEW ----
  if (view === 'detail' && selectedEntry) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-zinc-900 animate-in fade-in">
        <div className="p-4 flex items-center justify-between bg-zinc-900 border-b border-white/10">
          <button onClick={() => setView('timeline')} className="p-2 text-white/60 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-white font-bold text-sm">{selectedEntry.angleLabel || 'Wpis'}</h3>
          <button onClick={onClose} className="p-2 text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 relative overflow-hidden">
          {selectedEntry.mediaType === 'video' ? (
            <video
              src={selectedEntry.mediaUrl}
              controls
              poster={selectedEntry.thumbnailUrl}
              className="w-full h-full object-contain"
            />
          ) : (
            <img src={selectedEntry.mediaUrl} alt="" className="w-full h-full object-contain" />
          )}

          {/* Hotspot tags overlay — dynamic color via task status */}
          {selectedEntry.tags?.map((tag, idx) => {
            let tagColor = 'bg-emerald-500'; // default: no task linked
            let tagTooltip = tag.label;
            if (tag.taskId) {
              const linkedTask = tasks.find(t => t.id === tag.taskId);
              if (linkedTask) {
                const todayStr = new Date().toISOString().split('T')[0];
                const isCompletedToday = completions.some(
                  c => c.taskId === tag.taskId && c.completedAt && c.completedAt.startsWith(todayStr)
                );
                const isScheduledToday = isTaskScheduledOnDate(linkedTask, new Date());
                if (isCompletedToday) {
                  tagColor = 'bg-emerald-500';
                  tagTooltip = `${tag.label} ✓`;
                } else if (isScheduledToday) {
                  tagColor = 'bg-amber-500';
                  tagTooltip = `${tag.label} — do zrobienia`;
                } else {
                  tagColor = 'bg-zinc-400';
                  tagTooltip = `${tag.label} — niezaplanowane`;
                }
              }
            }
            return (
              <div
                key={tag.id}
                className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full group"
                style={{ left: `${tag.x}%`, top: `${tag.y}%` }}
              >
                <div className={`absolute inset-0 ${tagColor}/30 rounded-full animate-ping`} />
                <div className={`relative w-6 h-6 ${tagColor} rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-black`}>
                  {idx + 1}
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white/95 text-zinc-900 px-3 py-2 rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity w-48 z-20">
                  <div className="font-bold text-sm">{tagTooltip}</div>
                  {tag.taskId && (
                    <div className={`text-[10px] mt-1 ${tagColor === 'bg-emerald-500' ? 'text-emerald-600' : tagColor === 'bg-amber-500' ? 'text-amber-600' : 'text-zinc-500'}`}>
                      Powiązane z zadaniem
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add hotspot button */}
          <div className="absolute bottom-4 right-4 z-10">
            <button
              onClick={() => setIsAddingTag(true)}
              className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-emerald-600"
            >
              <MapPin className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info bar */}
        <div className="p-4 bg-zinc-900 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-bold">{selectedEntry.angleLabel}</p>
              <p className="text-white/60 text-xs">{formatDate(selectedEntry.capturedAt)} • {selectedEntry.capturedByName}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const def = getDefaultCompare();
                  if (def) {
                    setCompareEntry(def.b);
                    setSelectedEntry(def.a);
                    setView('compare');
                  }
                }}
                className="px-3 py-1.5 bg-white/10 text-white rounded-xl text-xs font-bold flex items-center gap-1"
              >
                <SplitSquareHorizontal className="w-3.5 h-3.5" /> Porównaj
              </button>
              <button
                onClick={() => {
                  deleteVisualEntry(zone.id, selectedEntry.id);
                  setView('timeline');
                }}
                className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-xl text-xs font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- RENDER: WALKIN VIEW (CPU photo-based, no GPU) ----
  if (view === 'walkin' && walkinEntry) {
    const walkLinks = zone.viewpointLinks || [];
    const walkHotspots = (walkinEntry.tags || []).filter(t => t.targetEntryId);
    const walkIdx = sortedEntries.findIndex(e => e.id === walkinEntry.id);
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-zinc-900 animate-in fade-in">
        <div className="p-4 flex items-center justify-between bg-zinc-900 border-b border-white/10">
          <button onClick={() => setView('timeline')} className="p-2 text-white/60 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> Walk-In • {walkinEntry.angleLabel || zone.name}
            {zone.walkinVersion && <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">V{zone.walkinVersion}</span>}
          </h3>
          <button onClick={onClose} className="p-2 text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
          {walkinEntry.mediaType === 'video' ? (
            <video src={walkinEntry.mediaUrl} controls poster={walkinEntry.thumbnailUrl} className="w-full h-full object-contain" />
          ) : (
            <img src={walkinEntry.mediaUrl} alt="" className="w-full h-full object-contain" />
          )}

          {/* Walk-point hotspots (CPU auto) */}
          {walkHotspots.map(tag => {
            const target = sortedEntries.find(e => e.id === tag.targetEntryId);
            return (
              <button
                key={tag.id}
                onClick={() => {
                  const tgt = sortedEntries.find(e => e.id === tag.targetEntryId);
                  if (tgt) setWalkinEntry(tgt);
                }}
                className="absolute -ml-6 -mt-6 w-12 h-12 rounded-full group flex items-center justify-center"
                style={{ left: `${tag.x}%`, top: `${tag.y}%` }}
                title={`Idź → ${target?.angleLabel || 'kolejny widok'}`}
              >
                <span className="absolute inset-0 bg-emerald-400/30 rounded-full animate-ping" />
                <span className="relative w-10 h-10 bg-white rounded-full border-2 border-emerald-500 shadow-xl flex items-center justify-center text-emerald-600">
                  <ChevronRight className="w-5 h-5" />
                </span>
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100">
                  {tag.label}
                </span>
              </button>
            );
          })}

          {/* Task hotspots still visible but dimmed */}
          {(walkinEntry.tags || []).filter(t => !t.targetEntryId && t.taskId).map((tag, idx) => (
            <div key={tag.id} className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full bg-amber-500 border-2 border-white shadow flex items-center justify-center text-white text-[9px] font-black opacity-70" style={{ left: `${tag.x}%`, top: `${tag.y}%` }}>
              {idx + 1}
            </div>
          ))}

          {/* Nav arrows */}
          {walkIdx > 0 && (
            <button onClick={() => setWalkinEntry(sortedEntries[walkIdx - 1])} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-sm">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {walkIdx < sortedEntries.length - 1 && (
            <button onClick={() => setWalkinEntry(sortedEntries[walkIdx + 1])} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-sm">
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Bottom bar: graph dots + info */}
        <div className="p-3 bg-zinc-900 border-t border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {sortedEntries.map((e, i) => (
              <button
                key={e.id}
                onClick={() => setWalkinEntry(e)}
                className={`w-8 h-8 rounded-lg overflow-hidden border-2 shrink-0 ${e.id === walkinEntry.id ? 'border-emerald-400' : 'border-white/10 opacity-60'}`}
                title={e.angleLabel || `Widok ${i+1}`}
              >
                <img src={e.thumbnailUrl || e.mediaUrl} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <div className="text-right shrink-0">
            <div className="text-white text-xs font-bold">{walkinEntry.angleLabel || `Widok ${walkIdx + 1}/${sortedEntries.length}`}</div>
            <div className="text-white/60 text-[11px]">{formatDate(walkinEntry.capturedAt)} • {walkinEntry.capturedByName}</div>
          </div>
        </div>
      </div>
    );
  }

  // ---- RENDER: TIMELINE VIEW (default) ----
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="absolute inset-4 sm:inset-8 bg-zinc-900 rounded-[32px] overflow-hidden flex flex-col shadow-2xl border border-white/10">

        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              {zone.name}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {zone.entries.length} wpisów w czasie • {zone.zoneType === 'garden' ? 'Ogród' : zone.zoneType === 'utility' ? 'Pomieszczenie techniczne' : 'Pomieszczenie'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {zone.entries.length >= 2 && (
              zone.viewpointLinks && zone.viewpointLinks.length > 0 ? (
                <button
                  onClick={() => { setWalkinEntry(sortedEntries[0]); setView('walkin'); }}
                  className="px-3 py-2 bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Eye className="w-4 h-4" /> Walk-In
                </button>
              ) : (currentProfile.isAdmin || currentProfile.id === 'kamil') ? (
                <button
                  disabled={isBuildingWalkin}
                  onClick={async () => {
                    setIsBuildingWalkin(true);
                    try {
                      await createWalkinGraph(zone.id);
                      await createAutoHotspots(zone.id);
                    } finally { setIsBuildingWalkin(false); }
                  }}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  {isBuildingWalkin ? 'Budowanie...' : 'Zbuduj Walk-In (CPU)'}
                </button>
              ) : null
            )}
            <button
              onClick={() => { setCapturedPhotos([]); setVideoBlob(null); setCurrentAngleIdx(0); setView('capture'); }}
              className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" /> Dodaj wpis
            </button>
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Angle filter */}
        {uniqueAngles.length > 0 && (
          <div className="px-5 py-3 border-b border-white/5 flex gap-2 overflow-x-auto shrink-0">
            <button
              onClick={() => setFilterAngle('all')}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                filterAngle === 'all' ? 'bg-emerald-500 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'
              }`}
            >
              Wszystkie kąty
            </button>
            {uniqueAngles.map(angle => (
              <button
                key={angle}
                onClick={() => setFilterAngle(angle!)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                  filterAngle === angle ? 'bg-emerald-500 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                }`}
              >
                {angle}
              </button>
            ))}
          </div>
        )}

        {/* Timeline content */}
        <div className="flex-1 overflow-y-auto p-5">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-16">
              <Camera className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h4 className="text-zinc-400 font-bold text-lg mb-1">Brak wpisów</h4>
              <p className="text-zinc-500 text-sm max-w-[280px] mx-auto">
                Dodaj pierwsze zdjęcie lub wideo, aby rozpocząć dokumentowanie wizualne tej strefy.
              </p>
              <button
                onClick={() => setView('capture')}
                className="mt-4 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-sm font-bold transition-colors"
              >
                Rozpocznij dokumentowanie
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Default comparison banner */}
              {sortedEntries.length >= 2 && (
                <button
                  onClick={() => {
                    const def = getDefaultCompare();
                    if (def) {
                      setSelectedEntry(def.a);
                      setCompareEntry(def.b);
                      setView('compare');
                    }
                  }}
                  className="w-full p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-left hover:bg-emerald-500/20 transition-colors"
                >
                  <SplitSquareHorizontal className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-emerald-400 text-sm font-bold">Porównaj najnowszy vs. sprzed miesiąca</p>
                    <p className="text-emerald-400/60 text-xs">Szybkie porównanie zmian w czasie</p>
                  </div>
                </button>
              )}

              {/* Timeline entries */}
              {filteredEntries.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden hover:bg-white/10 transition-colors group"
                >
                  <div className="flex gap-3 p-3">
                    {/* Thumbnail */}
                    <button
                      onClick={() => { setSelectedEntry(entry); setView('detail'); }}
                      className="w-20 h-20 rounded-xl overflow-hidden bg-zinc-800 shrink-0 relative"
                    >
                      <img
                        src={entry.thumbnailUrl || entry.mediaUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      {entry.mediaType === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-bold truncate">{entry.angleLabel || 'Wpis'}</span>
                        {entry.mediaType === 'video' && (
                          <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[9px] font-bold rounded">WIDEO</span>
                        )}
                      </div>
                      <p className="text-zinc-500 text-xs mt-0.5">{formatDate(entry.capturedAt)}</p>
                      <p className="text-zinc-600 text-[10px] mt-0.5">{entry.capturedByName}</p>
                      {entry.caption && (
                        <p className="text-zinc-400 text-xs mt-1 italic truncate">{entry.caption}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setSelectedEntry(entry);
                          // Find another entry for comparison
                          const otherIdx = idx > 0 ? idx - 1 : idx + 1;
                          if (otherIdx >= 0 && otherIdx < filteredEntries.length) {
                            setCompareEntry(filteredEntries[otherIdx]);
                            setView('compare');
                          }
                        }}
                        className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400"
                        title="Porównaj"
                      >
                        <SplitSquareHorizontal className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteVisualEntry(zone.id, entry.id)}
                        className="p-1.5 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-zinc-400"
                        title="Usuń"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
