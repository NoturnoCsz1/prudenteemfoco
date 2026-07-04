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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          metadata: Json
          organization_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json
          organization_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json
          organization_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sectors: {
        Row: {
          capacity: number | null
          created_at: string
          description: string | null
          event_id: string
          id: string
          name: string
          organization_id: string
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["sector_status"]
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          name: string
          organization_id: string
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["sector_status"]
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          name?: string
          organization_id?: string
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["sector_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_sectors_event_org_fk"
            columns: ["event_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      events: {
        Row: {
          city: string | null
          cover_image_url: string | null
          created_at: string
          ends_at: string | null
          id: string
          organization_id: string
          short_description: string | null
          slug: string
          starts_at: string | null
          status: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at: string
          venue_name: string | null
        }
        Insert: {
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          organization_id: string
          short_description?: string | null
          slug: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at?: string
          venue_name?: string | null
        }
        Update: {
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          organization_id?: string
          short_description?: string | null
          slug?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          updated_at?: string
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          status: Database["public"]["Enums"]["org_status"]
          type: Database["public"]["Enums"]["org_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: Database["public"]["Enums"]["org_status"]
          type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["org_status"]
          type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reservable_space_types: {
        Row: {
          base_price: number | null
          capacity_per_unit: number | null
          created_at: string
          currency: string
          description: string | null
          event_id: string
          id: string
          name: string
          organization_id: string
          sector_id: string | null
          sort_order: number
          status: Database["public"]["Enums"]["space_type_status"]
          updated_at: string
        }
        Insert: {
          base_price?: number | null
          capacity_per_unit?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          event_id: string
          id?: string
          name: string
          organization_id: string
          sector_id?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["space_type_status"]
          updated_at?: string
        }
        Update: {
          base_price?: number | null
          capacity_per_unit?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          event_id?: string
          id?: string
          name?: string
          organization_id?: string
          sector_id?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["space_type_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rst_event_org_fk"
            columns: ["event_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "rst_sector_same_event_fk"
            columns: ["sector_id", "event_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "event_sectors"
            referencedColumns: ["id", "event_id", "organization_id"]
          },
        ]
      }
      reservable_spaces: {
        Row: {
          capacity: number | null
          code: string
          created_at: string
          display_name: string | null
          event_id: string
          id: string
          notes: string | null
          operational_status: Database["public"]["Enums"]["space_operational_status"]
          organization_id: string
          sector_id: string | null
          sort_order: number
          space_type_id: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          code: string
          created_at?: string
          display_name?: string | null
          event_id: string
          id?: string
          notes?: string | null
          operational_status?: Database["public"]["Enums"]["space_operational_status"]
          organization_id: string
          sector_id?: string | null
          sort_order?: number
          space_type_id: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          code?: string
          created_at?: string
          display_name?: string | null
          event_id?: string
          id?: string
          notes?: string | null
          operational_status?: Database["public"]["Enums"]["space_operational_status"]
          organization_id?: string
          sector_id?: string | null
          sort_order?: number
          space_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rs_sector_same_event_fk"
            columns: ["sector_id", "event_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "event_sectors"
            referencedColumns: ["id", "event_id", "organization_id"]
          },
          {
            foreignKeyName: "rs_type_same_event_fk"
            columns: ["space_type_id", "event_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "reservable_space_types"
            referencedColumns: ["id", "event_id", "organization_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_event_cover: { Args: { _path: string }; Returns: boolean }
      claim_first_owner: { Args: { _org_slug: string }; Returns: string }
      current_user_org: {
        Args: never
        Returns: {
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          status: Database["public"]["Enums"]["member_status"]
        }[]
      }
      generate_reservable_spaces: {
        Args: {
          _pad?: number
          _prefix: string
          _quantity: number
          _space_type_id: string
          _start_number?: number
        }
        Returns: {
          created_count: number
          skipped_count: number
        }[]
      }
      get_published_event_by_slug: {
        Args: { _slug: string }
        Returns: {
          city: string
          cover_image_url: string
          ends_at: string
          short_description: string
          slug: string
          starts_at: string
          title: string
          venue_name: string
        }[]
      }
      has_org_role_at_least: {
        Args: {
          _min_role: Database["public"]["Enums"]["member_role"]
          _org_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_active_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      list_published_events: {
        Args: never
        Returns: {
          city: string
          cover_image_url: string
          ends_at: string
          short_description: string
          slug: string
          starts_at: string
          title: string
          venue_name: string
        }[]
      }
      record_audit_event: {
        Args: {
          _action: string
          _actor_user_id: string
          _entity_id: string
          _entity_type: string
          _ip?: unknown
          _metadata?: Json
          _organization_id: string
          _user_agent?: string
        }
        Returns: string
      }
      role_rank: {
        Args: { _role: Database["public"]["Enums"]["member_role"] }
        Returns: number
      }
    }
    Enums: {
      event_status:
        | "draft"
        | "scheduled"
        | "published"
        | "cancelled"
        | "archived"
      member_role: "owner" | "admin" | "manager" | "operator" | "viewer"
      member_status: "active" | "invited" | "suspended" | "removed"
      org_status: "active" | "inactive" | "archived"
      org_type: "institutional" | "partner" | "other"
      sector_status: "active" | "inactive" | "archived"
      space_operational_status:
        | "available"
        | "blocked"
        | "maintenance"
        | "inactive"
      space_type_status: "active" | "inactive" | "archived"
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
      event_status: [
        "draft",
        "scheduled",
        "published",
        "cancelled",
        "archived",
      ],
      member_role: ["owner", "admin", "manager", "operator", "viewer"],
      member_status: ["active", "invited", "suspended", "removed"],
      org_status: ["active", "inactive", "archived"],
      org_type: ["institutional", "partner", "other"],
      sector_status: ["active", "inactive", "archived"],
      space_operational_status: [
        "available",
        "blocked",
        "maintenance",
        "inactive",
      ],
      space_type_status: ["active", "inactive", "archived"],
    },
  },
} as const
