import React, { useState } from 'react';
import { TaskOccurrence, TaskDefinition } from '../../types';
import { useChata } from '../../context/ChataContext';
import { getTaskIcon } from '../icons/CustomChataIcons';
import { getSeasonLabel } from '../../utils/recurrenceEngine';
import {
  X,
  CheckCircle2,
  Circle,
  Camera,
  MessageSquare,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  Send,
  Edit2,
  Trash2,
} from 'lucide-react';
import { ProofModal } from './ProofModal';

interface TaskDetailModalProps {
  occurrence: TaskOccurrence;
  onClose: () => void;
  onEdit?: (task: TaskDefinition) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ occurrence, onClose, onEdit }) => {
  const { currentProfile, completions, comments, addComment, toggleTaskCompletion, deleteTask } = useChata();
  const [commentText, setCommentText] = useState('');
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);

  const { task, isCompleted, completion } = occurrence;

  const taskComments = comments.filter(c => c.taskId === task.id);
  const taskHistory = completions
    .filter(c => c.taskId === task.id)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment(task.id, commentText.trim());
    setCommentText('');
  };

  const formatFrequency = (f: string) => {
    switch (f) {
      case 'daily': return 'Codziennie';
      case 'every_other_day': return 'Co drugi dzień';
      case 'twice_weekly': return '1–2× w tygodniu';
      case 'weekly': return 'Raz w tygodniu';
      case 'monthly': return 'Raz w miesiącu';
      default: return f;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-[#FDFCF0] border border-[#78350F]/20 rounded-[32px] p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#78350F]/60 hover:text-[#78350F] rounded-full hover:bg-[#78350F]/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3.5 mb-5 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-[#2D4F1E]/10 border border-[#2D4F1E]/20 flex items-center justify-center text-[#2D4F1E] shrink-0 text-xl">
            {getTaskIcon(task.name, task.category, true)}
          </div>
          <div>
            <h3 className="text-xl font-display font-bold text-[#2D4F1E] leading-tight">
              {task.name}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#78350F]/70">
              <span className="flex items-center gap-1 font-medium bg-[#78350F]/10 px-2.5 py-0.5 rounded-full">
                <MapPin className="w-3 h-3 text-[#78350F]" />
                {task.room}
              </span>
              <span className="flex items-center gap-1 font-medium bg-[#78350F]/10 px-2.5 py-0.5 rounded-full">
                <Clock className="w-3 h-3 text-[#78350F]" />
                {formatFrequency(task.frequency)}
              </span>
              {task.seasonStart && task.seasonEnd && (
                <span className="bg-[#D97706]/15 text-[#D97706] font-semibold px-2.5 py-0.5 rounded-full">
                  Sezon: {getSeasonLabel(task.seasonStart, task.seasonEnd)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Completion status toggle card */}
        <div className="bg-white border border-[#78350F]/10 rounded-2xl p-4 mb-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#78350F]/60 uppercase tracking-wider block mb-0.5">
              Status na dzień {occurrence.date}
            </span>
            {isCompleted && completion ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#2D4F1E]">
                  Wykonane przez: <span className="underline">{completion.completedByName}</span>
                </span>
                <span className="text-[11px] text-[#78350F]/50 font-mono">
                  ({new Date(completion.completedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })})
                </span>
              </div>
            ) : (
              <span className="text-sm font-semibold text-[#78350F]/80">
                Do zrobienia przez dowolnego domownika
              </span>
            )}
          </div>

          <button
            onClick={() => toggleTaskCompletion(task.id, new Date(occurrence.date))}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
              isCompleted
                ? 'bg-[#2D4F1E]/15 text-[#2D4F1E] hover:bg-[#2D4F1E]/25 border border-[#2D4F1E]/30'
                : 'bg-[#2D4F1E] text-[#FDFCF0] hover:bg-[#1f3715]'
            }`}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#2D4F1E]" />
                Odhaczone
              </>
            ) : (
              <>
                <Circle className="w-4 h-4" />
                Odhacz jako {currentProfile.name}
              </>
            )}
          </button>
        </div>

        {/* Description */}
        {task.description && (
          <div className="mb-5 glass-panel rounded-2xl p-4">
            <h4 className="text-xs font-bold text-[#78350F] mb-1">Opis i wskazówki:</h4>
            <p className="text-xs text-[#2D4F1E] leading-relaxed">{task.description}</p>
          </div>
        )}

        {/* Photo/Video Proof Button or Display */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-[#78350F] uppercase tracking-wide flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-[#78350F]" />
              Dowody wykonania (Przed / Po)
            </h4>
            <button
              onClick={() => setIsProofModalOpen(true)}
              className="text-xs font-bold text-[#D97706] hover:underline flex items-center gap-1"
            >
              + Dodaj / edytuj zdjęcia
            </button>
          </div>

          {completion && (completion.proofBeforeUrl || completion.proofAfterUrl) ? (
            <div className="grid grid-cols-2 gap-2">
              {completion.proofBeforeUrl && (
                <div className="relative rounded-xl overflow-hidden border border-[#78350F]/15">
                  <img src={completion.proofBeforeUrl} alt="Przed" className="w-full h-28 object-cover" />
                  <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    PRZED
                  </span>
                </div>
              )}
              {completion.proofAfterUrl && (
                <div className="relative rounded-xl overflow-hidden border border-[#78350F]/15">
                  <img src={completion.proofAfterUrl} alt="Po" className="w-full h-28 object-cover" />
                  <span className="absolute bottom-1 left-1 bg-[#2D4F1E] text-[#FDFCF0] text-[10px] font-bold px-1.5 py-0.5 rounded">
                    PO
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white/80 border border-dashed border-[#78350F]/20 rounded-2xl p-3 text-center text-xs text-[#78350F]/60">
              Brak dołączonych zdjęć przed/po dla tego zadania.
            </div>
          )}
        </div>

        {/* Shared Family Notes / Comments */}
        <div className="mb-5">
          <h4 className="text-xs font-bold text-[#78350F] uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-[#78350F]" />
            Wspólny notatnik domowy
          </h4>

          <div className="space-y-2 mb-3 max-h-36 overflow-y-auto pr-1">
            {taskComments.length === 0 ? (
              <p className="text-xs text-[#78350F]/50 italic">Brak notatek. Możesz zostawić wskazówkę dla reszty rodziny.</p>
            ) : (
              taskComments.map(c => (
                <div key={c.id} className="bg-white border border-[#78350F]/10 rounded-xl p-2.5 text-xs shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[#2D4F1E]">{c.authorName}</span>
                    <span className="text-[10px] text-[#78350F]/50 font-mono">
                      {new Date(c.createdAt).toLocaleDateString('pl-PL')}
                    </span>
                  </div>
                  <p className="text-[#78350F]/80">{c.content}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendComment} className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="np. Brakło płynu, dolałem wody..."
              className="flex-1 px-3.5 py-2 bg-white border border-[#78350F]/15 rounded-xl text-xs text-[#2D4F1E] focus:outline-none focus:ring-2 focus:ring-[#2D4F1E]/30"
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-[#2D4F1E] text-[#FDFCF0] rounded-xl hover:bg-[#1f3715] transition-colors"
              title="Dodaj notatkę"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#78350F]/10">
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(task);
                }}
                className="p-2 text-[#78350F] hover:text-[#2D4F1E] rounded-xl hover:bg-[#78350F]/10 transition-colors flex items-center gap-1 text-xs font-semibold"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edytuj
              </button>
            )}
            <button
              onClick={() => {
                if (window.confirm(`Usunąć zadanie „${task.name}"? Zniknie z listy i kalendarza, a jego historia wykonań zostanie skasowana.`)) {
                  deleteTask(task.id);
                  onClose();
                }
              }}
              className="p-2 text-red-600 hover:text-red-800 rounded-xl hover:bg-red-50 transition-colors flex items-center gap-1 text-xs font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Usuń
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#78350F]/10 hover:bg-[#78350F]/20 text-[#78350F] rounded-xl text-xs font-bold transition-colors"
          >
            Zamknij
          </button>
        </div>
      </div>

      {isProofModalOpen && (
        <ProofModal
          occurrence={occurrence}
          onClose={() => setIsProofModalOpen(false)}
        />
      )}
    </div>
  );
};
