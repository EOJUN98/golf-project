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
          last_no_show_at: string | null
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
          // Marketing
          marketing_agreed: boolean
          push_agreed: boolean
          // Admin permissions
          is_admin: boolean
          is_super_admin: boolean
        }
        Insert: {
          id: string // UUID
          email: string
          name?: string | null
          phone?: string | null
          segment?: 'FUTURE' | 'PRESTIGE' | 'SMART' | 'CHERRY'
          cherry_score?: number
          terms_agreed_at?: string | null
          created_at?: string
          updated_at?: string | null
          blacklisted?: boolean
          blacklist_reason?: string | null
          blacklisted_at?: string | null
          blacklisted_by?: string | null
          no_show_count?: number
          last_no_show_at?: string | null
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
          marketing_agreed?: boolean
          push_agreed?: boolean
          is_admin?: boolean
          is_super_admin?: boolean
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          phone?: string | null
          segment?: 'FUTURE' | 'PRESTIGE' | 'SMART' | 'CHERRY'
          cherry_score?: number
          terms_agreed_at?: string | null
          created_at?: string
          updated_at?: string | null
          blacklisted?: boolean
          blacklist_reason?: string | null
          blacklisted_at?: string | null
          blacklisted_by?: string | null
          no_show_count?: number
          last_no_show_at?: string | null
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
          marketing_agreed?: boolean
          push_agreed?: boolean
          is_admin?: boolean
          is_super_admin?: boolean
        }
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
          created_at: string
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
          created_at?: string
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
          created_at?: string
        }
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
      }
    }
    Enums: {
      segment_type: 'FUTURE' | 'PRESTIGE' | 'SMART' | 'CHERRY'
      teetime_status: 'OPEN' | 'BOOKED' | 'BLOCKED'
      payment_status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED'
      notification_type: 'PANIC_DEAL' | 'WEATHER_ALERT' | 'BOOKING_CONFIRMATION' | 'BOOKING_REMINDER' | 'PRICE_DROP' | 'CUSTOM'
      notification_status: 'PENDING' | 'SENT' | 'FAILED' | 'READ' | 'DISMISSED'
    }
  }
}