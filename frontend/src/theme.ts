export const COLORS = {
  background: '#17110C',
  surface: '#261C14',
  surfaceHover: '#33261C',
  border: '#3E2E21',
  primary: '#C5A059',
  primaryHover: '#D4AF37',
  primaryForeground: '#17110C',
  secondary: '#4A5D23',
  secondaryForeground: '#E5D9C5',
  accent: '#A23B2A',
  accentForeground: '#E5D9C5',
  textPrimary: '#E5D9C5',
  textSecondary: '#9D8C7A',
  success: '#4A5D23',
  warning: '#C5A059',
  error: '#A23B2A',
  muted: '#261C14',
  mutedForeground: '#9D8C7A',
};

export const CATEGORIES = {
  inventory: ['general', 'food', 'crops', 'medical', 'crafting', 'weapons', 'animals', 'materials', 'other'],
  treasury: ['general', 'sales', 'donations', 'payroll', 'supplies', 'repairs', 'taxes', 'events', 'other'],
  assets: ['wagons', 'horses', 'buildings', 'weapons', 'supplies', 'trade_goods', 'medicine', 'relics', 'other'],
  crops: ['corn', 'wheat', 'tobacco', 'cotton', 'vegetables', 'herbs', 'fruit', 'other'],
};

export const ROLES = ['leader', 'treasurer', 'quartermaster', 'ranch_manager', 'farmer', 'soldier', 'member', 'guest'];

export const ROLE_LABELS: Record<string, string> = {
  leader: 'Leader / Chief',
  treasurer: 'Treasurer',
  quartermaster: 'Quartermaster',
  ranch_manager: 'Ranch Manager',
  farmer: 'Farmer',
  soldier: 'Soldier / Enforcer',
  member: 'Family Member',
  guest: 'Guest / Recruit',
};

export const PRIORITY_COLORS: Record<string, string> = {
  high: COLORS.accent,
  medium: COLORS.warning,
  low: COLORS.secondary,
};

export const STATUS_COLORS: Record<string, string> = {
  planted: '#C5A059',
  growing: '#4A5D23',
  ready: '#6B8E23',
  harvested: '#9D8C7A',
  spoiled: '#A23B2A',
  pending: '#C5A059',
  in_progress: '#4A5D23',
  completed: '#6B8E23',
};
