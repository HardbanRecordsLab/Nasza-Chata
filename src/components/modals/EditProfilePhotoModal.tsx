import React, { useState, useRef } from 'react';
import { useChata } from '../../context/ChataContext';
import { Profile } from '../../types';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { X, Camera, Upload, Trash2, ShieldCheck, UserCheck, Lock, Check } from 'lucide-react';

interface EditProfilePhotoModalProps {
  profileToEdit?: Profile;
  onClose: () => void;
}

export const EditProfilePhotoModal: React.FC<EditProfilePhotoModalProps> = ({
  profileToEdit,
  onClose,
}) => {
  const { currentProfile, profiles, updateProfile, showToast } = useChata();
  const targetProfile = profileToEdit || currentProfile;

  const [selectedPhoto, setSelectedPhoto] = useState<string>(targetProfile.photoUrl || '');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(targetProfile.avatar || '👨‍🌾');
  const [roleTitle, setRoleTitle] = useState<string>(targetProfile.roleTitle || '');
  const [pin, setPin] = useState<string>(targetProfile.pin || '');
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentProfile.isAdmin || currentProfile.id === 'kamil';
  const isEditingAdmin = targetProfile.id === 'kamil';

  const defaultEmojis = ['👨‍🌾', '👩‍🌾', '👧', '👦', '🏡', '🌲', '🪵', '🛠️', '🌿', '🐱', '🐶', '🔥'];

  // Presets of lovely photo avatars
  const photoPresets = [
    { label: 'Gospodarz', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80' },
    { label: 'Organizatorka', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80' },
    { label: 'Córka', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80' },
    { label: 'Natura & Ogród', url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=300&auto=format&fit=crop&q=80' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      showToast('Zdjęcie za duże', 'Maksymalny rozmiar to 8MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedPhoto(reader.result as string);
      showToast('Wczytano zdjęcie', 'Pamiętaj kliknąć "Zapisz zmiany".', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setIsSaving(true);
    updateProfile(targetProfile.id, {
      photoUrl: selectedPhoto || undefined,
      avatar: selectedAvatar,
      roleTitle: roleTitle.trim() || targetProfile.roleTitle,
      pin: pin.trim() || targetProfile.pin,
    });
    setIsSaving(false);
    onClose();
  };

  const handleRemovePhoto = () => {
    setSelectedPhoto('');
    showToast('Usunięto zdjęcie', 'Przywrócono domyślną ikonę emoji.', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-[#FDFCF0] border border-[#78350F]/20 rounded-[32px] p-6 w-full max-w-md shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#78350F]/60 hover:text-[#78350F] rounded-full hover:bg-[#78350F]/10 transition-colors"
          title="Zamknij"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-[#2D4F1E]/10 border border-[#2D4F1E]/20 flex items-center justify-center text-[#2D4F1E]">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-display font-bold text-[#2D4F1E]">
                Zdjęcie profilowe: {targetProfile.name}
              </h3>
              {isEditingAdmin && (
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-blue-200">
                  <ShieldCheck className="w-3 h-3 text-blue-600" /> Admin
                </span>
              )}
            </div>
            <p className="text-xs text-[#78350F]/70">
              Wgraj własne zdjęcie z aparatu/galerii lub wybierz ikonę.
            </p>
          </div>
        </div>

        {/* Avatar Live Preview */}
        <div className="bg-white rounded-2xl p-4 border border-[#78350F]/10 shadow-xs flex flex-col items-center justify-center text-center mb-5">
          <div className="relative mb-3">
            <ProfileAvatar
              profile={{
                ...targetProfile,
                photoUrl: selectedPhoto,
                avatar: selectedAvatar,
              }}
              size="xl"
              showAdminBadge={isEditingAdmin}
              className="ring-4 ring-[#2D4F1E]/15 shadow-md"
            />

            {selectedPhoto && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute -top-1 -right-1 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-xs transition-colors"
                title="Usuń zdjęcie"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <p className="text-sm font-bold text-[#2D4F1E]">{targetProfile.name}</p>
          <p className="text-xs text-[#78350F]/70">{roleTitle || targetProfile.roleTitle}</p>
        </div>

        {/* Upload buttons */}
        <div className="space-y-4 mb-5">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="py-2.5 px-3 rounded-xl bg-[#2D4F1E] hover:bg-[#1f3715] text-[#FDFCF0] font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span>Zrób zdjęcie</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-3 rounded-xl bg-white hover:bg-amber-50 text-[#78350F] border border-[#78350F]/20 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition-colors"
            >
              <Upload className="w-4 h-4 text-[#D97706]" />
              <span>Wgraj z pliku</span>
            </button>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Quick Preset Photos */}
          <div>
            <label className="block text-[11px] font-bold text-[#78350F] uppercase tracking-wider mb-1.5">
              Gotowe propozycje zdjęć:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {photoPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedPhoto(preset.url)}
                  className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all group ${
                    selectedPhoto === preset.url
                      ? 'border-[#2D4F1E] ring-2 ring-[#2D4F1E]/30 scale-105'
                      : 'border-transparent hover:border-[#D97706]/40 opacity-80 hover:opacity-100'
                  }`}
                  title={preset.label}
                >
                  <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                  {selectedPhoto === preset.url && (
                    <div className="absolute inset-0 bg-[#2D4F1E]/40 flex items-center justify-center text-white">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Fallback Emoji Picker */}
          <div>
            <label className="block text-[11px] font-bold text-[#78350F] uppercase tracking-wider mb-1.5">
              Lub wybierz ikonę Emoji:
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-[#78350F]/15">
              {defaultEmojis.map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedAvatar(emoji);
                    setSelectedPhoto(''); // clear custom photo if clicking emoji
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-transform ${
                    selectedAvatar === emoji && !selectedPhoto
                      ? 'bg-[#D97706]/20 border border-[#D97706] scale-110 font-bold'
                      : 'hover:bg-amber-50'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Edit Role Title */}
          <div>
            <label className="block text-xs font-bold text-[#78350F] mb-1">
              Rola / Funkcja w domu:
            </label>
            <input
              type="text"
              value={roleTitle}
              onChange={e => setRoleTitle(e.target.value)}
              placeholder="np. Gospodarz, Organizatorka, Córka..."
              className="w-full p-2.5 bg-white border border-[#78350F]/20 rounded-xl text-xs text-[#2D4F1E] focus:outline-none focus:ring-2 focus:ring-[#2D4F1E]/30"
            />
          </div>

          {/* Edit PIN (Optional) */}
          <div>
            <label className="block text-xs font-bold text-[#78350F] mb-1 flex items-center gap-1">
              <Lock className="w-3 h-3 text-[#78350F]" />
              Kod PIN (4 cyfry):
            </label>
            <input
              type="text"
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="np. 1482"
              className="w-full p-2.5 bg-white border border-[#78350F]/20 rounded-xl text-xs font-mono font-bold text-[#2D4F1E] tracking-widest focus:outline-none focus:ring-2 focus:ring-[#2D4F1E]/30"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 border-t border-[#78350F]/10">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#78350F]/20 text-[#78350F] text-xs font-semibold hover:bg-[#78350F]/10 transition-colors"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-2.5 rounded-xl bg-[#2D4F1E] hover:bg-[#1f3715] text-[#FDFCF0] text-xs font-bold shadow-md transition-all active:scale-98"
          >
            Zapisz zmiany
          </button>
        </div>
      </div>
    </div>
  );
};
