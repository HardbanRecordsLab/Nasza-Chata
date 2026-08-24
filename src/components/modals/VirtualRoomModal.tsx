import React, { useState, useRef } from 'react';
import { RoomSnapshot, RoomTag } from '../../types';
import { X, MapPin, Sparkles, Plus, Trash2, Tag } from 'lucide-react';
import { useChata } from '../../context/ChataContext';

interface VirtualRoomModalProps {
  room: RoomSnapshot;
  onClose: () => void;
}

export const VirtualRoomModal: React.FC<VirtualRoomModalProps> = ({ room, onClose }) => {
  const { updateRoomSnapshot, showToast } = useChata();
  const [tags, setTags] = useState<RoomTag[]>(room.virtualTags || []);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagPosition, setNewTagPosition] = useState<{ x: number; y: number } | null>(null);
  const [newTagLabel, setNewTagLabel] = useState('');
  
  const imageRef = useRef<HTMLImageElement>(null);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isAddingTag || !imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setNewTagPosition({ x, y });
  };

  const handleSaveTag = () => {
    if (!newTagPosition || !newTagLabel.trim()) return;
    
    const newTag: RoomTag = {
      id: 'tag-' + Date.now(),
      x: newTagPosition.x,
      y: newTagPosition.y,
      label: newTagLabel.trim()
    };
    
    const updatedTags = [...tags, newTag];
    setTags(updatedTags);
    updateRoomSnapshot(room.id, { virtualTags: updatedTags });
    
    setIsAddingTag(false);
    setNewTagPosition(null);
    setNewTagLabel('');
    showToast('Punkt dodany', `Zmapowano: ${newTag.label}`, 'success');
  };

  const handleDeleteTag = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedTags = tags.filter(t => t.id !== id);
    setTags(updatedTags);
    updateRoomSnapshot(room.id, { virtualTags: updatedTags });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="absolute inset-4 sm:inset-10 bg-zinc-900 rounded-[32px] overflow-hidden flex flex-col sm:flex-row shadow-2xl border border-white/10">
        
        {/* Left Side: The Virtual Room Image */}
        <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center min-h-[50vh]">
          {isAddingTag && !newTagPosition && (
            <div className="absolute top-6 inset-x-0 mx-auto w-fit z-20 bg-emerald-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg flex items-center gap-2 animate-pulse">
              <MapPin className="w-4 h-4" />
              Kliknij na zdjęcie, aby dodać punkt (hotspot)
            </div>
          )}

          <div className="relative max-w-full max-h-full inline-block">
            <img 
              ref={imageRef}
              src={room.photoUrl} 
              alt={room.roomName}
              className={`max-w-full max-h-full object-contain ${isAddingTag && !newTagPosition ? 'cursor-crosshair' : ''}`}
              onClick={handleImageClick}
              draggable={false}
            />
            
            {/* Render existing tags */}
            {tags.map((tag, idx) => (
              <div 
                key={tag.id}
                className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center z-10 group"
                style={{ left: `${tag.x}%`, top: `${tag.y}%` }}
              >
                <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" />
                <div className="relative w-6 h-6 bg-emerald-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-black cursor-pointer hover:scale-125 transition-transform">
                  {idx + 1}
                </div>
                
                {/* Tooltip / Details on hover */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white/95 backdrop-blur-sm text-zinc-900 px-3 py-2 rounded-2xl shadow-xl border border-white/50 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity w-48 z-20">
                  <div className="font-bold text-sm mb-1">{tag.label}</div>
                  <button 
                    onClick={(e) => handleDeleteTag(tag.id, e)}
                    className="mt-2 w-full text-xs flex items-center justify-center gap-1.5 bg-red-50 text-red-600 hover:bg-red-100 py-1.5 rounded-xl font-semibold transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Usuń ten punkt
                  </button>
                </div>
              </div>
            ))}

            {/* Render pending new tag */}
            {newTagPosition && (
              <div 
                className="absolute w-6 h-6 -ml-3 -mt-3 bg-amber-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white z-10 animate-bounce"
                style={{ left: `${newTagPosition.x}%`, top: `${newTagPosition.y}%` }}
              >
                <MapPin className="w-3 h-3" />
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Sidebar Controls */}
        <div className="w-full sm:w-[320px] md:w-[380px] bg-zinc-900 border-t sm:border-t-0 sm:border-l border-white/10 flex flex-col shrink-0 max-h-[50vh] sm:max-h-none">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                {room.roomName}
              </h2>
              <p className="text-xs text-zinc-400 mt-1">Wirtualne Mapowanie</p>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 flex-1 overflow-y-auto">
            {newTagPosition ? (
              <div className="bg-white/5 p-4 rounded-3xl border border-white/10 mb-6 animate-in slide-in-from-right">
                <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-400" />
                  Nowy punkt w pomieszczeniu
                </h4>
                <input 
                  type="text"
                  autoFocus
                  value={newTagLabel}
                  onChange={e => setNewTagLabel(e.target.value)}
                  placeholder="Co trzeba tu zrobić? (np. Umyć okno)"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 mb-3"
                  onKeyDown={e => e.key === 'Enter' && handleSaveTag()}
                />
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setNewTagPosition(null);
                      setIsAddingTag(false);
                      setNewTagLabel('');
                    }}
                    className="flex-1 py-2 rounded-xl text-zinc-400 hover:bg-white/5 text-xs font-semibold transition-colors"
                  >
                    Anuluj
                  </button>
                  <button 
                    onClick={handleSaveTag}
                    disabled={!newTagLabel.trim()}
                    className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-lg"
                  >
                    Zapisz
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setIsAddingTag(true)}
                className="w-full p-4 border border-dashed border-white/20 hover:border-emerald-500 hover:bg-emerald-500/10 rounded-3xl flex flex-col items-center justify-center text-zinc-400 hover:text-emerald-400 transition-all group mb-6"
              >
                <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-emerald-500/20 flex items-center justify-center mb-2 transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm">Dodaj nowy punkt (hotspot)</span>
                <span className="text-xs mt-1 text-center opacity-70">Zaznacz na zdjęciu sprzęt, mebel lub zadanie</span>
              </button>
            )}

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Zmapowane punkty ({tags.length})</h4>
              
              {tags.length === 0 && !newTagPosition && (
                <div className="text-center text-sm text-zinc-500 py-6">
                  Brak punktów. <br/> Zmapuj pierwsze zadanie lub obiekt w pokoju.
                </div>
              )}

              {tags.map((tag, idx) => (
                <div key={tag.id} className="bg-white/5 border border-white/5 p-3 rounded-2xl flex items-start gap-3 group hover:bg-white/10 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-200 truncate">{tag.label}</p>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Zmapowano wirtualnie</p>
                  </div>
                  <button 
                    onClick={(e) => handleDeleteTag(tag.id, e)}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-zinc-500 flex items-center justify-center transition-colors shrink-0"
                    title="Usuń punkt"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
