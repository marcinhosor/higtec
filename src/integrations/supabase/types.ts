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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          client_id: string
          client_name: string
          collaborator_id: string | null
          collaborator_name: string | null
          company_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
          service: string | null
          status: string | null
          time: string
          updated_at: string
        }
        Insert: {
          client_id: string
          client_name: string
          collaborator_id?: string | null
          collaborator_name?: string | null
          company_id: string
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          service?: string | null
          status?: string | null
          time: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          client_name?: string
          collaborator_id?: string | null
          collaborator_name?: string | null
          company_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          service?: string | null
          status?: string | null
          time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          company_id: string
          complement: string | null
          created_at: string
          id: string
          name: string
          neighborhood: string | null
          number: string | null
          observations: string | null
          phone: string | null
          property_type: string | null
          service_history: Json | null
          state: string | null
          street: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id: string
          complement?: string | null
          created_at?: string
          id?: string
          name: string
          neighborhood?: string | null
          number?: string | null
          observations?: string | null
          phone?: string | null
          property_type?: string | null
          service_history?: Json | null
          state?: string | null
          street?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string
          complement?: string | null
          created_at?: string
          id?: string
          name?: string
          neighborhood?: string | null
          number?: string | null
          observations?: string | null
          phone?: string | null
          property_type?: string | null
          service_history?: Json | null
          state?: string | null
          street?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborators: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          phone: string | null
          role: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborators_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          access_code: string
          address: string | null
          bank_data: Json | null
          city: string | null
          cnpj: string | null
          company_description: string | null
          created_at: string
          custom_theme: Json | null
          differentials: string | null
          email: string | null
          execution_method: string | null
          facebook: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          name: string
          neighborhood: string | null
          phone: string | null
          pix_keys: Json | null
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          proposal_text: string | null
          selected_theme_id: string | null
          service_guarantee: string | null
          signature_url: string | null
          state: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          technical_recommendation: string | null
          trial_ends_at: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          access_code?: string
          address?: string | null
          bank_data?: Json | null
          city?: string | null
          cnpj?: string | null
          company_description?: string | null
          created_at?: string
          custom_theme?: Json | null
          differentials?: string | null
          email?: string | null
          execution_method?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name: string
          neighborhood?: string | null
          phone?: string | null
          pix_keys?: Json | null
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          proposal_text?: string | null
          selected_theme_id?: string | null
          service_guarantee?: string | null
          signature_url?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          technical_recommendation?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          access_code?: string
          address?: string | null
          bank_data?: Json | null
          city?: string | null
          cnpj?: string | null
          company_description?: string | null
          created_at?: string
          custom_theme?: Json | null
          differentials?: string | null
          email?: string | null
          execution_method?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name?: string
          neighborhood?: string | null
          phone?: string | null
          pix_keys?: Json | null
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          proposal_text?: string | null
          selected_theme_id?: string | null
          service_guarantee?: string | null
          signature_url?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          technical_recommendation?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      company_memberships: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          company_id: string
          created_at: string
          id: string
          maintenance_cost: number | null
          model: string | null
          name: string
          next_maintenance_date: string | null
          observations: string | null
          purchase_cost: number | null
          purchase_date: string | null
          serial_number: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          maintenance_cost?: number | null
          model?: string | null
          name: string
          next_maintenance_date?: string | null
          observations?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          maintenance_cost?: number | null
          model?: string | null
          name?: string
          next_maintenance_date?: string | null
          observations?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturers: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "manufacturers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string
          created_at: string
          dismissed: boolean
          entity_id: string | null
          entity_type: string | null
          id: string
          level: string
          message: string
          read: boolean
          title: string
          type: string
          updated_at: string
          whatsapp_sent: boolean
        }
        Insert: {
          company_id: string
          created_at?: string
          dismissed?: boolean
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          level?: string
          message: string
          read?: boolean
          title: string
          type: string
          updated_at?: string
          whatsapp_sent?: boolean
        }
        Update: {
          company_id?: string
          created_at?: string
          dismissed?: boolean
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          level?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          updated_at?: string
          whatsapp_sent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          company_id: string
          consumption_history: Json | null
          cost_per_liter: number | null
          created_at: string
          current_stock_ml: number | null
          dilution: string | null
          id: string
          last_restock_date: string | null
          manufacturer: string | null
          min_stock_ml: number | null
          name: string
          ph: number | null
          stock_status: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          consumption_history?: Json | null
          cost_per_liter?: number | null
          created_at?: string
          current_stock_ml?: number | null
          dilution?: string | null
          id?: string
          last_restock_date?: string | null
          manufacturer?: string | null
          min_stock_ml?: number | null
          name: string
          ph?: number | null
          stock_status?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          consumption_history?: Json | null
          cost_per_liter?: number | null
          created_at?: string
          current_stock_ml?: number | null
          dilution?: string | null
          id?: string
          last_restock_date?: string | null
          manufacturer?: string | null
          min_stock_ml?: number | null
          name?: string
          ph?: number | null
          stock_status?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          client_id: string
          client_name: string
          company_id: string
          created_at: string
          discount: number | null
          discount_type: string | null
          id: string
          notes: string | null
          payment_method: string | null
          quote_number: number
          services: Json | null
          status: string | null
          updated_at: string
          validity_days: number | null
        }
        Insert: {
          client_id: string
          client_name: string
          company_id: string
          created_at?: string
          discount?: number | null
          discount_type?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          quote_number?: number
          services?: Json | null
          status?: string | null
          updated_at?: string
          validity_days?: number | null
        }
        Update: {
          client_id?: string
          client_name?: string
          company_id?: string
          created_at?: string
          discount?: number | null
          discount_type?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          quote_number?: number
          services?: Json | null
          status?: string | null
          updated_at?: string
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      service_executions: {
        Row: {
          appointment_id: string
          collaborator_id: string | null
          collaborator_name: string | null
          company_id: string
          created_at: string
          elapsed_seconds: number | null
          fiber_type: string | null
          finished_at: string | null
          id: string
          non_conformities: Json | null
          observations: string | null
          photos_after: Json | null
          photos_before: Json | null
          process_description: string | null
          products_used: Json | null
          soiling_level: string | null
          soiling_types: Json | null
          started_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          appointment_id: string
          collaborator_id?: string | null
          collaborator_name?: string | null
          company_id: string
          created_at?: string
          elapsed_seconds?: number | null
          fiber_type?: string | null
          finished_at?: string | null
          id?: string
          non_conformities?: Json | null
          observations?: string | null
          photos_after?: Json | null
          photos_before?: Json | null
          process_description?: string | null
          products_used?: Json | null
          soiling_level?: string | null
          soiling_types?: Json | null
          started_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          collaborator_id?: string | null
          collaborator_name?: string | null
          company_id?: string
          created_at?: string
          elapsed_seconds?: number | null
          fiber_type?: string | null
          finished_at?: string | null
          id?: string
          non_conformities?: Json | null
          observations?: string | null
          photos_after?: Json | null
          photos_before?: Json | null
          process_description?: string | null
          products_used?: Json | null
          soiling_level?: string | null
          soiling_types?: Json | null
          started_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_executions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      service_types: {
        Row: {
          company_id: string
          created_at: string
          default_price: number | null
          estimated_minutes: number | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          default_price?: number | null
          estimated_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          default_price?: number | null
          estimated_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      technicians: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          pin: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          pin: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          pin?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technicians_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_trips: {
        Row: {
          actual_cost: number | null
          actual_distance_km: number | null
          appointment_id: string | null
          checkin_at: string | null
          checkin_lat: number | null
          checkin_lng: number | null
          checkout_at: string | null
          checkout_lat: number | null
          checkout_lng: number | null
          collaborator_id: string | null
          company_id: string
          created_at: string
          destination_address: string | null
          destination_lat: number | null
          destination_lng: number | null
          deviation_details: string | null
          estimated_cost: number | null
          estimated_distance_km: number | null
          id: string
          origin_address: string | null
          origin_lat: number | null
          origin_lng: number | null
          route_deviation: boolean | null
          status: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          actual_cost?: number | null
          actual_distance_km?: number | null
          appointment_id?: string | null
          checkin_at?: string | null
          checkin_lat?: number | null
          checkin_lng?: number | null
          checkout_at?: string | null
          checkout_lat?: number | null
          checkout_lng?: number | null
          collaborator_id?: string | null
          company_id: string
          created_at?: string
          destination_address?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          deviation_details?: string | null
          estimated_cost?: number | null
          estimated_distance_km?: number | null
          id?: string
          origin_address?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          route_deviation?: boolean | null
          status?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          actual_cost?: number | null
          actual_distance_km?: number | null
          appointment_id?: string | null
          checkin_at?: string | null
          checkin_lat?: number | null
          checkin_lng?: number | null
          checkout_at?: string | null
          checkout_lat?: number | null
          checkout_lng?: number | null
          collaborator_id?: string | null
          company_id?: string
          created_at?: string
          destination_address?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          deviation_details?: string | null
          estimated_cost?: number | null
          estimated_distance_km?: number | null
          id?: string
          origin_address?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          route_deviation?: boolean | null
          status?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_trips_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_trips_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          avg_consumption_km_l: number
          collaborator_id: string | null
          company_id: string
          created_at: string
          fuel_price_per_liter: number
          fuel_type: string
          id: string
          model: string
          notes: string | null
          plate: string
          updated_at: string
        }
        Insert: {
          avg_consumption_km_l?: number
          collaborator_id?: string | null
          company_id: string
          created_at?: string
          fuel_price_per_liter?: number
          fuel_type?: string
          id?: string
          model?: string
          notes?: string | null
          plate?: string
          updated_at?: string
        }
        Update: {
          avg_consumption_km_l?: number
          collaborator_id?: string | null
          company_id?: string
          created_at?: string
          fuel_price_per_liter?: number
          fuel_type?: string
          id?: string
          model?: string
          notes?: string | null
          plate?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_access_code: { Args: never; Returns: string }
      get_technicians_by_code: {
        Args: { _code: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_admin_password: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_master_admin: { Args: { _user_id: string }; Returns: boolean }
      set_admin_password: { Args: { _password: string }; Returns: boolean }
      technician_login: {
        Args: { _code: string; _pin: string; _technician_id: string }
        Returns: Json
      }
      verify_admin_password: { Args: { _password: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "technician" | "viewer"
      plan_tier: "free" | "pro" | "premium"
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
      app_role: ["admin", "technician", "viewer"],
      plan_tier: ["free", "pro", "premium"],
    },
  },
} as const
