import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  animate?: boolean;
}

// 1. Chata Logo
export const ChataLogoIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24, animate = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Chimney smoke */}
    <path
      d="M22 6C22 6 23 4.5 22 3.5C21 2.5 22.5 1.5 22.5 1.5"
      className={animate ? 'anim-flame' : ''}
      strokeWidth="1.75"
      strokeDasharray="2 1"
    />
    <path d="M20 7V10" />
    {/* Roof */}
    <path d="M4 14L16 4L28 14" strokeWidth="2.5" />
    {/* House walls */}
    <path d="M6 13V27C6 27.55 6.45 28 7 28H25C25.55 28 26 27.55 26 27V13" />
    {/* Door */}
    <path d="M13 28V19C13 18.45 13.45 18 14 18H18C18.55 18 19 18.45 19 19V28" />
    {/* Window */}
    <circle cx="16" cy="11" r="2.5" />
    <path d="M16 8.5V13.5M13.5 11H18.5" strokeWidth="1.25" />
  </svg>
);

// 2. Siekiera (Axe / Wood cut)
export const AxeIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size = 20, animate = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${className} ${animate ? 'anim-basket' : ''}`}
  >
    {/* Axe Handle */}
    <path d="M4 20L15 9" strokeWidth="2.2" />
    <path d="M3 21L5 19" />
    {/* Axe Head */}
    <path d="M15 9L18 6C19.5 4.5 21.5 5 21.5 5C21.5 5 22 7 20.5 8.5L17.5 11.5L15 9Z" fill="currentColor" fillOpacity="0.15" />
    <path d="M13.5 7.5L16.5 4.5" strokeWidth="1.5" />
  </svg>
);

// 3. Polana drewna (Firewood / Bring wood)
export const FirewoodIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size = 20, animate = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Log 1 Bottom Left */}
    <ellipse cx="6" cy="17" rx="3" ry="4" transform="rotate(-30 6 17)" fill="currentColor" fillOpacity="0.1" />
    <path d="M6 13L18 6M6 21L18 14" />
    <ellipse cx="18" cy="10" rx="3" ry="4" transform="rotate(-30 18 10)" />
    {/* Log 2 Top */}
    <ellipse cx="11" cy="7" rx="2.5" ry="3.5" transform="rotate(-30 11 7)" fill="currentColor" fillOpacity="0.1" />
  </svg>
);

// 4. Płomień (Flame / Stove cleaning)
export const FlameIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size = 20, animate = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${className} ${animate ? 'anim-flame' : ''}`}
  >
    <path
      d="M12 2C9 7 6 9.5 6 14C6 17.3 8.7 20 12 20C15.3 20 18 17.3 18 14C18 10.5 15.5 8 15 5C14 7 13 8 11.5 8C10.5 8 9.5 7 10 5C10.5 3 12 2 12 2Z"
      fill="currentColor"
      fillOpacity="0.15"
    />
    <path d="M12 18C10.5 18 9.5 16.8 9.5 15.2C9.5 13.5 11 12 12 10.5C13 12 14.5 13.5 14.5 15.2C14.5 16.8 13.5 18 12 18Z" fill="currentColor" fillOpacity="0.3" />
  </svg>
);

// 5. Źdźbła trawy (Grass / Lawn mow)
export const GrassIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size = 20, animate = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${className} ${animate ? 'anim-grass' : ''}`}
  >
    {/* Ground base */}
    <path d="M2 21H22" strokeWidth="2.5" />
    {/* Blade 1 */}
    <path d="M6 21C6 14 3 8 3 8C3 8 9 11 10 21" fill="currentColor" fillOpacity="0.1" />
    {/* Blade 2 (Center tall) */}
    <path d="M12 21C12 11 15 4 15 4C15 4 17 11 16 21" fill="currentColor" fillOpacity="0.15" />
    {/* Blade 3 (Right) */}
    <path d="M18 21C18 15 21 10 21 10C21 10 18 16 16 21" />
  </svg>
);

// 6. Konewka (Watering can / Plants)
export const WateringCanIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size = 20, animate = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Can body */}
    <path d="M6 10H14V19C14 19.5 13.5 20 13 20H7C6.5 20 6 19.5 6 19V10Z" fill="currentColor" fillOpacity="0.1" />
    {/* Handle */}
    <path d="M6 12C4 12 3 14 3 16C3 18 4 19 6 19" />
    {/* Spout */}
    <path d="M14 14L19 9" strokeWidth="2" />
    <path d="M18 8L20 10" />
    {/* Water drops */}
    <circle cx="21" cy="6" r="0.8" className={animate ? 'anim-drip' : ''} fill="currentColor" />
    <circle cx="22" cy="9" r="0.8" className={animate ? 'anim-drip' : ''} fill="currentColor" />
  </svg>
);

// 7. Odkurzacz (Vacuum cleaner)
export const VacuumIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size = 20, animate = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Vacuum Head / Foot */}
    <path d="M15 20H21C21.55 20 22 19.55 22 19V18H14V19C14 19.55 14.45 20 15 20Z" fill="currentColor" fillOpacity="0.2" />
    {/* Wand */}
    <path d="M18 18L18 8L13 4" strokeWidth="2" />
    {/* Main body & canister */}
    <rect x="3" y="11" width="7" height="9" rx="3.5" fill="currentColor" fillOpacity="0.1" />
    <circle cx="6.5" cy="15.5" r="2" />
    {/* Hose curve */}
    <path d="M6.5 11C6.5 6 11 4 13 4" />
  </svg>
);

// 8. Mop i wiadro (Mop & Bucket / Floor cleaning)
export const MopIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size = 20, animate = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Mop Stick */}
    <path d="M18 3L9 16" strokeWidth="2" />
    {/* Mop Head */}
    <path d="M7 16L11 19L8 22L5 20L7 16Z" fill="currentColor" fillOpacity="0.2" />
    <path d="M6 18L4 21M9 19L8 22" />
    {/* Bucket on side */}
    <path d="M15 13L16 21H21L22 13H15Z" />
    <path d="M16 13C16 10 21 10 21 13" strokeWidth="1.5" />
    {/* Water drop */}
    <circle cx="12" cy="20" r="0.75" className={animate ? 'anim-drip' : ''} fill="currentColor" />
  </svg>
);

// 9. Ścierka / Pyłek (Dusting cloth)
export const DustingIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size = 20, animate = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Duster / cloth wave */}
    <path d="M4 14C5 12 7 11 9 12C11 13 13 11 15 12C17 13 19 11 20 13C21 15 19 18 16 19C13 20 8 19 5 18C3.5 17.5 3 15.5 4 14Z" fill="currentColor" fillOpacity="0.15" />
    <path d="M16 12L20 4" strokeWidth="2" />
    {/* Sparkle sparkles */}
    <path d="M7 6L7 8M6 7L8 7" strokeWidth="1.5" />
    <path d="M12 4L12 6M11 5L13 5" strokeWidth="1.5" />
    <path d="M4 10L4 11M3.5 10.5L4.5 10.5" strokeWidth="1.5" />
  </svg>
);

// 10. Naczynia & Piana (Dishes)
export const DishesIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size = 20, animate = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Large Plate */}
    <ellipse cx="10" cy="14" rx="7" ry="5" fill="currentColor" fillOpacity="0.1" />
    <ellipse cx="10" cy="14" rx="4" ry="2.5" />
    {/* Cup next to plate */}
    <path d="M16 11V17C16 18 17 19 18.5 19C20 19 21 18 21 17V11H16Z" fill="currentColor" fillOpacity="0.15" />
    <path d="M21 13C22 13 22.5 14 22.5 15C22.5 16 22 17 21 17" />
    {/* Suds Bubbles */}
    <circle cx="8" cy="8" r="1.5" className={animate ? 'anim-float' : ''} />
    <circle cx="12" cy="7" r="1" className={animate ? 'anim-float' : ''} />
    <circle cx="15" cy="8.5" r="1.2" className={animate ? 'anim-float' : ''} />
  </svg>
);

// 11. Koszyk zakupowy (Shopping cart)
export const ShoppingBasketIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size = 20, animate = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${className} ${animate ? 'anim-basket' : ''}`}
  >
    {/* Basket body */}
    <path d="M4 10H20L18 20H6L4 10Z" fill="currentColor" fillOpacity="0.12" />
    {/* Basket handle */}
    <path d="M7 10C7 5.5 17 5.5 17 10" strokeWidth="2" />
    {/* Slits */}
    <path d="M9 13V17M12 13V17M15 13V17" strokeWidth="1.5" />
  </svg>
);

// 12. Łóżko (Bedding / Laundry)
export const BedIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size = 20, animate = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Headboard */}
    <path d="M3 7V20M21 12V20" strokeWidth="2.2" />
    {/* Bed Mattress */}
    <path d="M3 15H21V18H3V15Z" fill="currentColor" fillOpacity="0.15" />
    {/* Pillow */}
    <rect x="5" y="10" width="5" height="4" rx="1.5" />
    {/* Blanket fold */}
    <path d="M12 15C12 12 14 12 21 12" />
  </svg>
);

// 13. Lodówka (Fridge)
export const FridgeIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size = 20, animate = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Fridge outer */}
    <rect x="5" y="3" width="14" height="18" rx="2.5" fill="currentColor" fillOpacity="0.08" />
    {/* Top freezer divider */}
    <path d="M5 9H19" strokeWidth="2" />
    {/* Freezer handle */}
    <path d="M8 5.5V7.5" strokeWidth="2.2" strokeLinecap="round" />
    {/* Fridge handle */}
    <path d="M8 11.5V15.5" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

// 14. Schody (Stairs)
export const StairsIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size = 20, animate = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 19H8V15H12V11H16V7H20" strokeWidth="2.2" />
    <path d="M4 19V21M20 7V21M4 21H20" strokeWidth="1.5" />
    <path d="M8 15V19M12 11V19M16 7V19" strokeWidth="1" strokeDasharray="1 1" />
  </svg>
);

// 15. Ganek / Drzwi (Porch)
export const PorchIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size = 20, animate = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Porch canopy roof */}
    <path d="M3 9L12 4L21 9" strokeWidth="2.2" />
    <path d="M6 9V20M18 9V20" strokeWidth="2" />
    {/* Door */}
    <rect x="9" y="10" width="6" height="10" rx="1" fill="currentColor" fillOpacity="0.1" />
    <circle cx="13.5" cy="15" r="0.75" />
    {/* Steps */}
    <path d="M4 20H20" strokeWidth="2.5" />
  </svg>
);

// 16. Przygotowanie ogródka / Grabie & Grządki (Garden prep)
export const GardenPrepIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size = 20, animate = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Garden Bed */}
    <path d="M3 16C5 15 7 15 9 16C11 17 13 17 15 16C17 15 19 15 21 16" strokeWidth="2" />
    <path d="M3 20C5 19 7 19 9 20C11 21 13 21 15 20C17 19 19 19 21 20" strokeWidth="2" />
    {/* Sprout */}
    <path d="M12 16V9" strokeWidth="2" />
    <path d="M12 11C10 9 8 10 8 10C8 10 9 13 12 12" fill="currentColor" fillOpacity="0.2" />
    <path d="M12 9C14 7 16 8 16 8C16 8 15 11 12 10" fill="currentColor" fillOpacity="0.2" />
  </svg>
);

// 17. Pokój dziecięcy / Zabawki Olivii
export const ToyBoxIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size = 20, animate = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Box */}
    <rect x="4" y="9" width="16" height="12" rx="2" fill="currentColor" fillOpacity="0.1" />
    {/* Open Lid */}
    <path d="M3 9L12 6L21 9" strokeWidth="2" />
    {/* Star inside */}
    <path d="M12 12L13 14H15L13.5 15.5L14 17.5L12 16L10 17.5L10.5 15.5L9 14H11L12 12Z" fill="currentColor" />
  </svg>
);

// 18. SOS / Awaria
export const SosIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size = 20, animate = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${className} ${animate ? 'animate-bounce' : ''}`}
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="#EF4444" fillOpacity="0.2" stroke="#DC2626" strokeWidth="2.2" />
    <line x1="12" y1="9" x2="12" y2="13" stroke="#DC2626" strokeWidth="2.5" />
    <circle cx="12" cy="17" r="1.2" fill="#DC2626" stroke="none" />
  </svg>
);

/**
 * Helper to select the exact hand-crafted icon for any task.
 */
export function getTaskIcon(taskName: string, category: string, animate: boolean = false): React.ReactNode {
  const lower = taskName.toLowerCase();

  if (lower.includes('cięcie drewna') || lower.includes('rąbanie')) {
    return <AxeIcon animate={animate} />;
  }
  if (lower.includes('przynoszenie drewna') || lower.includes('polana')) {
    return <FirewoodIcon animate={animate} />;
  }
  if (lower.includes('piec') || lower.includes('palenisko')) {
    return <FlameIcon animate={animate} />;
  }
  if (lower.includes('koszenie') || lower.includes('traw')) {
    return <GrassIcon animate={animate} />;
  }
  if (lower.includes('ogród') || lower.includes('grządk')) {
    return <GardenPrepIcon animate={animate} />;
  }
  if (lower.includes('kwiat') || lower.includes('roślin')) {
    return <WateringCanIcon animate={animate} />;
  }
  if (lower.includes('zakup')) {
    return <ShoppingBasketIcon animate={animate} />;
  }
  if (lower.includes('odkurzanie')) {
    return <VacuumIcon animate={animate} />;
  }
  if (lower.includes('schody')) {
    return <StairsIcon animate={animate} />;
  }
  if (lower.includes('ganek') || lower.includes('wiatrołap')) {
    return <PorchIcon animate={animate} />;
  }
  if (lower.includes('podłog') || lower.includes('kuchni') || lower.includes('łazienk')) {
    return <MopIcon animate={animate} />;
  }
  if (lower.includes('kurz') || lower.includes('półek')) {
    return <DustingIcon animate={animate} />;
  }
  if (lower.includes('olivi') || lower.includes('zabawek')) {
    return <ToyBoxIcon animate={animate} />;
  }
  if (lower.includes('lodówk')) {
    return <FridgeIcon animate={animate} />;
  }
  if (lower.includes('pościel') || lower.includes('pranie')) {
    return <BedIcon animate={animate} />;
  }
  if (lower.includes('naczynia') || lower.includes('zmywanie')) {
    return <DishesIcon animate={animate} />;
  }

  // Fallback by category
  switch (category) {
    case 'wood': return <FirewoodIcon animate={animate} />;
    case 'stove': return <FlameIcon animate={animate} />;
    case 'garden': return <GrassIcon animate={animate} />;
    case 'plants': return <WateringCanIcon animate={animate} />;
    case 'shopping': return <ShoppingBasketIcon animate={animate} />;
    case 'dishes': return <DishesIcon animate={animate} />;
    case 'laundry': return <BedIcon animate={animate} />;
    case 'seasonal': return <GrassIcon animate={animate} />;
    case 'maintenance': return <AxeIcon animate={animate} />;
    case 'occasional': return <ShoppingBasketIcon animate={animate} />;
    case 'administrative': return <AxeIcon animate={animate} />;
    case 'organizational': return <ShoppingBasketIcon animate={animate} />;
    case 'cleaning': return <MopIcon animate={animate} />;
    default: return <ChataLogoIcon animate={animate} />;
  }
}

export const ChataFlameIcon = FlameIcon;
export const ChataWoodLogIcon = FirewoodIcon;
export const ChataStoveIcon = FlameIcon;
export const ChataChainsawIcon = AxeIcon;
export const ChataMowerIcon = GrassIcon;
