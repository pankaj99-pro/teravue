export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string | null
          booking_url: string | null
          end_time: string | null
          id: string
          image_url: string | null
          latitude: number | null
          location_name: string | null
          longitude: number | null
          price_estimate: number | null
          start_time: string | null
          title: string
          trip_day_id: string
        }
        Insert: {
          activity_type?: string | null
          booking_url?: string | null
          end_time?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          price_estimate?: number | null
          start_time?: string | null
          title: string
          trip_day_id: string
        }
        Update: {
          activity_type?: string | null
          booking_url?: string | null
          end_time?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          price_estimate?: number | null
          start_time?: string | null
          title?: string
          trip_day_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_trip_day_id_fkey"
            columns: ["trip_day_id"]
            isOneToOne: false
            referencedRelation: "trip_days"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_logs: {
        Row: {
          agent_run_id: string | null
          created_at: string
          id: string
          message: string
          step_type: string
          trip_id: string
        }
        Insert: {
          agent_run_id?: string | null
          created_at?: string
          id?: string
          message: string
          step_type: string
          trip_id: string
        }
        Update: {
          agent_run_id?: string | null
          created_at?: string
          id?: string
          message?: string
          step_type?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_logs_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_logs_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memory: {
        Row: {
          content: Json
          created_at: string
          id: string
          memory_key: string | null
          memory_type: string
          trip_id: string | null
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          memory_key?: string | null
          memory_type: string
          trip_id?: string | null
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          memory_key?: string | null
          memory_type?: string
          trip_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_memory_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          context_json: Json | null
          created_at: string
          current_step: string
          id: string
          status: string
          trip_id: string | null
          user_id: string
        }
        Insert: {
          context_json?: Json | null
          created_at?: string
          current_step?: string
          id?: string
          status?: string
          trip_id?: string | null
          user_id: string
        }
        Update: {
          context_json?: Json | null
          created_at?: string
          current_step?: string
          id?: string
          status?: string
          trip_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tasks: {
        Row: {
          agent_run_id: string | null
          agent_type: string
          created_at: string
          id: string
          result_summary: string | null
          status: string
          task_description: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          agent_run_id?: string | null
          agent_type: string
          created_at?: string
          id?: string
          result_summary?: string | null
          status?: string
          task_description: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          agent_run_id?: string | null
          agent_type?: string
          created_at?: string
          id?: string
          result_summary?: string | null
          status?: string
          task_description?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tasks_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tasks_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          activity_id: string | null
          booking_reference: string | null
          booking_type: string | null
          created_at: string
          id: string
          price_paid: number | null
          provider: string | null
          status: string | null
          trip_id: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          booking_reference?: string | null
          booking_type?: string | null
          created_at?: string
          id?: string
          price_paid?: number | null
          provider?: string | null
          status?: string | null
          trip_id: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          booking_reference?: string | null
          booking_type?: string | null
          created_at?: string
          id?: string
          price_paid?: number | null
          provider?: string | null
          status?: string | null
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      followers: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      itinerary_versions: {
        Row: {
          created_at: string
          id: string
          itinerary_data: Json
          trip_id: string
          version_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          itinerary_data?: Json
          trip_id: string
          version_number?: number
        }
        Update: {
          created_at?: string
          id?: string
          itinerary_data?: Json
          trip_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_versions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean | null
          trip_id: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          trip_id?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          trip_id?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          home_country: string | null
          id: string
          is_public: boolean
          preferred_currency: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          home_country?: string | null
          id: string
          is_public?: boolean
          preferred_currency?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          home_country?: string | null
          id?: string
          is_public?: boolean
          preferred_currency?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      routes: {
        Row: {
          distance_km: number | null
          end_activity_id: string | null
          estimated_duration_minutes: number | null
          id: string
          route_geometry: Json | null
          start_activity_id: string | null
          transport_mode: string | null
          trip_day_id: string
        }
        Insert: {
          distance_km?: number | null
          end_activity_id?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          route_geometry?: Json | null
          start_activity_id?: string | null
          transport_mode?: string | null
          trip_day_id: string
        }
        Update: {
          distance_km?: number | null
          end_activity_id?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          route_geometry?: Json | null
          start_activity_id?: string | null
          transport_mode?: string | null
          trip_day_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_end_activity_id_fkey"
            columns: ["end_activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_start_activity_id_fkey"
            columns: ["start_activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_trip_day_id_fkey"
            columns: ["trip_day_id"]
            isOneToOne: false
            referencedRelation: "trip_days"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_trips: {
        Row: {
          created_at: string
          destination: string | null
          id: string
          stops: Json
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          destination?: string | null
          id?: string
          stops?: Json
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          destination?: string | null
          id?: string
          stops?: Json
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      trip_days: {
        Row: {
          date: string | null
          day_number: number
          id: string
          summary: string | null
          trip_id: string
        }
        Insert: {
          date?: string | null
          day_number: number
          id?: string
          summary?: string | null
          trip_id: string
        }
        Update: {
          date?: string | null
          day_number?: number
          id?: string
          summary?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_days_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_routes: {
        Row: {
          created_at: string
          distance_km: number | null
          duration_minutes: number | null
          from_location: string
          id: string
          route_geometry: Json | null
          route_polyline: string | null
          to_location: string
          transport_mode: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          distance_km?: number | null
          duration_minutes?: number | null
          from_location: string
          id?: string
          route_geometry?: Json | null
          route_polyline?: string | null
          to_location: string
          transport_mode?: string
          trip_id: string
        }
        Update: {
          created_at?: string
          distance_km?: number | null
          duration_minutes?: number | null
          from_location?: string
          id?: string
          route_geometry?: Json | null
          route_polyline?: string | null
          to_location?: string
          transport_mode?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_routes_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          ai_generated: boolean | null
          created_at: string
          destination_city: string | null
          destination_country: string | null
          end_date: string | null
          estimated_budget: number | null
          id: string
          start_date: string | null
          title: string
          travelers_count: number | null
          user_id: string
        }
        Insert: {
          ai_generated?: boolean | null
          created_at?: string
          destination_city?: string | null
          destination_country?: string | null
          end_date?: string | null
          estimated_budget?: number | null
          id?: string
          start_date?: string | null
          title: string
          travelers_count?: number | null
          user_id: string
        }
        Update: {
          ai_generated?: boolean | null
          created_at?: string
          destination_city?: string | null
          destination_country?: string | null
          end_date?: string | null
          estimated_budget?: number | null
          id?: string
          start_date?: string | null
          title?: string
          travelers_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
