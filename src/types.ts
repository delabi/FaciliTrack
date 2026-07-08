export interface Organization {
  id: string;
  name: string;
  logo?: string;
  themeColor?: string;
}

export interface Facility {
  id: string;
  organizationId: string;
  name: string;
  address: string;
  description: string;
  qrCodeUrl: string; // URL inside the app to trigger a report e.g., "/report?facilityId=..."
}

export type UserRole = 'superadmin' | 'admin' | 'manager' | 'vendor' | 'tenant';

export interface User {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: UserRole;
  vendorId?: string; // If role is 'vendor', maps to a Vendor profile
}

export interface VendorAffiliation {
  vendorId: string;
  organizationId: string;
  createdAt?: string;
}

export interface VendorInvitation {
  id: string;
  organizationId: string;
  email: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt?: string;
}

export interface Vendor {
  id: string;
  organizationId: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  active: boolean;
}

export type RequestCategory = 'plumbing' | 'electrical' | 'hvac' | 'structural' | 'appliance' | 'safety' | 'other';
export type RequestUrgency = 'low' | 'medium' | 'high' | 'emergency';
export type RequestStatus = 'pending' | 'assigned' | 'in-progress' | 'completed' | 'paid';

export interface ProgressLog {
  status: RequestStatus;
  timestamp: string;
  note: string;
  updatedBy: string;
}

export interface RepairRequest {
  id: string;
  organizationId: string;
  facilityId: string;
  title: string;
  description: string;
  category: RequestCategory;
  urgency: RequestUrgency;
  status: RequestStatus;
  reporterName: string;
  reporterContact: string;
  mediaUrls: string[]; // Base64 data URLs for mock files (images/videos)
  locationCoordinates?: {
    latitude: number;
    longitude: number;
  };
  assignedVendorId?: string;
  completionPhotoUrl?: string; // Base64 data URL
  receiptUrl?: string; // Base64 data URL for invoice/receipt
  cost?: number;
  itemizedCost?: ItemizedCost;
  inspectionPhotoUrls?: string[]; // Base64 data URLs for inspection photos/videos
  inspectionNotes?: string;
  inspectionApproved?: boolean;
  createdAt: string;
  progressLog: ProgressLog[];
}

export interface ItemizedCost {
  parts: number;
  labor: number;
  other: number;
}

