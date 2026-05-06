// Type definitions for the application
export type UserRole = 'donor' | 'requestor' | 'hospital';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  bloodType?: string;
  phone?: string;
  location?: string;
  verified: boolean;
  createdAt?: string;
}

export interface BloodRequest {
  id: string;
  bloodType: string;
  quantity: number;
  requestorId: string;
  hospitalId?: string;
  status: 'pending' | 'fulfilled' | 'cancelled';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  expiresAt: string;
}

export interface DonationRecord {
  id: string;
  donorId: string;
  bloodType: string;
  quantity: number;
  donationDate: string;
  nextEligibleDate: string;
  status: 'completed' | 'pending' | 'cancelled';
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface ApiError {
  message: string;
  errors?: string[];
}
