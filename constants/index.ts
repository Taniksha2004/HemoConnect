// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Blood Types
export const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as const;

// User Roles
export const USER_ROLES = ['donor', 'requestor', 'hospital'] as const;

// Request Urgency Levels
export const URGENCY_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

// Request Status
export const REQUEST_STATUS = ['pending', 'fulfilled', 'cancelled'] as const;

// Donation Status
export const DONATION_STATUS = ['completed', 'pending', 'cancelled'] as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  THEME: 'theme',
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  AUTH: {
    LOGIN: '/login',
    SIGNUP: '/signup',
  },
  DONOR: {
    DASHBOARD: '/donor/dashboard',
    FORM: '/donor/form',
    SCREENING: '/donor/screening',
  },
  REQUESTOR: {
    DASHBOARD: '/requestor/dashboard',
    REQUEST: '/requestor/request',
  },
  HOSPITAL: {
    PANEL: '/hospital/panel',
    INVENTORY: '/hospital/inventory',
  },
  LANDING: '/landing',
  EDUCATION: '/education',
  FIND_BLOOD: '/find-blood',
  PROFILE: '/profile',
  HOSPITALS: '/hospitals',
} as const;
