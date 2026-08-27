export type ProfileName = 'Kamil' | 'Ilona' | 'Olivia';

export interface Profile {
  id: string;
  name: ProfileName | string;
  colorHex: string;
  bgColor: string;
  textColor: string;
  avatar: string;
  photoUrl?: string;
  roleTitle: string;
  pin?: string;
  isAdmin?: boolean;
}

export type FrequencyType =
  | 'daily'
  | 'every_other_day'
  | 'twice_weekly'
  | 'weekly'
  | 'monthly';

export type TaskCategory =
  | 'wood'
  | 'stove'
  | 'garden'
  | 'cleaning'
  | 'shopping'
  | 'maintenance'
  | 'seasonal'
  | 'dishes'
  | 'laundry'
  | 'plants'
  | 'occasional'
  | 'administrative'
  | 'organizational'
  | 'custom';

export interface TaskDefinition {
  id: string;
  name: string;
  category: TaskCategory;
  frequency: FrequencyType;
  seasonStart: number | null; // 1 (Jan) - 12 (Dec)
  seasonEnd: number | null;   // 1 - 12 (can wrap across year e.g. 10 to 3)
  isCustom: boolean;
  room: string;
  defaultOrder: number;
  assignedTo?: string | null; // Profile ID or null (Admin Kamil assigns)
  assignedToName?: string | null;
  weatherSensitive?: boolean;
  description?: string;
  iconName?: string;
  createdAt: string;
  archivedAt: string | null;
}

export interface TaskCompletion {
  id: string;
  taskId: string;
  periodKey: string; // e.g. '2026-08-24' or '2026-W34-1' or '2026-08'
  completedById: string;
  completedByName: string;
  completedAt: string;
  proofBeforeUrl?: string;
  proofAfterUrl?: string;
  proofType?: 'photo' | 'video';
  proofNote?: string;
  notes?: string;
}

export interface TaskOccurrence {
  task: TaskDefinition;
  date: string; // YYYY-MM-DD
  periodKey: string;
  isCompleted: boolean;
  completion?: TaskCompletion;
  isOverdue: boolean;
  isSeasonalActive: boolean;
  twiceWeeklyPart?: 1 | 2;
  twiceWeeklyCount?: number;
  daysSinceLastCompleted: number;
  cleanlinessScore: number; // 0 = spotless (green), 100 = urgent dirty (red)
  suggestedPriority: number;
}

export interface Expense {
  id: string;
  amount: number;
  note: string;
  category: string;
  date: string; // YYYY-MM-DD
  boughtById: string;
  boughtByName: string;
  receiptPhotoUrl?: string;
  createdAt: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  quantity?: string;
  isBought: boolean;
  boughtById?: string;
  boughtByName?: string;
  estimatedPrice?: number;
  addedById: string;
  addedByName: string;
  createdAt: string;
}

export interface InStoreCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

export interface WoodInventory {
  estimatedM3: number;
  totalCapacityM3: number;
  lastCutDate: string;
  logsInBoilerRoom: number;
  dailyBurnRateWinterM3: number;
  updatedAt: string;
  woodTypes?: string[];
  seasonedStatus?: string;
}

export interface EquipmentItem {
  id: string;
  name: string;
  category: string;
  room: string;
  purchaseDate?: string;
  warrantyEndDate?: string;
  lastServiceDate?: string;
  nextServiceDate?: string;
  modelNumber?: string;
  manualNotes?: string;
  photoUrl?: string;
}

export interface RoomTag {
  id: string;
  x: number;
  y: number;
  label: string;
  taskId?: string;
  targetEntryId?: string; // walk-in navigation: hotspot leads to another viewpoint
  confidence?: number; // 0..1 auto detection confidence
  auto?: boolean; // true if auto-generated via CPU matching
}

export interface RoomSnapshot {
  id: string;
  roomId?: string;
  roomName: string;
  zone?: 'ground' | 'upper' | 'garden';
  angleName?: string;
  photoUrl: string;
  capturedAt: string;
  capturedById: string;
  capturedByName?: string;
  caption?: string;
  description?: string;
  virtualTags?: RoomTag[];
}

export type VisualZoneType = 'room' | 'garden' | 'utility';

export interface ViewpointLink {
  id: string;
  sourceEntryId: string;
  targetEntryId: string;
  confidence: number; // 0..1
  auto?: boolean;
  createdAt: string;
}

export interface SpaceVersion {
  version: number;
  createdAt: string;
  createdById: string;
  createdByName?: string;
  linksCount: number;
  entriesCount: number;
  hotspotsCount: number;
  note?: string;
  linksSnapshot?: ViewpointLink[];
}

export type JobStatus = 'queued' | 'analyzing' | 'extracting' | 'finding-viewpoints' | 'building-graph' | 'creating-hotspots' | 'stitching' | 'ready' | 'failed';

export interface ProcessingJob {
  id: string;
  zoneId: string;
  type: 'walkin' | 'panorama' | 'update';
  status: JobStatus;
  progress: number; // 0..100
  createdAt: string;
  updatedAt: string;
  result?: any;
  error?: string;
}

export interface VisualZone {
  id: string;
  name: string;
  zoneType: VisualZoneType;
  referenceEntryId?: string;
  captureAngles?: string[];
  entries: VisualEntry[];
  viewpointLinks?: ViewpointLink[]; // walk-in graph edges
  walkinVersion?: number; // versioning V1, V2...
  walkinUpdatedAt?: string;
  versions?: SpaceVersion[]; // historia V1..Vn
  panoramas?: VisualEntry[]; // stitched panoramas (CPU)
}

export interface VisualEntry {
  id: string;
  capturedAt: string;
  capturedById: string;
  capturedByName?: string;
  mediaType: 'photo' | 'video';
  mediaUrl: string;
  thumbnailUrl?: string;
  angleLabel?: string;
  caption?: string;
  tags?: RoomTag[];
  positionEstimate?: string; // e.g. "wejście" | "środek" | "okno"
  confidence?: number;
}

export interface SosAlert {
  id: string;
  title: string;
  description: string;
  urgency: 'critical' | 'high' | 'medium';
  room: string;
  reportedById: string;
  reportedByName: string;
  photoUrl?: string;
  createdAt: string;
  status: 'active' | 'resolved';
  resolvedById?: string;
  resolvedByName?: string;
  resolvedAt?: string;
}

export interface NotificationSetting {
  profileId: string;
  webPushEnabled: boolean;
  dailySummaryTime: string; // e.g. "18:00"
  quietHoursStart: string;  // e.g. "22:00"
  quietHoursEnd: string;    // e.g. "07:00"
  weekendReminder: boolean;
  weatherAlerts: boolean;
}

export interface HouseComment {
  id: string;
  taskId?: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface WeatherInfo {
  condition: 'sunny' | 'rainy' | 'cloudy' | 'storm' | 'snow';
  temp: number;
  description: string;
  precipitationChance: number;
  isRainExpectedTomorrow: boolean;
}

export interface ScannedTaskProposal {
  id: string;
  name: string;
  category: TaskCategory;
  frequency: FrequencyType;
  room: string;
  suggestedAssignee?: string;
  estimatedMinutes?: number;
  weatherSensitive?: boolean;
  notes?: string;
  confidence?: 'high' | 'medium' | 'low';
  selected?: boolean;
}

export interface VisionScanResult {
  noteTitle?: string;
  rawTranscription?: string;
  summary?: string;
  items: ScannedTaskProposal[];
  aiPowered: boolean;
}

export interface WeeklyPlan {
  id: string; // YYYY-MM-DD (Monday of week)
  weekStart: string; // YYYY-MM-DD Monday
  weekEnd: string; // YYYY-MM-DD Sunday
  assignments: Record<string, string | null>; // taskId -> profileId (override for this week)
  note?: string;
  createdAt: string;
  updatedAt: string;
  createdById: string;
}

export interface BoardMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  pinned?: boolean;
}

export interface PantryItem {
  id: string;
  name: string;
  category: string;
  quantity: string;
  unit?: string;
  lowThreshold?: number;
  expiryDate?: string;
  addedById: string;
  addedAt: string;
}

export interface BudgetLimit {
  category: string;
  limit: number;
  period: 'monthly';
}

export interface AbsenceMode {
  active: boolean;
  startDate?: string;
  endDate?: string;
  checklist: { id: string; label: string; done: boolean }[];
  pausedTaskIds?: string[];
}

export interface FamilyEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: 'birthday' | 'visit' | 'other';
  description?: string;
  color?: string;
}

export interface EquipmentServiceEntry {
  id: string;
  equipmentId: string;
  date: string;
  note: string;
  cost?: number;
  nextServiceDate?: string;
  createdById: string;
}
