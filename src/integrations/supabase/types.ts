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
      event_attractions: {
        Row: {
          created_at: string
          event_id: string
          id: string
          image_url: string | null
          name: string
          notes: string | null
          organization_id: string
          performs_on: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          image_url?: string | null
          name: string
          notes?: string | null
          organization_id: string
          performs_on?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          image_url?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          performs_on?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attractions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attractions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_banners: {
        Row: {
          created_at: string
          event_id: string
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          organization_id: string
          placement: Database["public"]["Enums"]["event_banner_placement"]
          sort_order: number
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          organization_id: string
          placement?: Database["public"]["Enums"]["event_banner_placement"]
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          organization_id?: string
          placement?: Database["public"]["Enums"]["event_banner_placement"]
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_banners_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_banners_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_commercial_links: {
        Row: {
          created_at: string
          destination_url: string
          event_date: string | null
          event_id: string
          id: string
          is_active: boolean
          label: string
          link_type: Database["public"]["Enums"]["event_commercial_link_type"]
          organization_id: string
          sort_order: number
          tracking_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          destination_url: string
          event_date?: string | null
          event_id: string
          id?: string
          is_active?: boolean
          label: string
          link_type?: Database["public"]["Enums"]["event_commercial_link_type"]
          organization_id: string
          sort_order?: number
          tracking_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          destination_url?: string
          event_date?: string | null
          event_id?: string
          id?: string
          is_active?: boolean
          label?: string
          link_type?: Database["public"]["Enums"]["event_commercial_link_type"]
          organization_id?: string
          sort_order?: number
          tracking_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_commercial_links_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_commercial_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
      event_hotsite_settings: {
        Row: {
          created_at: string
          cta_primary_label: string | null
          cta_primary_url: string | null
          cta_secondary_label: string | null
          cta_secondary_url: string | null
          event_id: string
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          info_address: string | null
          info_age_rating: string | null
          info_faq: Json
          info_gates_open_at: string | null
          info_map_url: string | null
          info_parking: string | null
          info_rules: string | null
          organization_id: string
          show_banners: boolean
          show_countdown: boolean
          show_experiences: boolean
          show_info: boolean
          show_lineup: boolean
          show_news: boolean
          show_sponsors: boolean
          show_tickets: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_primary_label?: string | null
          cta_primary_url?: string | null
          cta_secondary_label?: string | null
          cta_secondary_url?: string | null
          event_id: string
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          info_address?: string | null
          info_age_rating?: string | null
          info_faq?: Json
          info_gates_open_at?: string | null
          info_map_url?: string | null
          info_parking?: string | null
          info_rules?: string | null
          organization_id: string
          show_banners?: boolean
          show_countdown?: boolean
          show_experiences?: boolean
          show_info?: boolean
          show_lineup?: boolean
          show_news?: boolean
          show_sponsors?: boolean
          show_tickets?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_primary_label?: string | null
          cta_primary_url?: string | null
          cta_secondary_label?: string | null
          cta_secondary_url?: string | null
          event_id?: string
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          info_address?: string | null
          info_age_rating?: string | null
          info_faq?: Json
          info_gates_open_at?: string | null
          info_map_url?: string | null
          info_parking?: string | null
          info_rules?: string | null
          organization_id?: string
          show_banners?: boolean
          show_countdown?: boolean
          show_experiences?: boolean
          show_info?: boolean
          show_lineup?: boolean
          show_news?: boolean
          show_sponsors?: boolean
          show_tickets?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_hotsite_settings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_hotsite_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
      event_news: {
        Row: {
          content: string | null
          created_at: string
          event_id: string
          excerpt: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          organization_id: string
          published_at: string | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["event_news_status"]
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          event_id: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          organization_id: string
          published_at?: string | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["event_news_status"]
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          event_id?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          organization_id?: string
          published_at?: string | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["event_news_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_news_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_news_organization_id_fkey"
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
      event_sponsors: {
        Row: {
          category: Database["public"]["Enums"]["event_sponsor_category"]
          created_at: string
          event_id: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          organization_id: string
          sort_order: number
          updated_at: string
          website_url: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["event_sponsor_category"]
          created_at?: string
          event_id: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          organization_id: string
          sort_order?: number
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["event_sponsor_category"]
          created_at?: string
          event_id?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_sponsors_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_sponsors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          city: string | null
          cover_image_url: string | null
          created_at: string
          ends_at: string | null
          external_ticket_url: string | null
          featured_order: number | null
          format: Database["public"]["Enums"]["event_format"]
          id: string
          instagram_url: string | null
          is_featured: boolean
          kind: Database["public"]["Enums"]["event_kind"]
          long_description: string | null
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
          external_ticket_url?: string | null
          featured_order?: number | null
          format?: Database["public"]["Enums"]["event_format"]
          id?: string
          instagram_url?: string | null
          is_featured?: boolean
          kind?: Database["public"]["Enums"]["event_kind"]
          long_description?: string | null
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
          external_ticket_url?: string | null
          featured_order?: number | null
          format?: Database["public"]["Enums"]["event_format"]
          id?: string
          instagram_url?: string | null
          is_featured?: boolean
          kind?: Database["public"]["Enums"]["event_kind"]
          long_description?: string | null
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
      hotsite_click_events: {
        Row: {
          commercial_link_id: string | null
          created_at: string
          event_id: string | null
          id: string
          kind: Database["public"]["Enums"]["hotsite_click_kind"]
          organization_id: string | null
          promoter_id: string | null
          referrer: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          commercial_link_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["hotsite_click_kind"]
          organization_id?: string | null
          promoter_id?: string | null
          referrer?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          commercial_link_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["hotsite_click_kind"]
          organization_id?: string | null
          promoter_id?: string | null
          referrer?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotsite_click_events_commercial_link_id_fkey"
            columns: ["commercial_link_id"]
            isOneToOne: false
            referencedRelation: "event_commercial_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotsite_click_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotsite_click_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotsite_click_events_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "promoters"
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
      promotions: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          organization_id: string
          promoter_id: string | null
          rules: Json
          title: string
          type: Database["public"]["Enums"]["promotion_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          organization_id: string
          promoter_id?: string | null
          rules?: Json
          title: string
          type: Database["public"]["Enums"]["promotion_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          organization_id?: string
          promoter_id?: string | null
          rules?: Json
          title?: string
          type?: Database["public"]["Enums"]["promotion_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "promoters"
            referencedColumns: ["id"]
          },
        ]
      }
      reservable_space_types: {
        Row: {
          base_price: number | null
          capacity_per_unit: number | null
          category: Database["public"]["Enums"]["space_type_category"]
          created_at: string
          currency: string
          description: string | null
          event_id: string
          id: string
          image_url: string | null
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
          category?: Database["public"]["Enums"]["space_type_category"]
          created_at?: string
          currency?: string
          description?: string | null
          event_id: string
          id?: string
          image_url?: string | null
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
          category?: Database["public"]["Enums"]["space_type_category"]
          created_at?: string
          currency?: string
          description?: string | null
          event_id?: string
          id?: string
          image_url?: string | null
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
          commercial_status: Database["public"]["Enums"]["space_commercial_status"]
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
          commercial_status?: Database["public"]["Enums"]["space_commercial_status"]
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
          commercial_status?: Database["public"]["Enums"]["space_commercial_status"]
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
      site_about: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          memory_body: string | null
          organization_id: string
          origin_body: string | null
          subtitle: string | null
          title: string | null
          today_body: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          memory_body?: string | null
          organization_id: string
          origin_body?: string | null
          subtitle?: string | null
          title?: string | null
          today_body?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          memory_body?: string | null
          organization_id?: string
          origin_body?: string | null
          subtitle?: string | null
          title?: string | null
          today_body?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_about_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      site_contact: {
        Row: {
          created_at: string
          email: string | null
          id: string
          instagram_url: string | null
          institutional_message: string | null
          is_active: boolean
          organization_id: string
          service_message: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          instagram_url?: string | null
          institutional_message?: string | null
          is_active?: boolean
          organization_id: string
          service_message?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          instagram_url?: string | null
          institutional_message?: string | null
          is_active?: boolean
          organization_id?: string
          service_message?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_contact_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      site_home: {
        Row: {
          created_at: string
          cta_primary_label: string | null
          cta_primary_url: string | null
          cta_secondary_label: string | null
          cta_secondary_url: string | null
          experiences_body: string | null
          experiences_headline: string | null
          final_cta_body: string | null
          final_cta_button_label: string | null
          final_cta_button_url: string | null
          final_cta_headline: string | null
          hero_eyebrow: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          is_active: boolean
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_primary_label?: string | null
          cta_primary_url?: string | null
          cta_secondary_label?: string | null
          cta_secondary_url?: string | null
          experiences_body?: string | null
          experiences_headline?: string | null
          final_cta_body?: string | null
          final_cta_button_label?: string | null
          final_cta_button_url?: string | null
          final_cta_headline?: string | null
          hero_eyebrow?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_primary_label?: string | null
          cta_primary_url?: string | null
          cta_secondary_label?: string | null
          cta_secondary_url?: string | null
          experiences_body?: string | null
          experiences_headline?: string | null
          final_cta_body?: string | null
          final_cta_button_label?: string | null
          final_cta_button_url?: string | null
          final_cta_headline?: string | null
          hero_eyebrow?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_home_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      site_memory_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          organization_id: string
          related_event_id: string | null
          sort_order: number
          title: string
          updated_at: string
          year_label: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          organization_id: string
          related_event_id?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          year_label?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          organization_id?: string
          related_event_id?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          year_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_memory_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_memory_items_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      site_menu: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          show_contato: boolean
          show_eventos: boolean
          show_experiencias: boolean
          show_sobre: boolean
          show_ver_agenda: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          show_contato?: boolean
          show_eventos?: boolean
          show_experiencias?: boolean
          show_sobre?: boolean
          show_ver_agenda?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          show_contato?: boolean
          show_eventos?: boolean
          show_experiencias?: boolean
          show_sobre?: boolean
          show_ver_agenda?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_menu_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      site_seo: {
        Row: {
          created_at: string
          description: string | null
          id: string
          og_image_url: string | null
          organization_id: string
          page_key: Database["public"]["Enums"]["site_page"]
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          og_image_url?: string | null
          organization_id: string
          page_key: Database["public"]["Enums"]["site_page"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          og_image_url?: string | null
          organization_id?: string
          page_key?: Database["public"]["Enums"]["site_page"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_seo_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      space_reservation_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          event_id: string
          id: string
          lead_id: string | null
          message: string | null
          metadata: Json
          organization_id: string
          party_size: number | null
          promoter_id: string | null
          promotion_id: string | null
          requester_contact: string
          requester_name: string
          space_id: string | null
          space_type_id: string
          status: Database["public"]["Enums"]["space_reservation_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          event_id: string
          id?: string
          lead_id?: string | null
          message?: string | null
          metadata?: Json
          organization_id: string
          party_size?: number | null
          promoter_id?: string | null
          promotion_id?: string | null
          requester_contact: string
          requester_name: string
          space_id?: string | null
          space_type_id: string
          status?: Database["public"]["Enums"]["space_reservation_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          event_id?: string
          id?: string
          lead_id?: string | null
          message?: string | null
          metadata?: Json
          organization_id?: string
          party_size?: number | null
          promoter_id?: string | null
          promotion_id?: string | null
          requester_contact?: string
          requester_name?: string
          space_id?: string | null
          space_type_id?: string
          status?: Database["public"]["Enums"]["space_reservation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_reservation_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_reservation_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_reservation_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_reservation_requests_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "promoters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_reservation_requests_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_reservation_requests_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "reservable_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_reservation_requests_space_type_id_fkey"
            columns: ["space_type_id"]
            isOneToOne: false
            referencedRelation: "reservable_space_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_site_analytics: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
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
      create_public_space_reservation_request: {
        Args: {
          _event_slug: string
          _message?: string
          _metadata?: Json
          _party_size?: number
          _promoter_code?: string
          _requester_contact: string
          _requester_name: string
          _space_type_id: string
        }
        Returns: string
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
      get_event_hotsite_by_slug: {
        Args: { _slug: string }
        Returns: {
          cta_primary_label: string
          cta_primary_url: string
          cta_secondary_label: string
          cta_secondary_url: string
          event_id: string
          hero_subtitle: string
          hero_title: string
          info_address: string
          info_age_rating: string
          info_faq: Json
          info_gates_open_at: string
          info_map_url: string
          info_parking: string
          info_rules: string
          show_banners: boolean
          show_countdown: boolean
          show_experiences: boolean
          show_info: boolean
          show_lineup: boolean
          show_news: boolean
          show_sponsors: boolean
          show_tickets: boolean
        }[]
      }
      get_event_news_by_slugs: {
        Args: { _event_slug: string; _news_slug: string }
        Returns: {
          content: string
          excerpt: string
          id: string
          image_url: string
          published_at: string
          slug: string
          title: string
        }[]
      }
      get_published_event_by_slug: {
        Args: { _slug: string }
        Returns: {
          city: string
          cover_image_url: string
          ends_at: string
          external_ticket_url: string
          featured_order: number
          format: Database["public"]["Enums"]["event_format"]
          instagram_url: string
          is_featured: boolean
          kind: Database["public"]["Enums"]["event_kind"]
          long_description: string
          short_description: string
          slug: string
          starts_at: string
          title: string
          venue_name: string
        }[]
      }
      get_site_about: {
        Args: never
        Returns: {
          image_url: string
          memory_body: string
          origin_body: string
          subtitle: string
          title: string
          today_body: string
        }[]
      }
      get_site_contact: {
        Args: never
        Returns: {
          email: string
          instagram_url: string
          institutional_message: string
          service_message: string
          whatsapp: string
        }[]
      }
      get_site_home: {
        Args: never
        Returns: {
          cta_primary_label: string
          cta_primary_url: string
          cta_secondary_label: string
          cta_secondary_url: string
          experiences_body: string
          experiences_headline: string
          final_cta_body: string
          final_cta_button_label: string
          final_cta_button_url: string
          final_cta_headline: string
          hero_eyebrow: string
          hero_subtitle: string
          hero_title: string
        }[]
      }
      get_site_menu: {
        Args: never
        Returns: {
          show_contato: boolean
          show_eventos: boolean
          show_experiencias: boolean
          show_sobre: boolean
          show_ver_agenda: boolean
        }[]
      }
      get_site_seo: {
        Args: { _page_key: Database["public"]["Enums"]["site_page"] }
        Returns: {
          description: string
          og_image_url: string
          title: string
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
      list_available_space_types_by_slug: {
        Args: { _slug: string }
        Returns: {
          available_units: number
          base_price: number
          capacity_per_unit: number
          category: Database["public"]["Enums"]["space_type_category"]
          currency: string
          description: string
          image_url: string
          name: string
          space_type_id: string
          total_units: number
        }[]
      }
      list_event_attractions_by_slug: {
        Args: { _slug: string }
        Returns: {
          id: string
          image_url: string
          name: string
          notes: string
          performs_on: string
          sort_order: number
        }[]
      }
      list_event_banners_by_slug: {
        Args: { _slug: string }
        Returns: {
          id: string
          image_url: string
          link_url: string
          placement: Database["public"]["Enums"]["event_banner_placement"]
          sort_order: number
          title: string
        }[]
      }
      list_event_commercial_links_by_slug: {
        Args: { _slug: string }
        Returns: {
          destination_url: string
          event_date: string
          id: string
          label: string
          link_type: Database["public"]["Enums"]["event_commercial_link_type"]
          sort_order: number
          tracking_enabled: boolean
        }[]
      }
      list_event_news_by_slug: {
        Args: { _limit?: number; _slug: string }
        Returns: {
          excerpt: string
          id: string
          image_url: string
          is_featured: boolean
          published_at: string
          slug: string
          title: string
        }[]
      }
      list_event_sponsors_by_slug: {
        Args: { _slug: string }
        Returns: {
          category: Database["public"]["Enums"]["event_sponsor_category"]
          id: string
          logo_url: string
          name: string
          sort_order: number
          website_url: string
        }[]
      }
      list_home_experiences: {
        Args: { _limit?: number }
        Returns: {
          available_units: number
          base_price: number
          category: Database["public"]["Enums"]["space_type_category"]
          currency: string
          event_slug: string
          event_starts_at: string
          event_title: string
          image_url: string
          name: string
          space_type_id: string
        }[]
      }
      list_home_featured_events: {
        Args: never
        Returns: {
          city: string
          cover_image_url: string
          ends_at: string
          featured_order: number
          format: Database["public"]["Enums"]["event_format"]
          is_featured: boolean
          kind: Database["public"]["Enums"]["event_kind"]
          short_description: string
          slug: string
          starts_at: string
          title: string
          venue_name: string
        }[]
      }
      list_home_news: {
        Args: { _limit?: number }
        Returns: {
          event_slug: string
          event_title: string
          excerpt: string
          id: string
          image_url: string
          is_featured: boolean
          published_at: string
          slug: string
          title: string
        }[]
      }
      list_published_events: {
        Args: never
        Returns: {
          city: string
          cover_image_url: string
          ends_at: string
          external_ticket_url: string
          featured_order: number
          format: Database["public"]["Enums"]["event_format"]
          instagram_url: string
          is_featured: boolean
          kind: Database["public"]["Enums"]["event_kind"]
          long_description: string
          short_description: string
          slug: string
          starts_at: string
          title: string
          venue_name: string
        }[]
      }
      list_site_memory_items: {
        Args: never
        Returns: {
          description: string
          id: string
          image_url: string
          related_event_slug: string
          sort_order: number
          title: string
          year_label: string
        }[]
      }
      primary_site_org_id: { Args: never; Returns: string }
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
      set_space_commercial_status: {
        Args: {
          _new_status: Database["public"]["Enums"]["space_commercial_status"]
          _space_id: string
        }
        Returns: {
          capacity: number | null
          code: string
          commercial_status: Database["public"]["Enums"]["space_commercial_status"]
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
        SetofOptions: {
          from: "*"
          to: "reservable_spaces"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_space_reservation_status: {
        Args: {
          _admin_notes?: string
          _new_status: Database["public"]["Enums"]["space_reservation_status"]
          _request_id: string
          _space_id?: string
        }
        Returns: {
          admin_notes: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          event_id: string
          id: string
          lead_id: string | null
          message: string | null
          metadata: Json
          organization_id: string
          party_size: number | null
          promoter_id: string | null
          promotion_id: string | null
          requester_contact: string
          requester_name: string
          space_id: string | null
          space_type_id: string
          status: Database["public"]["Enums"]["space_reservation_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "space_reservation_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      track_hotsite_event: {
        Args: {
          _commercial_link_id?: string
          _event_slug: string
          _kind: Database["public"]["Enums"]["hotsite_click_kind"]
          _promoter_code?: string
          _referrer?: string
          _utm_campaign?: string
          _utm_content?: string
          _utm_medium?: string
          _utm_source?: string
          _utm_term?: string
        }
        Returns: string
      }
      track_public_lead: {
        Args: {
          _contact?: string
          _event_slug: string
          _metadata?: Json
          _name?: string
          _promoter_code?: string
          _source?: Database["public"]["Enums"]["lead_source"]
        }
        Returns: string
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
      event_banner_placement:
        | "below_hero"
        | "between_lineup_tickets"
        | "before_experiences"
        | "before_footer"
      event_commercial_link_type:
        | "ticket"
        | "passport"
        | "sector"
        | "external_space"
        | "other"
      event_format: "recurring" | "one_off"
      event_kind: "festival" | "show" | "special_event" | "other"
      event_news_status: "draft" | "published"
      event_sponsor_category:
        | "master"
        | "sponsor"
        | "supporter"
        | "partner"
        | "realization"
        | "production"
        | "media"
      event_status:
        | "draft"
        | "scheduled"
        | "published"
        | "cancelled"
        | "archived"
      hotsite_click_kind:
        | "page_view"
        | "cta_primary"
        | "cta_secondary"
        | "commercial_link"
        | "reservation_intent"
        | "other"
        | "home_hero_view"
        | "home_hero_click"
        | "home_event_card_click"
        | "home_news_click"
        | "home_experience_click"
        | "home_agenda_click"
        | "home_ticket_click"
        | "home_page_view"
        | "eventos_list_view"
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
      promotion_type: "discount" | "vip_access" | "early_access"
      sector_status: "active" | "inactive" | "archived"
      site_page: "home" | "sobre" | "contato" | "experiencias" | "eventos"
      space_commercial_status:
        | "available"
        | "negotiating"
        | "reserved"
        | "confirmed"
        | "unavailable"
      space_operational_status:
        | "available"
        | "blocked"
        | "maintenance"
        | "inactive"
      space_reservation_status:
        | "pending"
        | "negotiating"
        | "approved"
        | "rejected"
        | "cancelled"
        | "confirmed"
      space_type_category: "camarote" | "bistro" | "mesa" | "outro"
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
      event_banner_placement: [
        "below_hero",
        "between_lineup_tickets",
        "before_experiences",
        "before_footer",
      ],
      event_commercial_link_type: [
        "ticket",
        "passport",
        "sector",
        "external_space",
        "other",
      ],
      event_format: ["recurring", "one_off"],
      event_kind: ["festival", "show", "special_event", "other"],
      event_news_status: ["draft", "published"],
      event_sponsor_category: [
        "master",
        "sponsor",
        "supporter",
        "partner",
        "realization",
        "production",
        "media",
      ],
      event_status: [
        "draft",
        "scheduled",
        "published",
        "cancelled",
        "archived",
      ],
      hotsite_click_kind: [
        "page_view",
        "cta_primary",
        "cta_secondary",
        "commercial_link",
        "reservation_intent",
        "other",
        "home_hero_view",
        "home_hero_click",
        "home_event_card_click",
        "home_news_click",
        "home_experience_click",
        "home_agenda_click",
        "home_ticket_click",
        "home_page_view",
        "eventos_list_view",
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
      promotion_type: ["discount", "vip_access", "early_access"],
      sector_status: ["active", "inactive", "archived"],
      site_page: ["home", "sobre", "contato", "experiencias", "eventos"],
      space_commercial_status: [
        "available",
        "negotiating",
        "reserved",
        "confirmed",
        "unavailable",
      ],
      space_operational_status: [
        "available",
        "blocked",
        "maintenance",
        "inactive",
      ],
      space_reservation_status: [
        "pending",
        "negotiating",
        "approved",
        "rejected",
        "cancelled",
        "confirmed",
      ],
      space_type_category: ["camarote", "bistro", "mesa", "outro"],
      space_type_status: ["active", "inactive", "archived"],
    },
  },
} as const
