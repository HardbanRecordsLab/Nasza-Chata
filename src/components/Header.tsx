import React, { useState } from 'react';
import { useChata } from '../context/ChataContext';
import { ChataLogoIcon } from './icons/CustomChataIcons';
import { AlertTriangle, Plus, Bell, Smartphone, Camera, User, ChevronDown, Sparkles, ShieldCheck, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { getNotificationPermissionStatus } from '../utils/notificationService';
import { ProfileAvatar } from './common/ProfileAvatar';
import { EditProfilePhotoModal } from './modals/EditProfilePhotoModal';

interface HeaderProps {
  onOpenAddTask: () => void;
  onOpenSos: () => void;
  onOpenNotifications?: () => void;
  onOpenWidget?: () => void;
  onOpenScanHandwritten?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAddTask,
  onOpenSos,
  onOpenNotifications,
  onOpenWidget,
  onOpenScanHandwritten,
}) => {
  const { currentProfile, profiles, selectProfile, sosAlerts, notifications } = useChata();
  const [isEditPhotoModalOpen, setIsEditPhotoModalOpen] = useState(false);

  const activeSosCount = sosAlerts.filter(a => a.status === 'active').length;
  const todayFormatted = format(new Date(), 'EEEE, d MMMM', { locale: pl });
  const capitalizedToday = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);

  const permissionStatus = getNotificationPermissionStatus();
  const profileNotif = notifications[currentProfile.id];
  const isNotifActive = permissionStatus === 'granted' && (profileNotif?.webPushEnabled ?? true);
  const isAdmin = currentProfile.isAdmin || currentProfile.id === 'kamil';

  return (
    <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-md text-[#2D4F1E] border-b border-[#78350F]/10 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Logo & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-[#2D4F1E] rounded-xl flex items-center justify-center text-[#FDFCF0] shadow-sm shrink-0">
            <ChataLogoIcon size={24} animate={true} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-display font-bold tracking-tight text-[#2D4F1E] truncate">
                Nasza Chata
              </h1>
              <span className="hidden sm:inline-block bg-[#2D4F1E]/10 text-[#2D4F1E] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-[#2D4F1E]/15">
                Dom & Ogród
              </span>
            </div>
            <p className="text-[11px] text-[#78350F]/70 font-medium truncate">
              {capitalizedToday}
            </p>
          </div>
        </div>

        {/* Right Section: Scan + Widget + Notifications + Profile Switcher + SOS + Add */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Scan Handwritten Chores with Vision AI */}
          {onOpenScanHandwritten && (
            <button
              onClick={onOpenScanHandwritten}
              className="px-2.5 sm:px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-[#D97706]/30 text-[#78350F] font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs group"
              title="Skanuj odręczną kartkę z lodówki (AI Vision)"
            >
              <Camera className="w-4 h-4 text-[#D97706] group-hover:scale-110 transition-transform" />
              <span className="hidden lg:inline text-[#2D4F1E]">Skanuj kartkę</span>
              <span className="hidden sm:inline-flex px-1.5 py-0.2 bg-[#D97706] text-white text-[9px] font-bold rounded-full">
                AI
              </span>
            </button>
          )}

          {/* PWA Home Screen Widget Button */}
          {onOpenWidget && (
            <button
              onClick={onOpenWidget}
              className="p-2 rounded-full bg-white hover:bg-[#D97706]/10 border border-[#78350F]/15 text-[#78350F] hover:text-[#D97706] transition-colors shadow-2xs"
              title="Widżet na pulpit & Ekran główny"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          )}

          {/* Web Push Notifications Button */}
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="p-2 rounded-full bg-white hover:bg-[#2D4F1E]/10 border border-[#78350F]/15 text-[#2D4F1E] transition-colors shadow-2xs relative"
              title="Ustawienia powiadomień Push"
            >
              <Bell className="w-4 h-4" />
              {isNotifActive ? (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
              ) : (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
              )}
            </button>
          )}

          {/* Active Profile Switcher Quick Avatars */}
          <div className="flex items-center gap-1 bg-white/80 p-1 rounded-full border border-[#78350F]/10 shadow-2xs">
            {profiles.map(p => {
              const isSelected = p.id === currentProfile.id;
              const isProfileAdmin = p.isAdmin || p.id === 'kamil';
              return (
                <button
                  key={p.id}
                  onClick={() => selectProfile(p)}
                  className={`rounded-full p-0.5 transition-all relative group ${
                    isSelected
                      ? 'ring-2 ring-[#D97706] scale-105 shadow-xs'
                      : 'opacity-75 hover:opacity-100 hover:scale-105'
                  }`}
                  title={`Przełącz na: ${p.name} (${p.roleTitle})${isProfileAdmin ? ' • ADMIN' : ''}`}
                >
                  <ProfileAvatar
                    profile={p}
                    size="sm"
                    showAdminBadge={isProfileAdmin}
                  />
                </button>
              );
            })}
          </div>

          <div className="h-6 w-px bg-[#78350F]/15 hidden xs:block" />

          {/* Active Profile Label & Photo Edit Trigger */}
          <button
            onClick={() => setIsEditPhotoModalOpen(true)}
            className="text-right hidden sm:flex flex-col items-end hover:bg-white/60 px-2 py-1 rounded-xl transition-colors group cursor-pointer"
            title="Kliknij, aby zmienić własne zdjęcie profilowe lub dane"
          >
            <div className="flex items-center gap-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#78350F]/60">
                Profil
              </p>
              {isAdmin && (
                <span className="bg-blue-100 text-blue-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border border-blue-200">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-[#2D4F1E] leading-tight group-hover:text-[#D97706] flex items-center gap-1">
              <span>{currentProfile.name}</span>
              <Camera className="w-3 h-3 text-[#78350F]/50 group-hover:text-[#D97706]" />
            </p>
          </button>

          {/* Panel Zarządzania — tylko admin, widoczny w headerze */}
          {isAdmin && (
            <a
              href="?tab=plan"
              className="hidden sm:inline-flex px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs items-center gap-1.5 shadow-xs"
              title="Panel Zarządzania — przydziały i plan tygodniowy"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Zarządzanie</span>
            </a>
          )}

          {/* SOS Button */}
          <button
            onClick={onOpenSos}
            className={`px-2.5 sm:px-3 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs ${
              activeSosCount > 0
                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                : 'bg-red-50 hover:bg-red-100 text-red-800 border border-red-200'
            }`}
            title="Zgłoś awarię w domu"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            <span className="hidden md:inline">Awaria SOS</span>
            {activeSosCount > 0 && (
              <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {activeSosCount}
              </span>
            )}
          </button>

          {/* Quick Add Chore */}
          <button
            onClick={onOpenAddTask}
            className="px-3.5 sm:px-4 py-1.5 rounded-full bg-[#2D4F1E] hover:bg-[#1f3715] text-[#FDFCF0] font-bold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
            title="Dodaj nowy obowiązek"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Dodaj</span>
          </button>
        </div>
      </div>

      {isEditPhotoModalOpen && (
        <EditProfilePhotoModal
          profileToEdit={currentProfile}
          onClose={() => setIsEditPhotoModalOpen(false)}
        />
      )}
    </header>
  );
};



