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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          address: string
          created_at: string
          customer_since: string
          email: string
          equipment: Json
          id: string
          name: string
          notes: string
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string
          created_at?: string
          customer_since?: string
          email?: string
          equipment?: Json
          id?: string
          name: string
          notes?: string
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          address?: string
          created_at?: string
          customer_since?: string
          email?: string
          equipment?: Json
          id?: string
          name?: string
          notes?: string
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      intake_tokens: {
        Row: {
          created_at: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          token?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string
          customer_id: string | null
          due_date: string
          estimate_id: string | null
          id: string
          items: Json
          job_id: string | null
          number: string
          paid_at: string | null
          paid_method: string | null
          status: string
          stripe_session_id: string | null
          tax_rate: number
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          due_date?: string
          estimate_id?: string | null
          id?: string
          items?: Json
          job_id?: string | null
          number: string
          paid_at?: string | null
          paid_method?: string | null
          status?: string
          stripe_session_id?: string | null
          tax_rate?: number
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          due_date?: string
          estimate_id?: string | null
          id?: string
          items?: Json
          job_id?: string | null
          number?: string
          paid_at?: string | null
          paid_method?: string | null
          status?: string
          stripe_session_id?: string | null
          tax_rate?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          activity: Json
          address: string
          checklist: Json
          contact_phone: string
          created_at: string
          customer_id: string | null
          customer_name: string
          duration_hrs: number
          id: string
          notes: string
          photos: Json
          priority: string
          scheduled_date: string | null
          service_type: string
          signature: string | null
          source: string
          start_hour: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity?: Json
          address?: string
          checklist?: Json
          contact_phone?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          duration_hrs?: number
          id?: string
          notes?: string
          photos?: Json
          priority?: string
          scheduled_date?: string | null
          service_type?: string
          signature?: string | null
          source?: string
          start_hour?: number
          status?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          activity?: Json
          address?: string
          checklist?: Json
          contact_phone?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          duration_hrs?: number
          id?: string
          notes?: string
          photos?: Json
          priority?: string
          scheduled_date?: string | null
          service_type?: string
          signature?: string | null
          source?: string
          start_hour?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      mileage_logs: {
        Row: {
          address_from: string
          address_to: string
          created_at: string
          elapsed_seconds: number | null
          end_at: string | null
          end_odometer: number | null
          id: string
          purpose: string
          start_at: string
          start_odometer: number
          user_id: string
        }
        Insert: {
          address_from?: string
          address_to?: string
          created_at?: string
          elapsed_seconds?: number | null
          end_at?: string | null
          end_odometer?: number | null
          id?: string
          purpose?: string
          start_at?: string
          start_odometer: number
          user_id?: string
        }
        Update: {
          address_from?: string
          address_to?: string
          created_at?: string
          elapsed_seconds?: number | null
          end_at?: string | null
          end_odometer?: number | null
          id?: string
          purpose?: string
          start_at?: string
          start_odometer?: number
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
