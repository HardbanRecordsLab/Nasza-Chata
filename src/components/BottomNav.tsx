import React from 'react';
import { Sparkles, Calendar, ShoppingBag, Home, PieChart, Layers, ClipboardList } from 'lucide-react';
import { ChataStoveIcon } from './icons/CustomChataIcons';

export type TabType = 'today' | 'calendar' | 'shopping' | 'house' | 'plan';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  pendingCountToday?: number;
  shoppingCount?: number;
  isAdmin?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  pendingCountToday = 0,
  shoppingCount = 0,
  isAdmin = false,
}) => {
  const navItems = [
    {
      id: 'today' as TabType,
      label: 'Dashboard',
      icon: <Layers className="w-5 h-5" />,
      badge: pendingCountToday > 0 ? pendingCountToday : undefined,
      badgeColor: 'bg-[#D97706]',
    },
    {
      id: 'calendar' as TabType,
      label: 'Kalendarz',
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      id: 'shopping' as TabType,
      label: 'Zakupy & Koszyk',
      icon: <ShoppingBag className="w-5 h-5" />,
      badge: shoppingCount > 0 ? shoppingCount : undefined,
      badgeColor: 'bg-[#2D4F1E]',
    },
    {
      id: 'house' as TabType,
      label: 'Nasza Chata',
      icon: <Home className="w-5 h-5" />,
    },
    ...(isAdmin
      ? [
          {
            id: 'plan' as TabType,
            label: 'Plan Admina',
            icon: <ClipboardList className="w-5 h-5" />,
          },
        ]
      : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/85 backdrop-blur-md border-t border-[#78350F]/10 shadow-md">
      <div className="max-w-md md:max-w-xl mx-auto px-4 py-2 flex items-center justify-around">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3.5 rounded-2xl transition-all duration-150 ${
                isActive
                  ? 'text-[#2D4F1E] font-bold scale-105'
                  : 'text-[#78350F]/50 hover:text-[#2D4F1E] font-medium'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-colors ${
                  isActive ? 'bg-[#2D4F1E]/10 text-[#2D4F1E]' : 'text-[#78350F]/60'
                }`}
              >
                {item.icon}
              </div>
              <span className="text-[10px] tracking-tight font-semibold mt-0.5 uppercase">
                {item.label}
              </span>

              {item.badge !== undefined && (
                <span
                  className={`absolute top-0 right-2 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center shadow-xs ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}

              {isActive && (
                <div className="w-4 h-0.5 rounded-full bg-[#2D4F1E] mt-0.5 animate-in zoom-in-75" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
