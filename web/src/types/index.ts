export interface Clinic {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  isActive: boolean;
  ambulatoryRate?: number;
  wheelchairRate?: number;
  stretcherRate?: number;
  cancellationRate?: number;
  noShowRate?: number;
  billingContact?: string;
  billingEmail?: string;
  billingPhone?: string;
  paymentTerms?: string;
  taxId?: string;
  companyCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contractor {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone: string;
  email: string;
  contactPerson?: string;
  notes?: string;
  clinicId: string;
  rateTiers?: any;
  createdAt: string;
  updatedAt: string;
}

export type AddContractorData = Omit<Contractor, 'id' | 'createdAt' | 'updatedAt'> & {
  username?: string;
};

export type Facility = Contractor;
export type AddFacilityData = AddContractorData;

export interface TripSource {
  id: string;
  name: string;
  type: 'broker' | 'contractor' | 'private' | 'other';
  phone?: string;
  email?: string;
  address?: string;
  billingAddress?: string;
  contactEmail?: string;
  clinicId: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  username?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  role: 'superadmin' | 'admin' | 'dispatcher';
  clinicId?: string;
  contractorId?: string; // If set, user is a Contractor Dispatcher; if not, Regular (Company) Dispatcher
  isActive: boolean;
  temporaryPassword?: string;
  requirePasswordChange?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  email: string;
  phone: string;
  licenseNumber: string;
  temporaryPassword?: string;
  status: 'available' | 'on_trip' | 'offline' | 'off_duty';
  isActive: boolean;
  rating?: number;
  totalTrips?: number;
  currentLatitude?: number;
  currentLongitude?: number;
  assignedVehicleId?: string;
  assignedVehicle?: string;
  clinicId?: string;
  rates?: any;
  createdAt: string;
  updatedAt: string;
}

export interface DriverRateTier {
  id?: string;
  driverId?: string;
  serviceLevel: 'ambulatory' | 'wheelchair' | 'stretcher';
  fromMiles: number;
  toMiles: number;
  rate: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DriverPayout {
  id: string;
  driverId: string;
  tripId: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  payoutDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractorRevenue {
  id: string;
  clinicId: string;
  revenueRate: number;
  rateType: 'percentage' | 'fixed';
  effectiveDate: string;
  createdBy: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  vehicleName?: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vin: string;
  vehicleType: 'sedan' | 'suv' | 'van' | 'wheelchair-accessible';
  ownershipType: 'company' | 'private';
  color?: string;
  capacity: number;
  wheelchairAccessible: boolean;
  stretcherCapable: boolean;
  status: 'available' | 'in_use' | 'maintenance' | 'retired';
  lastMaintenanceDate?: string;
  insuranceExpiry?: string;
  registrationExpiry?: string;
  inspectionExpiry?: string;
  clinicId?: string;
  assignedDriverId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  type: 'oil_change' | 'tire_rotation' | 'brake_service' | 'inspection' | 'repair' | 'other';
  description: string;
  cost: number;
  performedDate: string;
  performedBy: string;
  mileageAtService: number;
  nextServiceMileage?: number;
  createdAt: string;
}

export interface Trip {
  id: string;
  tripNumber?: string;
  patientId?: string;
  driverId?: string;
  vehicleId?: string;
  contractorId?: string;
  customerName: string;
  firstName?: string;
  lastName?: string;
  customerPhone: string;
  customerEmail?: string;
  pickupLocation: string;
  pickupAddress?: string;
  pickupCity?: string;
  pickupState?: string;
  pickupZip?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  dropoffLocation: string;
  dropoffAddress?: string;
  dropoffCity?: string;
  dropoffState?: string;
  dropoffZip?: string;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'no-show' | 'scheduled';
  tripType: 'clinic' | 'private';
  journeyType: 'one-way' | 'roundtrip' | 'multi-stop' | 'recurring';
  returnTime?: string;
  returnPickupLocation?: string;
  returnDropoffLocation?: string;
  willCall?: boolean;
  serviceLevel: 'ambulatory' | 'wheelchair' | 'stretcher';
  levelOfAssistance?: 'curb-to-curb' | 'door-to-door' | 'hand-to-hand' | 'bed-to-bed' | string;
  tripSourceId?: string;
  scheduledTime: string;
  scheduledPickupTime?: string;
  scheduledDropoffTime?: string;
  appointmentTime?: string;
  actualPickupTime?: string;
  actualDropoffTime?: string;
  pickupTime?: string;
  dropoffTime?: string;
  fare: number;
  distance: number;
  distanceMiles?: number;
  leg1Miles?: number;
  leg2Miles?: number;
  waitTimeMinutes?: number;
  rate?: number;
  waitTimeCharge?: number;
  totalCharge?: number;
  driverPayout?: number;
  isReturnTrip?: boolean;
  linkedTripId?: string;
  recurringTripId?: string;
  notes?: string;
  clinicNote?: string;
  classification?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  clinicId?: string;
  paymentStatus?: 'unpaid' | 'paid' | 'partial' | 'refunded';
  paymentMethod?: 'cash' | 'card' | 'insurance' | 'invoice';
  invoiceNumber?: string;
  invoiceDate?: string;
  paidAmount?: number;
  paidDate?: string;
  billingAddress?: string;
  createdBy?: string;
  assignedBy?: string;
  dispatcherId?: string;
  dispatcherName?: string;
  dispatcherAssignedAt?: string;
  lastModifiedById?: string;
  lastModifiedByName?: string;
  passengerConfirmationStatus?: 'confirmed' | 'canceled' | 'awaiting_response' | 'unconfirmed' | 'expired' | null;
  lastConfirmationUpdate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TripAssignmentHistory {
  id: string;
  tripId: string;
  driverId?: string;
  driverName?: string;
  dispatcherId?: string;
  dispatcherName: string;
  action: 'created' | 'assigned' | 'reassigned' | 'updated' | 'cancelled';
  previousDriverId?: string;
  previousDriverName?: string;
  notes?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  tripId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  billingAddress?: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentStatus: 'unpaid' | 'paid' | 'partial';
  paidAmount: number;
  paidDate?: string;
  paymentMethod?: string;
  notes?: string;
  clinicId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entityType: 'trip' | 'driver' | 'user';
  entityId?: string;
  details?: any;
  createdAt: string;
}

export interface TripHistory {
  id: string;
  tripId: string;
  status: string;
  changedAt: string;
  notes?: string;
}

export interface DashboardStats {
  todaysTrips: number;
  activeDrivers: number;
  completedToday: number;
  totalRevenue: number;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phone: string;
  accountNumber?: string;
  serviceLevel?: 'ambulatory' | 'wheelchair' | 'stretcher';
  notes?: string;
  clinicId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringTrip {
  id: string;
  templateName: string;
  patientId?: string;
  contractorId?: string;
  pickupAddress: string;
  dropoffAddress: string;
  tripType: 'ambulatory' | 'wheelchair' | 'stretcher';
  preferredDriverId?: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  daysOfWeek?: string[];
  timeOfDay: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TripNoteTemplate {
  id: string;
  title: string;
  content: string;
  category: 'general' | 'medical' | 'behavioral' | 'equipment';
  isActive: boolean;
  createdAt: string;
}

export interface DriverScore {
  driver: Driver;
  score: number;
  reasons: string[];
}
