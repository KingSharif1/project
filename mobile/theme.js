// Driver App Theme - Professional NEMT Color Palette
export const COLORS = {
  // Primary
  navy: '#1B365D',
  navyLight: '#264573',
  navyDark: '#122440',

  // Secondary
  seafoam: '#45B1A8',
  seafoamLight: '#5CC4BB',
  seafoamDark: '#3A9990',

  // Accent / Backgrounds
  softGrey: '#F2F4F7',
  white: '#FFFFFF',
  
  // Text
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  textWhite: '#FFFFFF',

  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  purple: '#8B5CF6',
  orange: '#EA580C',

  // Borders & Dividers
  border: '#E5E7EB',
  divider: '#F3F4F6',

  // Card
  card: '#FFFFFF',
  cardShadow: '#000000',
};

export const FONTS = {
  h1: { fontSize: 28, fontWeight: '700', color: COLORS.textPrimary },
  h2: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  h3: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
  body: { fontSize: 15, fontWeight: '400', color: COLORS.textPrimary },
  bodyBold: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  caption: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  small: { fontSize: 11, fontWeight: '600', color: COLORS.textLight },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: 0.3 },
};

export const SHADOWS = {
  small: {
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  large: {
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Trip status configuration
export const TRIP_STATUS = {
  assigned: { label: 'Assigned', color: COLORS.info, icon: 'clipboard-outline' },
  en_route_pickup: { label: 'In Route', color: COLORS.warning, icon: 'navigate-outline' },
  arrived_pickup: { label: 'Arrived', color: COLORS.orange, icon: 'location-outline' },
  patient_loaded: { label: 'Patient Loaded', color: COLORS.purple, icon: 'person-outline' },
  en_route_dropoff: { label: 'In Route', color: COLORS.seafoam, icon: 'car-outline' },
  arrived_dropoff: { label: 'Arrived', color: COLORS.navy, icon: 'flag-outline' },
  completed: { label: 'Completed', color: COLORS.success, icon: 'checkmark-circle-outline' },
  cancelled: { label: 'Cancelled', color: COLORS.danger, icon: 'close-circle-outline' },
  no_show: { label: 'No Show', color: COLORS.textLight, icon: 'eye-off-outline' },
};

// Trip status flow for driver actions
export const TRIP_FLOW = [
  'assigned',
  'en_route_pickup',
  'arrived_pickup',
  'patient_loaded',        // signature happens here
  'en_route_dropoff',
  'arrived_dropoff',
  'completed',
];

export const getNextStatus = (currentStatus) => {
  const idx = TRIP_FLOW.indexOf(currentStatus);
  if (idx === -1 || idx >= TRIP_FLOW.length - 1) return null;
  return TRIP_FLOW[idx + 1];
};

export const getNextStatusLabel = (currentStatus) => {
  const next = getNextStatus(currentStatus);
  if (!next) return null;
  return TRIP_STATUS[next]?.label || next;
};
