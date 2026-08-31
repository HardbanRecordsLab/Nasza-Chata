import React, { useState } from 'react';
import { X, Send, Sparkles, Bot, User, Loader2 } from 'lucide-react';
import { useChata } from '../../context/ChataContext';

interface AiAssistantModalProps {
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({ onClose }) => {
  const { currentProfile, tasks, woodInventory, equipment } = useChata();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: `Cześć ${currentProfile.name}! Jestem asystentem domowym Naszej Chaty 🏡. Mogę doradzić w sprawie palenia w piecu, pielęgnacji ogrodu, zapasu drewna (aktualnie ${woodInventory.estimatedM3} m³ w drewutni), planowania zakupów czy rozłożenia domowych obowiązków. W czym mogę pomóc?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    const history = messages.slice(-8).map(m => ({ role: m.role, text: m.text }));
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai?action=chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, history }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply || 'Nie otrzymałem odpowiedzi.' }]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: 'Przepraszam, wystąpił problem z połączeniem z asystentem Gemini.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    '🪵 Na ile dni starczy nam zapas drewna w drewutni?',
    '🔥 Jak prawidłowo palić w piecu metodą od góry?',
    '🌿 Kiedy najlepiej kosić trawę przed deszczem?',
    '🔧 Kiedy wypada najbliższy przegląd pieca i kominiarza?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-[#FDFCF0] border border-[#78350F]/20 rounded-[32px] w-full max-w-lg shadow-2xl flex flex-col h-[85vh] relative overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#2D4F1E] text-[#FDFCF0] flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#D97706]/20 border border-[#D97706]/40 flex items-center justify-center text-[#D97706]">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-display font-bold">
                Asystent Domowy Gemini AI
              </h3>
              <p className="text-[10px] text-[#FDFCF0]/80">
                Połączony z bazą wiedzy Naszej Chaty
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#FDFCF0]/80 hover:text-[#FDFCF0] rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-[#2D4F1E] text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-[#D97706]" />
                </div>
              )}
              <div
                className={`p-3 rounded-2xl text-xs max-w-[82%] leading-relaxed shadow-2xs ${
                  m.role === 'user'
                    ? 'bg-[#2D4F1E] text-[#FDFCF0] rounded-tr-xs'
                    : 'bg-white text-[#2D4F1E] border border-[#78350F]/15 rounded-tl-xs whitespace-pre-wrap'
                }`}
              >
                {m.text}
              </div>
              {m.role === 'user' && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 ring-1"
                  style={{ backgroundColor: `${currentProfile.colorHex}30`, borderColor: currentProfile.colorHex }}
                >
                  {currentProfile.avatar}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5 items-center text-[#78350F]/70 text-xs italic">
              <Loader2 className="w-4 h-4 animate-spin text-[#2D4F1E]" />
              <span>Asystent Chaty pisze odpowiedź...</span>
            </div>
          )}
        </div>

        {/* Quick prompt chips */}
        <div className="px-4 py-2 bg-[#78350F]/5 border-t border-[#78350F]/10 flex gap-1.5 overflow-x-auto">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInput(q);
              }}
              className="px-2.5 py-1 bg-white hover:bg-[#D97706]/10 text-[11px] font-medium text-[#78350F] rounded-full border border-[#78350F]/15 whitespace-nowrap shrink-0 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-[#78350F]/10 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Zadaj pytanie asystentowi domu..."
            className="flex-1 px-3.5 py-2.5 bg-[#FDFCF0] border border-[#78350F]/20 rounded-xl text-xs font-medium text-[#2D4F1E] focus:outline-none focus:ring-2 focus:ring-[#2D4F1E]/40"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 bg-[#2D4F1E] hover:bg-[#1f3715] disabled:opacity-50 text-[#FDFCF0] rounded-xl text-xs font-bold flex items-center gap-1 shadow-md transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
