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
      access_attempts: {
        Row: {
          created_at: string
          decided_at: string | null
          decision_reason: string | null
          event_id: string
          id: string
          organization_id: string
          requested_by: string | null
          rule_applied: string | null
          status: Database["public"]["Enums"]["access_attempt_status"]
          subject_id: string
          subject_type: Database["public"]["Enums"]["access_subject_type"]
          target_id: string
          target_type: Database["public"]["Enums"]["access_target_type"]
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decision_reason?: string | null
          event_id: string
          id?: string
          organization_id: string
          requested_by?: string | null
          rule_applied?: string | null
          status?: Database["public"]["Enums"]["access_attempt_status"]
          subject_id: string
          subject_type: Database["public"]["Enums"]["access_subject_type"]
          target_id: string
          target_type: Database["public"]["Enums"]["access_target_type"]
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decision_reason?: string | null
          event_id?: string
          id?: string
          organization_id?: string
          requested_by?: string | null
          rule_applied?: string | null
          status?: Database["public"]["Enums"]["access_attempt_status"]
          subject_id?: string
          subject_type?: Database["public"]["Enums"]["access_subject_type"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["access_target_type"]
        }
        Relationships: [
          {
            foreignKeyName: "access_attempts_event_org_fk"
            columns: ["event_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      access_decision_cache: {
        Row: {
          created_at: string
          decision: Database["public"]["Enums"]["access_attempt_status"]
          decision_reason: string | null
          event_id: string
          expires_at: string
          id: string
          organization_id: string
          rule_applied: string | null
          subject_id: string
          subject_type: Database["public"]["Enums"]["access_subject_type"]
          target_id: string
          target_type: Database["public"]["Enums"]["access_target_type"]
        }
        Insert: {
          created_at?: string
          decision: Database["public"]["Enums"]["access_attempt_status"]
          decision_reason?: string | null
          event_id: string
          expires_at: string
          id?: string
          organization_id: string
          rule_applied?: string | null
          subject_id: string
          subject_type: Database["public"]["Enums"]["access_subject_type"]
          target_id: string
          target_type: Database["public"]["Enums"]["access_target_type"]
        }
        Update: {
          created_at?: string
          decision?: Database["public"]["Enums"]["access_attempt_status"]
          decision_reason?: string | null
          event_id?: string
          expires_at?: string
          id?: string
          organization_id?: string
          rule_applied?: string | null
          subject_id?: string
          subject_type?: Database["public"]["Enums"]["access_subject_type"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["access_target_type"]
        }
        Relationships: [
          {
            foreignKeyName: "access_cache_event_org_fk"
            columns: ["event_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      access_sessions: {
        Row: {
          attempt_id: string | null
          consumed_at: string | null
          created_at: string
          event_id: string
          id: string
          organization_id: string
          reason: string | null
          sector_id: string | null
          space_id: string | null
          status: Database["public"]["Enums"]["access_session_status"]
          subject_id: string
          subject_type: Database["public"]["Enums"]["access_subject_type"]
          token_id: string | null
        }
        Insert: {
          attempt_id?: string | null
          consumed_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          organization_id: string
          reason?: string | null
          sector_id?: string | null
          space_id?: string | null
          status?: Database["public"]["Enums"]["access_session_status"]
          subject_id: string
          subject_type: Database["public"]["Enums"]["access_subject_type"]
          token_id?: string | null
        }
        Update: {
          attempt_id?: string | null
          consumed_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          organization_id?: string
          reason?: string | null
          sector_id?: string | null
          space_id?: string | null
          status?: Database["public"]["Enums"]["access_session_status"]
          subject_id?: string
          subject_type?: Database["public"]["Enums"]["access_subject_type"]
          token_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_sessions_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "access_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_sessions_event_org_fk"
            columns: ["event_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "access_sessions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "access_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      access_tokens: {
        Row: {
          capacity_limit: number | null
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          label: string | null
          organization_id: string
          revoked_at: string | null
          status: Database["public"]["Enums"]["access_token_status"]
          subject_id: string | null
          subject_type:
            | Database["public"]["Enums"]["access_subject_type"]
            | null
          target_id: string
          target_type: Database["public"]["Enums"]["access_target_type"]
          token_hash: string
          usage_count: number
        }
        Insert: {
          capacity_limit?: number | null
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          label?: string | null
          organization_id: string
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["access_token_status"]
          subject_id?: string | null
          subject_type?:
            | Database["public"]["Enums"]["access_subject_type"]
            | null
          target_id: string
          target_type: Database["public"]["Enums"]["access_target_type"]
          token_hash: string
          usage_count?: number
        }
        Update: {
          capacity_limit?: number | null
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          label?: string | null
          organization_id?: string
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["access_token_status"]
          subject_id?: string | null
          subject_type?:
            | Database["public"]["Enums"]["access_subject_type"]
            | null
          target_id?: string
          target_type?: Database["public"]["Enums"]["access_target_type"]
          token_hash?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "access_tokens_event_org_fk"
            columns: ["event_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
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
      event_access_rules: {
        Row: {
          conditions: Json
          created_at: string
          event_id: string
          id: string
          organization_id: string
          rule_type: Database["public"]["Enums"]["access_rule_type"]
          target: Database["public"]["Enums"]["access_rule_target"]
          updated_at: string
        }
        Insert: {
          conditions?: Json
          created_at?: string
          event_id: string
          id?: string
          organization_id: string
          rule_type: Database["public"]["Enums"]["access_rule_type"]
          target: Database["public"]["Enums"]["access_rule_target"]
          updated_at?: string
        }
        Update: {
          conditions?: Json
          created_at?: string
          event_id?: string
          id?: string
          organization_id?: string
          rule_type?: Database["public"]["Enums"]["access_rule_type"]
          target?: Database["public"]["Enums"]["access_rule_target"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_access_rules_event_org_fk"
            columns: ["event_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      event_credentials: {
        Row: {
          access_scope: Json
          created_at: string
          document_id: string | null
          event_id: string
          holder_name: string
          id: string
          organization_id: string
          role_type: Database["public"]["Enums"]["credential_role_type"]
          status: Database["public"]["Enums"]["credential_status"]
          updated_at: string
        }
        Insert: {
          access_scope?: Json
          created_at?: string
          document_id?: string | null
          event_id: string
          holder_name: string
          id?: string
          organization_id: string
          role_type?: Database["public"]["Enums"]["credential_role_type"]
          status?: Database["public"]["Enums"]["credential_status"]
          updated_at?: string
        }
        Update: {
          access_scope?: Json
          created_at?: string
          document_id?: string | null
          event_id?: string
          holder_name?: string
          id?: string
          organization_id?: string
          role_type?: Database["public"]["Enums"]["credential_role_type"]
          status?: Database["public"]["Enums"]["credential_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_credentials_event_org_fk"
            columns: ["event_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      event_invites: {
        Row: {
          created_at: string
          email: string | null
          event_id: string
          id: string
          metadata: Json
          name: string
          organization_id: string
          phone: string | null
          status: Database["public"]["Enums"]["invite_status"]
          type: Database["public"]["Enums"]["invite_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_id: string
          id?: string
          metadata?: Json
          name: string
          organization_id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          type?: Database["public"]["Enums"]["invite_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          event_id?: string
          id?: string
          metadata?: Json
          name?: string
          organization_id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          type?: Database["public"]["Enums"]["invite_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_invites_event_org_fk"
            columns: ["event_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "organization_id"]
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
      leads: {
        Row: {
          contact: string | null
          created_at: string
          event_id: string
          id: string
          metadata: Json
          name: string | null
          organization_id: string
          promoter_id: string | null
          source: Database["public"]["Enums"]["lead_source"]
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          contact?: string | null
          created_at?: string
          event_id: string
          id?: string
          metadata?: Json
          name?: string | null
          organization_id: string
          promoter_id?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          contact?: string | null
          created_at?: string
          event_id?: string
          id?: string
          metadata?: Json
          name?: string | null
          organization_id?: string
          promoter_id?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "promoters"
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
      promoters: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          name: string
          notes: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promoters_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promoters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      consume_access_session: {
        Args: { _session_id: string }
        Returns: undefined
      }
      create_access_token: {
        Args: {
          _capacity_limit?: number
          _event_id: string
          _label?: string
          _subject_id?: string
          _subject_type?: Database["public"]["Enums"]["access_subject_type"]
          _target_id: string
          _target_type: Database["public"]["Enums"]["access_target_type"]
        }
        Returns: {
          token_id: string
          token_plain: string
        }[]
      }
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
      invite_org_member: {
        Args: {
          _email: string
          _org_id: string
          _role: Database["public"]["Enums"]["member_role"]
        }
        Returns: string
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
      process_access_attempt: {
        Args: {
          _event_id: string
          _subject_id: string
          _subject_type: Database["public"]["Enums"]["access_subject_type"]
          _target_id: string
          _target_type: Database["public"]["Enums"]["access_target_type"]
        }
        Returns: {
          attempt_id: string
          decision: Database["public"]["Enums"]["access_attempt_status"]
          reason: string
          rule_applied: string
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
      redeem_access_token: {
        Args: {
          _subject_id?: string
          _subject_type?: Database["public"]["Enums"]["access_subject_type"]
          _token_plain: string
        }
        Returns: {
          attempt_id: string
          reason: string
          remaining_capacity: number
          rule_applied: string
          session_id: string
          status: Database["public"]["Enums"]["access_session_status"]
        }[]
      }
      remove_org_member: { Args: { _member_id: string }; Returns: undefined }
      revoke_access_token: { Args: { _token_id: string }; Returns: undefined }
      role_rank: {
        Args: { _role: Database["public"]["Enums"]["member_role"] }
        Returns: number
      }
      update_member_role: {
        Args: {
          _member_id: string
          _role: Database["public"]["Enums"]["member_role"]
        }
        Returns: undefined
      }
    }
    Enums: {
      access_attempt_status: "processing" | "allowed" | "denied"
      access_rule_target: "invite" | "credential" | "sector" | "space"
      access_rule_type: "allow" | "deny"
      access_session_status: "active" | "consumed" | "blocked"
      access_subject_type: "invite" | "credential" | "user"
      access_target_type: "event" | "sector" | "space"
      access_token_status: "active" | "revoked" | "expired"
      credential_role_type:
        | "staff"
        | "security"
        | "production"
        | "artist"
        | "supplier"
        | "press"
      credential_status: "active" | "inactive"
      event_status:
        | "draft"
        | "scheduled"
        | "published"
        | "cancelled"
        | "archived"
      invite_status: "active" | "revoked" | "used" | "expired"
      invite_type:
        | "guest"
        | "influencer"
        | "sponsor"
        | "press"
        | "partner"
        | "artist"
        | "production"
      lead_source: "roxou" | "direct" | "instagram" | "promoter" | "other"
      lead_status: "new" | "interested" | "converted" | "lost"
      member_role:
        | "owner"
        | "admin"
        | "promoter"
        | "manager"
        | "operator"
        | "viewer"
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
      access_attempt_status: ["processing", "allowed", "denied"],
      access_rule_target: ["invite", "credential", "sector", "space"],
      access_rule_type: ["allow", "deny"],
      access_session_status: ["active", "consumed", "blocked"],
      access_subject_type: ["invite", "credential", "user"],
      access_target_type: ["event", "sector", "space"],
      access_token_status: ["active", "revoked", "expired"],
      credential_role_type: [
        "staff",
        "security",
        "production",
        "artist",
        "supplier",
        "press",
      ],
      credential_status: ["active", "inactive"],
      event_status: [
        "draft",
        "scheduled",
        "published",
        "cancelled",
        "archived",
      ],
      invite_status: ["active", "revoked", "used", "expired"],
      invite_type: [
        "guest",
        "influencer",
        "sponsor",
        "press",
        "partner",
        "artist",
        "production",
      ],
      lead_source: ["roxou", "direct", "instagram", "promoter", "other"],
      lead_status: ["new", "interested", "converted", "lost"],
      member_role: [
        "owner",
        "admin",
        "promoter",
        "manager",
        "operator",
        "viewer",
      ],
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
