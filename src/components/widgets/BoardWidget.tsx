import React, { useState } from 'react';
import { useChata } from '../../context/ChataContext';
import { Send, Pin, PinOff, Trash2, MessageSquare, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export const BoardWidget: React.FC = () => {
  const { boardMessages, addBoardMessage, deleteBoardMessage, togglePinBoardMessage, currentProfile, profiles } = useChata();
  const [draft, setDraft] = useState('');

  const isAdmin = currentProfile.isAdmin || currentProfile.id === 'kamil';

  const handleSend = () => {
    if (!draft.trim()) return;
    addBoardMessage(draft);
    setDraft('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend();
  };

  return (
    <div className="bg-white rounded-[24px] border border-[#78350F]/10 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-[#78350F]/10 bg-[#FDFCF0]/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#D97706]/15 border border-[#D97706]/20 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-[#D97706]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#2D4F1E]">Tablica wiadomości</h3>
            <p className="text-[11px] text-[#78350F]/60">Kurier po 15 • wspólna, bez zadania • {boardMessages.length} wiadomości</p>
          </div>
        </div>
        <span className="text-[10px] bg-white border border-[#78350F]/10 px-2 py-1 rounded-full">Wspólna</span>
      </div>

      <div className="p-3 bg-white border-b border-[#78350F]/5 flex gap-2">
        <div className="w-8 h-8 rounded-full bg-[#2D4F1E]/10 flex items-center justify-center text-sm shrink-0">{currentProfile.avatar}</div>
        <div className="flex-1">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Napisz wiadomość jako ${currentProfile.name}... (np. Kurier po 15)`}
            rows={2}
            maxLength={280}
            className="w-full px-3 py-2 bg-[#FDFCF0] border border-[#78350F]/15 rounded-xl text-xs resize-none focus:outline-none focus:ring-2 focus:ring-[#2D4F1E]/20"
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-[#78350F]/50">{draft.length}/280 • Ctrl+Enter wyślij</span>
            <button
              onClick={handleSend}
              disabled={!draft.trim()}
              className="px-3 py-1.5 bg-[#2D4F1E] hover:bg-[#1f3715] disabled:opacity-40 text-white rounded-full text-xs font-bold flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Wyślij
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-[320px] overflow-y-auto divide-y divide-[#78350F]/5">
        {boardMessages.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#FDFCF0] border border-[#78350F]/10 flex items-center justify-center text-xl mx-auto mb-2">💬</div>
            <div className="text-xs font-bold text-[#2D4F1E]">Brak wiadomości</div>
            <div className="text-[11px] text-[#78350F]/60">Napisz pierwszą — np. „Kurier po 15, zostawić pod drzwiami”</div>
          </div>
        ) : (
          boardMessages.map(m => {
            const author = profiles.find(p => p.id === m.authorId);
            const canDelete = m.authorId === currentProfile.id || isAdmin;
            return (
              <div key={m.id} className={`p-3 flex gap-2.5 ${m.pinned ? 'bg-amber-50/70' : 'bg-white hover:bg-[#FDFCF0]/50'}`}>
                <div className="w-8 h-8 rounded-full bg-white border border-[#78350F]/10 flex items-center justify-center text-sm shrink-0">
                  {m.authorAvatar || author?.avatar || '👤'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-[#2D4F1E]">{m.authorName}</span>
                    <span className="text-[10px] text-[#78350F]/60 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {format(new Date(m.createdAt), 'd MMM HH:mm', { locale: pl })}
                    </span>
                    {m.pinned && <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1"><Pin className="w-3 h-3" /> Przypięte</span>}
                  </div>
                  <div className="text-xs text-[#2D4F1E] mt-0.5 whitespace-pre-wrap break-words">{m.content}</div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {(isAdmin || m.authorId === currentProfile.id) && (
                    <button onClick={() => togglePinBoardMessage(m.id)} className={`p-1.5 rounded-lg border ${m.pinned ? 'bg-amber-500 text-white border-amber-600' : 'bg-white border-[#78350F]/10 text-[#78350F]/60 hover:text-[#2D4F1E]'}`} title={m.pinned ? 'Odepnij' : 'Przypnij'}>
                      {m.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => deleteBoardMessage(m.id)} className="p-1.5 rounded-lg bg-white border border-red-200 text-red-500 hover:bg-red-50" title="Usuń">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
