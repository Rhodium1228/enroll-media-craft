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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      branch_schedule_overrides: {
        Row: {
          branch_id: string
          created_at: string
          date: string
          id: string
          override_type: string
          reason: string | null
          time_slots: Json | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          date: string
          id?: string
          override_type: string
          reason?: string | null
          time_slots?: Json | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          date?: string
          id?: string
          override_type?: string
          reason?: string | null
          time_slots?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_schedule_overrides_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string
          appointment_padding: number | null
          compliance_docs: Json | null
          created_at: string
          created_by: string | null
          email: string
          gallery: Json | null
          hero_image_url: string | null
          id: string
          logo_url: string | null
          name: string
          open_hours: Json
          phone: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address: string
          appointment_padding?: number | null
          compliance_docs?: Json | null
          created_at?: string
          created_by?: string | null
          email: string
          gallery?: Json | null
          hero_image_url?: string | null
          id?: string
          logo_url?: string | null
          name: string
          open_hours?: Json
          phone: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string
          appointment_padding?: number | null
          compliance_docs?: Json | null
          created_at?: string
          created_by?: string | null
          email?: string
          gallery?: Json | null
          hero_image_url?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          open_hours?: Json
          phone?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          branch_id: string
          cost: number
          created_at: string
          duration: number
          id: string
          image_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          cost: number
          created_at?: string
          duration: number
          id?: string
          image_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          cost?: number
          created_at?: string
          duration?: number
          id?: string
          image_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          created_by: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string
          profile_image_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          email: string
          first_name: string
          id?: string
          last_name: string
          phone: string
          profile_image_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
          profile_image_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_branches: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          staff_id: string
          updated_at: string
          working_hours: Json
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          staff_id: string
          updated_at?: string
          working_hours?: Json
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          staff_id?: string
          updated_at?: string
          working_hours?: Json
        }
        Relationships: [
          {
            foreignKeyName: "staff_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_branches_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_leave_requests: {
        Row: {
          created_at: string
          end_date: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string | null
          staff_id: string
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          staff_id: string
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          staff_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_schedule_overrides: {
        Row: {
          branch_id: string
          created_at: string
          date: string
          id: string
          override_type: Database["public"]["Enums"]["override_type"]
          reason: string | null
          staff_id: string
          time_slots: Json | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          date: string
          id?: string
          override_type: Database["public"]["Enums"]["override_type"]
          reason?: string | null
          staff_id: string
          time_slots?: Json | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          date?: string
          id?: string
          override_type?: Database["public"]["Enums"]["override_type"]
          reason?: string | null
          staff_id?: string
          time_slots?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_schedule_overrides_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_schedule_overrides_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_services: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          service_id: string
          staff_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          service_id: string
          staff_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          service_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_services_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_services_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      leave_status: "pending" | "approved" | "rejected"
      leave_type: "vacation" | "sick" | "personal" | "other"
      override_type: "available" | "unavailable" | "custom_hours"
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
    Enums: {
      leave_status: ["pending", "approved", "rejected"],
      leave_type: ["vacation", "sick", "personal", "other"],
      override_type: ["available", "unavailable", "custom_hours"],
    },
  },
} as const
