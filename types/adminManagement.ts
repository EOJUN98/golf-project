/**
 * SDD-06: Admin Management Types
 *
 * Types for admin reservation/user management UI including:
 * - Reservation list with filters
 * - Suspended user management
 * - No-show processing
 * - Suspension management
 */

import { Database } from './database';

type Reservation = Database['public']['Tables']['reservations']['Row'];
type User = Database['public']['Tables']['users']['Row'];
type TeeTime = Database['public']['Tables']['tee_times']['Row'];
type GolfClub = Database['public']['Tables']['golf_clubs']['Row'];
type CancellationPolicy = Database['public']['Tables']['cancellation_policies']['Row'];

// Extended reservation with relations for admin display
export interface AdminReservationRow {
  reservation: Reservation;
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    is_suspended: boolean;
    no_show_count: number;
  };
  teeTime: {
    id: number;
    tee_off: string;
    base_price: number;
    status: string;
  };
  golfClub: {
    id: number;
    name: string;
    location_name: string;
  };
}

// Filters for admin reservation list
export interface AdminReservationFilters {
  dateFrom?: string; // ISO date
  dateTo?: string; // ISO date
  status?: Reservation['status'][];
  golfClubId?: number;
  isImminentDeal?: boolean;
  userId?: string;
}

// Extended user with suspension details
export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  is_suspended: boolean;
  suspended_reason: string | null;
  suspended_at: string | null;
  suspension_expires_at: string | null;
  no_show_count: number;
  total_bookings: number;
  canBook: boolean; // From can_user_book() function
}

// Filters for suspended users list
export interface SuspendedUserFilters {
  suspendedReason?: string;
  includeExpired?: boolean; // Include users with expired suspensions
}

// Admin reservation detail view
export interface AdminReservationDetail {
  reservation: Reservation;
  user: User;
  teeTime: TeeTime;
  golfClub: GolfClub;
  policy: CancellationPolicy | null;
  canMarkNoShow: boolean;
  canUnsuspendUser: boolean;
}

// No-show processing request
// SDD-08: adminUserId removed - uses session
export interface MarkNoShowRequest {
  reservationId: string;
}

export interface MarkNoShowResponse {
  success: boolean;
  message: string;
  userSuspended: boolean;
  error?: string;
}

// Suspension management
// SDD-08: adminUserId removed - uses session
export interface UnsuspendUserRequest {
  userId: string;
  reason?: string;
}

export interface UnsuspendUserResponse {
  success: boolean;
  message: string;
  error?: string;
}

// Admin statistics
export interface AdminDashboardStats {
  totalReservations: number;
  paidReservations: number;
  cancelledReservations: number;
  noShowReservations: number;
  suspendedUsers: number;
  pendingNoShowCandidates: number; // Reservations past grace period
}

// Admin action permissions
export interface AdminPermissions {
  canViewAllReservations: boolean;
  canMarkNoShow: boolean;
  canUnsuspendUsers: boolean;
  canViewAllUsers: boolean;
  clubId?: number; // If CLUB_ADMIN, which club they manage
}

// Table column configuration
export interface ReservationTableColumn {
  key: keyof AdminReservationRow | 'actions';
  label: string;
  sortable?: boolean;
  render?: (row: AdminReservationRow) => React.ReactNode;
}

export interface UserTableColumn {
  key: keyof AdminUserRow | 'actions';
  label: string;
  sortable?: boolean;
  render?: (row: AdminUserRow) => React.ReactNode;
}

// API response types
export interface GetAdminReservationsResponse {
  success: boolean;
  data?: {
    reservations: AdminReservationRow[];
    total: number;
    page: number;
    pageSize: number;
  };
  error?: string;
}

export interface GetSuspendedUsersResponse {
  success: boolean;
  data?: {
    users: AdminUserRow[];
    total: number;
  };
  error?: string;
}

export interface GetAdminReservationDetailResponse {
  success: boolean;
  data?: AdminReservationDetail;
  error?: string;
}

// Admin UI state
export interface AdminReservationListState {
  filters: AdminReservationFilters;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  isLoading: boolean;
}

export interface AdminUserListState {
  filters: SuspendedUserFilters;
  isLoading: boolean;
}

// Action result types
export interface AdminActionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}
