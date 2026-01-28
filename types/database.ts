export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string // UUID referencing auth.users
          email: string
          name: string | null
          phone: string | null
          segment: 'FUTURE' | 'PRESTIGE' | 'SMART' | 'CHERRY'
          segment_type: 'FUTURE' | 'PRESTIGE' | 'SMART' | 'CHERRY'
          segment_score: number
          segment_calculated_at: string | null
          cherry_score: number
          terms_agreed_at: string | null
          created_at: string
          updated_at: string | null
          // Blacklist management
          blacklisted: boolean
          blacklist_reason: string | null
          blacklisted_at: string | null
          blacklisted_by: string | null
          // Behavior tracking
          no_show_count: number
          no_show_risk_score: number
          consecutive_no_shows: number
          last_no_show_at: string | null
          total_cancellations: number
          cancellation_rate: number
          total_bookings: number
          total_spent: number
          avg_booking_value: number
          // Location data
          location_lat: number | null
          location_lng: number | null
          location_address: string | null
          distance_to_club_km: number | null
          // Visit tracking
          visit_count: number
          avg_stay_minutes: number | null
          last_visited_at: string | null
          // Segment override
          segment_override_by: string | null
          segment_override_at: string | null
          segment_override_reason: string | null
          // Marketing
          marketing_agreed: boolean
          push_agreed: boolean
          // Admin permissions
          is_admin: boolean
          is_super_admin: boolean
          // SDD-04: Suspension tracking
          is_suspended: boolean
          suspended_reason: string | null
          suspended_at: string | null
          suspension_expires_at: string | null
        }
        Insert: {
          id: string // UUID
          email: string
          name?: string | null
          phone?: string | null
          segment?: 'FUTURE' | 'PRESTIGE' | 'SMART' | 'CHERRY'
          segment_type?: 'FUTURE' | 'PRESTIGE' | 'SMART' | 'CHERRY'
          segment_score?: number
          segment_calculated_at?: string | null
          cherry_score?: number
          terms_agreed_at?: string | null
          created_at?: string
          updated_at?: string | null
          blacklisted?: boolean
          blacklist_reason?: string | null
          blacklisted_at?: string | null
          blacklisted_by?: string | null
          no_show_count?: number
          no_show_risk_score?: number
          consecutive_no_shows?: number
          last_no_show_at?: string | null
          total_cancellations?: number
          cancellation_rate?: number
          total_bookings?: number
          total_spent?: number
          avg_booking_value?: number
          location_lat?: number | null
          location_lng?: number | null
          location_address?: string | null
          distance_to_club_km?: number | null
          visit_count?: number
          avg_stay_minutes?: number | null
          last_visited_at?: string | null
          segment_override_by?: string | null
          segment_override_at?: string | null
          segment_override_reason?: string | null
          marketing_agreed?: boolean
          push_agreed?: boolean
          is_admin?: boolean
          is_super_admin?: boolean
          is_suspended?: boolean
          suspended_reason?: string | null
          suspended_at?: string | null
          suspension_expires_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          phone?: string | null
          segment?: 'FUTURE' | 'PRESTIGE' | 'SMART' | 'CHERRY'
          segment_type?: 'FUTURE' | 'PRESTIGE' | 'SMART' | 'CHERRY'
          segment_score?: number
          segment_calculated_at?: string | null
          cherry_score?: number
          terms_agreed_at?: string | null
          created_at?: string
          updated_at?: string | null
          blacklisted?: boolean
          blacklist_reason?: string | null
          blacklisted_at?: string | null
          blacklisted_by?: string | null
          no_show_count?: number
          no_show_risk_score?: number
          consecutive_no_shows?: number
          last_no_show_at?: string | null
          total_cancellations?: number
          cancellation_rate?: number
          total_bookings?: number
          total_spent?: number
          avg_booking_value?: number
          location_lat?: number | null
          location_lng?: number | null
          location_address?: string | null
          distance_to_club_km?: number | null
          visit_count?: number
          avg_stay_minutes?: number | null
          last_visited_at?: string | null
          segment_override_by?: string | null
          segment_override_at?: string | null
          segment_override_reason?: string | null
          marketing_agreed?: boolean
          push_agreed?: boolean
          is_admin?: boolean
          is_super_admin?: boolean
          is_suspended?: boolean
          suspended_reason?: string | null
          suspended_at?: string | null
          suspension_expires_at?: string | null
        }
        Relationships: []
      }
      weather_cache: {
        Row: {
          id: number
          target_date: string
          target_hour: number
          pop: number
          rn1: number
          wsd: number
        }
        Insert: {
          id?: number
          target_date: string
          target_hour: number
          pop: number
          rn1: number
          wsd: number
        }
        Update: {
          id?: number
          target_date?: string
          target_hour?: number
          pop?: number
          rn1?: number
          wsd?: number
        }
        Relationships: []
      }
      tee_times: {
        Row: {
          id: number
          golf_club_id: number
          tee_off: string
          base_price: number
          status: 'OPEN' | 'BOOKED' | 'BLOCKED'
          weather_condition: Json | null
          reserved_by: string | null // UUID
          reserved_at: string | null
          updated_by: string | null // UUID
          updated_at: string | null
        }
        Insert: {
          id?: number
          golf_club_id?: number
          tee_off: string
          base_price: number
          status?: 'OPEN' | 'BOOKED' | 'BLOCKED'
          weather_condition?: Json | null
          reserved_by?: string | null // UUID
          reserved_at?: string | null
          updated_by?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          golf_club_id?: number
          tee_off?: string
          base_price?: number
          status?: 'OPEN' | 'BOOKED' | 'BLOCKED'
          weather_condition?: Json | null
          reserved_by?: string | null // UUID
          reserved_at?: string | null
          updated_by?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tee_time_stats: {
        Row: {
          id: number
          tee_time_id: number
          golf_club_id: number
          day_of_week: number
          hour_of_day: number
          is_weekend: boolean
          is_holiday: boolean
          total_views: number
          total_bookings: number
          total_cancellations: number
          total_no_shows: number
          avg_final_price: number | null
          avg_discount_rate: number | null
          base_price: number | null
          booking_rate: number
          vacancy_rate: number
          no_show_rate: number
          calculated_at: string
          stats_period_start: string | null
          stats_period_end: string | null
        }
        Insert: {
          id?: number
          tee_time_id: number
          golf_club_id: number
          day_of_week: number
          hour_of_day: number
          is_weekend?: boolean
          is_holiday?: boolean
          total_views?: number
          total_bookings?: number
          total_cancellations?: number
          total_no_shows?: number
          avg_final_price?: number | null
          avg_discount_rate?: number | null
          base_price?: number | null
          booking_rate?: number
          vacancy_rate?: number
          no_show_rate?: number
          calculated_at?: string
          stats_period_start?: string | null
          stats_period_end?: string | null
        }
        Update: {
          id?: number
          tee_time_id?: number
          golf_club_id?: number
          day_of_week?: number
          hour_of_day?: number
          is_weekend?: boolean
          is_holiday?: boolean
          total_views?: number
          total_bookings?: number
          total_cancellations?: number
          total_no_shows?: number
          avg_final_price?: number | null
          avg_discount_rate?: number | null
          base_price?: number | null
          booking_rate?: number
          vacancy_rate?: number
          no_show_rate?: number
          calculated_at?: string
          stats_period_start?: string | null
          stats_period_end?: string | null
        }
        Relationships: []
      }
      club_admins: {
        Row: {
          id: number
          user_id: string
          golf_club_id: number
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          golf_club_id: number
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          golf_club_id?: number
          created_at?: string
        }
        Relationships: []
      }
      golf_clubs: {
        Row: {
          id: number
          name: string
          location_name: string
          location_lat: number | null
          location_lng: number | null
        }
        Insert: {
          id?: number
          name: string
          location_name: string
          location_lat?: number | null
          location_lng?: number | null
        }
        Update: {
          id?: number
          name?: string
          location_name?: string
          location_lat?: number | null
          location_lng?: number | null
        }
        Relationships: []
      }
      reservations: {
        Row: {
          id: string // UUID
          tee_time_id: number
          user_id: string // UUID
          base_price: number
          final_price: number
          discount_breakdown: Json | null
          payment_key: string | null
          payment_status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED'
          payment_mode: 'REAL' | 'VIRTUAL' | 'TEST'
          payment_reference: string | null
          payment_metadata: Json | null
          risk_score: number
          risk_factors: Json | null
          precheck_required: boolean
          precheck_completed_at: string | null
          precheck_method: string | null
          penalty_agreement_signed: boolean
          penalty_agreement_signed_at: string | null
          created_at: string
          // SDD-04: Cancellation policy fields
          status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED' | 'NO_SHOW' | 'COMPLETED'
          is_imminent_deal: boolean
          cancelled_at: string | null
          cancel_reason: string | null
          refund_amount: number
          no_show_marked_at: string | null
          policy_version: string
          // SDD-07: Settlement tracking
          settlement_id: string | null // UUID referencing settlements(id)
          paid_amount: number // Actual amount paid (for settlement calculation)
        }
        Insert: {
          id?: string // UUID
          tee_time_id: number
          user_id: string // UUID
          base_price: number
          final_price: number
          discount_breakdown?: Json | null
          payment_key?: string | null
          payment_status?: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED'
          payment_mode?: 'REAL' | 'VIRTUAL' | 'TEST'
          payment_reference?: string | null
          payment_metadata?: Json | null
          risk_score?: number
          risk_factors?: Json | null
          precheck_required?: boolean
          precheck_completed_at?: string | null
          precheck_method?: string | null
          penalty_agreement_signed?: boolean
          penalty_agreement_signed_at?: string | null
          created_at?: string
          status?: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED' | 'NO_SHOW' | 'COMPLETED'
          is_imminent_deal?: boolean
          cancelled_at?: string | null
          cancel_reason?: string | null
          refund_amount?: number
          no_show_marked_at?: string | null
          policy_version?: string
          settlement_id?: string | null
          paid_amount?: number
        }
        Update: {
          id?: string
          tee_time_id?: number
          user_id?: string
          base_price?: number
          final_price?: number
          discount_breakdown?: Json | null
          payment_key?: string | null
          payment_status?: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED'
          payment_mode?: 'REAL' | 'VIRTUAL' | 'TEST'
          payment_reference?: string | null
          payment_metadata?: Json | null
          risk_score?: number
          risk_factors?: Json | null
          precheck_required?: boolean
          precheck_completed_at?: string | null
          precheck_method?: string | null
          penalty_agreement_signed?: boolean
          penalty_agreement_signed_at?: string | null
          created_at?: string
          status?: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED' | 'NO_SHOW' | 'COMPLETED'
          is_imminent_deal?: boolean
          cancelled_at?: string | null
          cancel_reason?: string | null
          refund_amount?: number
          no_show_marked_at?: string | null
          policy_version?: string
          settlement_id?: string | null
          paid_amount?: number
        }
        Relationships: []
      }
      settlements: {
        Row: {
          id: string // UUID
          golf_club_id: number
          period_start: string // DATE
          period_end: string // DATE
          gross_amount: number
          refund_amount: number
          net_amount: number
          platform_fee: number
          club_payout: number
          reservation_count: number
          status: 'DRAFT' | 'CONFIRMED' | 'LOCKED'
          policy_version: string | null
          commission_rate: number
          include_no_show: boolean
          include_cancelled: boolean
          include_refunded: boolean
          created_at: string
          created_by_user_id: string | null
          confirmed_at: string | null
          confirmed_by_user_id: string | null
          locked_at: string | null
          locked_by_user_id: string | null
          notes: string | null
          metadata: Json
          updated_at: string
        }
        Insert: {
          id?: string
          golf_club_id: number
          period_start: string
          period_end: string
          gross_amount?: number
          refund_amount?: number
          net_amount?: number
          platform_fee?: number
          club_payout?: number
          reservation_count?: number
          status?: 'DRAFT' | 'CONFIRMED' | 'LOCKED'
          policy_version?: string | null
          commission_rate?: number
          include_no_show?: boolean
          include_cancelled?: boolean
          include_refunded?: boolean
          created_at?: string
          created_by_user_id?: string | null
          confirmed_at?: string | null
          confirmed_by_user_id?: string | null
          locked_at?: string | null
          locked_by_user_id?: string | null
          notes?: string | null
          metadata?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          golf_club_id?: number
          period_start?: string
          period_end?: string
          gross_amount?: number
          refund_amount?: number
          net_amount?: number
          platform_fee?: number
          club_payout?: number
          reservation_count?: number
          status?: 'DRAFT' | 'CONFIRMED' | 'LOCKED'
          policy_version?: string | null
          commission_rate?: number
          include_no_show?: boolean
          include_cancelled?: boolean
          include_refunded?: boolean
          created_at?: string
          created_by_user_id?: string | null
          confirmed_at?: string | null
          confirmed_by_user_id?: string | null
          locked_at?: string | null
          locked_by_user_id?: string | null
          notes?: string | null
          metadata?: Json
          updated_at?: string
        }
        Relationships: []
      }
      cancellation_policies: {
        Row: {
          id: number
          name: string
          version: string
          cancel_cutoff_hours: number
          imminent_deal_cancellable: boolean
          refund_rate: number
          no_show_grace_period_minutes: number
          no_show_suspension_enabled: boolean
          no_show_suspension_duration_days: number | null
          description: string | null
          active: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: number
          name: string
          version?: string
          cancel_cutoff_hours?: number
          imminent_deal_cancellable?: boolean
          refund_rate?: number
          no_show_grace_period_minutes?: number
          no_show_suspension_enabled?: boolean
          no_show_suspension_duration_days?: number | null
          description?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          version?: string
          cancel_cutoff_hours?: number
          imminent_deal_cancellable?: boolean
          refund_rate?: number
          no_show_grace_period_minutes?: number
          no_show_suspension_enabled?: boolean
          no_show_suspension_duration_days?: number | null
          description?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string // UUID
          user_id: string | null
          tee_time_id: number | null
          type: 'PANIC_DEAL' | 'WEATHER_ALERT' | 'BOOKING_CONFIRMATION' | 'BOOKING_REMINDER' | 'PRICE_DROP' | 'CUSTOM'
          title: string
          message: string
          payload: Json
          status: 'PENDING' | 'SENT' | 'FAILED' | 'READ' | 'DISMISSED'
          created_at: string
          sent_at: string | null
          read_at: string | null
          priority: number
          expires_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          tee_time_id?: number | null
          type: 'PANIC_DEAL' | 'WEATHER_ALERT' | 'BOOKING_CONFIRMATION' | 'BOOKING_REMINDER' | 'PRICE_DROP' | 'CUSTOM'
          title: string
          message: string
          payload?: Json
          status?: 'PENDING' | 'SENT' | 'FAILED' | 'READ' | 'DISMISSED'
          created_at?: string
          sent_at?: string | null
          read_at?: string | null
          priority?: number
          expires_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          tee_time_id?: number | null
          type?: 'PANIC_DEAL' | 'WEATHER_ALERT' | 'BOOKING_CONFIRMATION' | 'BOOKING_REMINDER' | 'PRICE_DROP' | 'CUSTOM'
          title?: string
          message?: string
          payload?: Json
          status?: 'PENDING' | 'SENT' | 'FAILED' | 'READ' | 'DISMISSED'
          created_at?: string
          sent_at?: string | null
          read_at?: string | null
          priority?: number
          expires_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {
      calculate_segment_score: {
        Args: {
          p_user_id: string
        }
        Returns: {
          segment_type: string | null
          segment_score: number | null
          calculation_details: Json | null
          old_segment?: string | null
          new_segment?: string | null
        }[]
      }
      increment_user_stats: {
        Args: {
          p_user_id: string
          p_booking_amount: number
        }
        Returns: undefined
      }
    }
    Enums: {
      segment_type: 'FUTURE' | 'PRESTIGE' | 'SMART' | 'CHERRY'
      teetime_status: 'OPEN' | 'BOOKED' | 'BLOCKED'
      payment_status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED'
      notification_type: 'PANIC_DEAL' | 'WEATHER_ALERT' | 'BOOKING_CONFIRMATION' | 'BOOKING_REMINDER' | 'PRICE_DROP' | 'CUSTOM'
      notification_status: 'PENDING' | 'SENT' | 'FAILED' | 'READ' | 'DISMISSED'
    }
    CompositeTypes: {}
  }
}
