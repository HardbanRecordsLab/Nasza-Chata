import React from 'react';
import { User, ShieldCheck } from 'lucide-react';
import { Profile } from '../../types';

interface ProfileAvatarProps {
  profile?: Profile | { name?: string; avatar?: string; photoUrl?: string; colorHex?: string; isAdmin?: boolean };
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showAdminBadge?: boolean;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  profile,
  size = 'md',
  className = '',
  showAdminBadge = false,
}) => {
  const sizeMap = {
    xs: { container: 'w-6 h-6 text-xs', icon: 'w-3 h-3', badge: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5' },
    sm: { container: 'w-8 h-8 text-sm', icon: 'w-4 h-4', badge: 'w-3 h-3 -bottom-0.5 -right-0.5' },
    md: { container: 'w-9 h-9 text-base', icon: 'w-4 h-4', badge: 'w-3.5 h-3.5 -bottom-0.5 -right-0.5' },
    lg: { container: 'w-12 h-12 text-xl', icon: 'w-6 h-6', badge: 'w-4 h-4 -bottom-1 -right-1' },
    xl: { container: 'w-16 h-16 text-3xl', icon: 'w-8 h-8', badge: 'w-5 h-5 -bottom-1 -right-1' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;
  const photoUrl = profile?.photoUrl;
  const emojiAvatar = profile?.avatar;
  const colorHex = profile?.colorHex || '#2D4F1E';
  const isAdmin = profile?.isAdmin || profile?.name === 'Kamil';

  return (
    <div className="relative inline-flex shrink-0">
      <div
        className={`${currentSize.container} rounded-full flex items-center justify-center font-medium overflow-hidden select-none border border-[#78350F]/15 ${className}`}
        style={{
          backgroundColor: photoUrl ? '#F3F4F6' : `${colorHex}25`,
          color: colorHex,
        }}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={profile?.name || 'Profil'}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback if image fails to load
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : emojiAvatar ? (
          <span className="leading-none">{emojiAvatar}</span>
        ) : (
          <User className={currentSize.icon} />
        )}
      </div>

      {showAdminBadge && isAdmin && (
        <div
          className={`absolute ${currentSize.badge} bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xs border border-white`}
          title="Administrator (Kamil)"
        >
          <ShieldCheck className="w-full h-full p-0.5 text-white" />
        </div>
      )}
    </div>
  );
};
