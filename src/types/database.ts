// ============================================================
// Supabase Database Type Definitions
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          plan: string;
          onboarding_completed: boolean;
          onboarding_step: number;
          product_tour_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          plan?: string;
          onboarding_completed?: boolean;
          onboarding_step?: number;
          product_tour_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          plan?: string;
          onboarding_completed?: boolean;
          onboarding_step?: number;
          product_tour_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          organization_id: string | null;
          email: string;
          display_name: string | null;
          role: string;
          created_at: string;
        };
        Insert: {
          id: string;
          organization_id?: string | null;
          email: string;
          display_name?: string | null;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          email?: string;
          display_name?: string | null;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      line_accounts: {
        Row: {
          id: string;
          organization_id: string | null;
          channel_name: string;
          channel_id: string;
          channel_secret: string;
          channel_access_token: string;
          webhook_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          channel_name: string;
          channel_id: string;
          channel_secret: string;
          channel_access_token: string;
          webhook_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          channel_name?: string;
          channel_id?: string;
          channel_secret?: string;
          channel_access_token?: string;
          webhook_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      friends: {
        Row: {
          id: string;
          organization_id: string | null;
          line_account_id: string | null;
          line_user_id: string;
          display_name: string | null;
          picture_url: string | null;
          custom_name: string | null;
          email: string | null;
          phone: string | null;
          status: string;
          memo: string | null;
          first_added_at: string;
          last_message_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          line_account_id?: string | null;
          line_user_id: string;
          display_name?: string | null;
          picture_url?: string | null;
          custom_name?: string | null;
          email?: string | null;
          phone?: string | null;
          status?: string;
          memo?: string | null;
          first_added_at?: string;
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          line_account_id?: string | null;
          line_user_id?: string;
          display_name?: string | null;
          picture_url?: string | null;
          custom_name?: string | null;
          email?: string | null;
          phone?: string | null;
          status?: string;
          memo?: string | null;
          first_added_at?: string;
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          organization_id: string | null;
          name: string;
          color: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          name: string;
          color?: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          name?: string;
          color?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      friend_tags: {
        Row: {
          id: string;
          friend_id: string | null;
          tag_id: string | null;
          assigned_at: string;
          assigned_by: string | null;
          auto_assigned: boolean;
        };
        Insert: {
          id?: string;
          friend_id?: string | null;
          tag_id?: string | null;
          assigned_at?: string;
          assigned_by?: string | null;
          auto_assigned?: boolean;
        };
        Update: {
          id?: string;
          friend_id?: string | null;
          tag_id?: string | null;
          assigned_at?: string;
          assigned_by?: string | null;
          auto_assigned?: boolean;
        };
        Relationships: [];
      };
      seminars: {
        Row: {
          id: string;
          organization_id: string | null;
          title: string;
          description: string | null;
          event_date: string | null;
          start_time: string | null;
          end_time: string | null;
          location: string | null;
          location_url: string | null;
          capacity: number;
          status: string;
          registration_deadline: string | null;
          reminder_sent: boolean;
          payment_url: string | null;
          price: number | null;
          zoom_url: string | null;
          zoom_note: string | null;
          post_payment_url: string | null;
          post_payment_message: string | null;
          tag_ids: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          title: string;
          description?: string | null;
          event_date?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          location?: string | null;
          location_url?: string | null;
          capacity?: number;
          status?: string;
          registration_deadline?: string | null;
          reminder_sent?: boolean;
          payment_url?: string | null;
          price?: number | null;
          zoom_url?: string | null;
          zoom_note?: string | null;
          post_payment_url?: string | null;
          post_payment_message?: string | null;
          tag_ids?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          title?: string;
          description?: string | null;
          event_date?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          location?: string | null;
          location_url?: string | null;
          capacity?: number;
          status?: string;
          registration_deadline?: string | null;
          reminder_sent?: boolean;
          payment_url?: string | null;
          price?: number | null;
          zoom_url?: string | null;
          zoom_note?: string | null;
          post_payment_url?: string | null;
          post_payment_message?: string | null;
          tag_ids?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      attendances: {
        Row: {
          id: string;
          organization_id: string | null;
          friend_id: string | null;
          seminar_id: string | null;
          status: string;
          applied_at: string;
          confirmed_at: string | null;
          attended_at: string | null;
          cancelled_at: string | null;
          cancel_reason: string | null;
          memo: string | null;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          friend_id?: string | null;
          seminar_id?: string | null;
          status?: string;
          applied_at?: string;
          confirmed_at?: string | null;
          attended_at?: string | null;
          cancelled_at?: string | null;
          cancel_reason?: string | null;
          memo?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          friend_id?: string | null;
          seminar_id?: string | null;
          status?: string;
          applied_at?: string;
          confirmed_at?: string | null;
          attended_at?: string | null;
          cancelled_at?: string | null;
          cancel_reason?: string | null;
          memo?: string | null;
        };
        Relationships: [];
      };
      broadcasts: {
        Row: {
          id: string;
          organization_id: string | null;
          line_account_id: string | null;
          title: string | null;
          message_text: string;
          target_type: string;
          target_filter: Json | null;
          sent_count: number;
          failed_count: number;
          status: string;
          scheduled_at: string | null;
          sent_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          line_account_id?: string | null;
          title?: string | null;
          message_text: string;
          target_type?: string;
          target_filter?: Json | null;
          sent_count?: number;
          failed_count?: number;
          status?: string;
          scheduled_at?: string | null;
          sent_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          line_account_id?: string | null;
          title?: string | null;
          message_text?: string;
          target_type?: string;
          target_filter?: Json | null;
          sent_count?: number;
          failed_count?: number;
          status?: string;
          scheduled_at?: string | null;
          sent_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      message_logs: {
        Row: {
          id: string;
          organization_id: string | null;
          friend_id: string | null;
          line_user_id: string | null;
          event_type: string;
          message_type: string | null;
          content: string | null;
          raw_event: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          friend_id?: string | null;
          line_user_id?: string | null;
          event_type: string;
          message_type?: string | null;
          content?: string | null;
          raw_event?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          friend_id?: string | null;
          line_user_id?: string | null;
          event_type?: string;
          message_type?: string | null;
          content?: string | null;
          raw_event?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          organization_id: string | null;
          friend_id: string | null;
          name: string;
          gender: string;
          birth_date: string | null;
          age: number | null;
          occupation: string | null;
          company_type: string | null;
          income_range: string | null;
          education: string | null;
          height: number | null;
          area: string | null;
          smoking: string;
          drinking: string;
          hobby: string | null;
          self_introduction: string | null;
          photo_urls: Json;
          ideal_age_min: number | null;
          ideal_age_max: number | null;
          ideal_income: string | null;
          ideal_education: string | null;
          ideal_area: string | null;
          ideal_other: string | null;
          status: string;
          membership_plan: string | null;
          join_date: string;
          pause_start_date: string | null;
          pause_end_date: string | null;
          withdraw_date: string | null;
          withdraw_reason: string | null;
          counselor_id: string | null;
          counselor_memo: string | null;
          activity_pace: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          friend_id?: string | null;
          name: string;
          gender: string;
          birth_date?: string | null;
          age?: number | null;
          occupation?: string | null;
          company_type?: string | null;
          income_range?: string | null;
          education?: string | null;
          height?: number | null;
          area?: string | null;
          smoking?: string;
          drinking?: string;
          hobby?: string | null;
          self_introduction?: string | null;
          photo_urls?: Json;
          ideal_age_min?: number | null;
          ideal_age_max?: number | null;
          ideal_income?: string | null;
          ideal_education?: string | null;
          ideal_area?: string | null;
          ideal_other?: string | null;
          status?: string;
          membership_plan?: string | null;
          join_date?: string;
          pause_start_date?: string | null;
          pause_end_date?: string | null;
          withdraw_date?: string | null;
          withdraw_reason?: string | null;
          counselor_id?: string | null;
          counselor_memo?: string | null;
          activity_pace?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          friend_id?: string | null;
          name?: string;
          gender?: string;
          birth_date?: string | null;
          age?: number | null;
          occupation?: string | null;
          company_type?: string | null;
          income_range?: string | null;
          education?: string | null;
          height?: number | null;
          area?: string | null;
          smoking?: string;
          drinking?: string;
          hobby?: string | null;
          self_introduction?: string | null;
          photo_urls?: Json;
          ideal_age_min?: number | null;
          ideal_age_max?: number | null;
          ideal_income?: string | null;
          ideal_education?: string | null;
          ideal_area?: string | null;
          ideal_other?: string | null;
          status?: string;
          membership_plan?: string | null;
          join_date?: string;
          pause_start_date?: string | null;
          pause_end_date?: string | null;
          withdraw_date?: string | null;
          withdraw_reason?: string | null;
          counselor_id?: string | null;
          counselor_memo?: string | null;
          activity_pace?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      omiai: {
        Row: {
          id: string;
          organization_id: string | null;
          male_member_id: string | null;
          female_member_id: string | null;
          scheduled_date: string;
          scheduled_time: string | null;
          location: string | null;
          location_url: string | null;
          status: string;
          male_result: string | null;
          female_result: string | null;
          match_result: string | null;
          male_feedback: string | null;
          female_feedback: string | null;
          counselor_note: string | null;
          reminder_sent: boolean;
          result_request_sent: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          male_member_id: string;
          female_member_id: string;
          scheduled_date: string;
          scheduled_time?: string | null;
          location?: string | null;
          location_url?: string | null;
          status?: string;
          male_result?: string | null;
          female_result?: string | null;
          match_result?: string | null;
          male_feedback?: string | null;
          female_feedback?: string | null;
          counselor_note?: string | null;
          reminder_sent?: boolean;
          result_request_sent?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          male_member_id?: string;
          female_member_id?: string;
          scheduled_date?: string;
          scheduled_time?: string | null;
          location?: string | null;
          location_url?: string | null;
          status?: string;
          male_result?: string | null;
          female_result?: string | null;
          match_result?: string | null;
          male_feedback?: string | null;
          female_feedback?: string | null;
          counselor_note?: string | null;
          reminder_sent?: boolean;
          result_request_sent?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dating: {
        Row: {
          id: string;
          organization_id: string | null;
          omiai_id: string | null;
          male_member_id: string | null;
          female_member_id: string | null;
          status: string;
          started_at: string;
          serious_at: string | null;
          engaged_at: string | null;
          broken_up_at: string | null;
          break_reason: string | null;
          date_count: number;
          counselor_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          omiai_id?: string | null;
          male_member_id: string;
          female_member_id: string;
          status?: string;
          started_at?: string;
          serious_at?: string | null;
          engaged_at?: string | null;
          broken_up_at?: string | null;
          break_reason?: string | null;
          date_count?: number;
          counselor_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          omiai_id?: string | null;
          male_member_id?: string;
          female_member_id?: string;
          status?: string;
          started_at?: string;
          serious_at?: string | null;
          engaged_at?: string | null;
          broken_up_at?: string | null;
          break_reason?: string | null;
          date_count?: number;
          counselor_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      marriages: {
        Row: {
          id: string;
          organization_id: string | null;
          dating_id: string | null;
          male_member_id: string | null;
          female_member_id: string | null;
          married_date: string | null;
          wedding_date: string | null;
          story: string | null;
          permission_to_publish: boolean;
          days_to_marriage: number | null;
          omiai_count: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          dating_id?: string | null;
          male_member_id?: string | null;
          female_member_id?: string | null;
          married_date?: string | null;
          wedding_date?: string | null;
          story?: string | null;
          permission_to_publish?: boolean;
          days_to_marriage?: number | null;
          omiai_count?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          dating_id?: string | null;
          male_member_id?: string | null;
          female_member_id?: string | null;
          married_date?: string | null;
          wedding_date?: string | null;
          story?: string | null;
          permission_to_publish?: boolean;
          days_to_marriage?: number | null;
          omiai_count?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      consultations: {
        Row: {
          id: string;
          organization_id: string | null;
          member_id: string | null;
          counselor_id: string | null;
          consultation_date: string;
          consultation_type: string;
          duration_minutes: number | null;
          summary: string;
          action_items: string | null;
          next_consultation_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          member_id: string;
          counselor_id?: string | null;
          consultation_date: string;
          consultation_type: string;
          duration_minutes?: number | null;
          summary: string;
          action_items?: string | null;
          next_consultation_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          member_id?: string;
          counselor_id?: string | null;
          consultation_date?: string;
          consultation_type?: string;
          duration_minutes?: number | null;
          summary?: string;
          action_items?: string | null;
          next_consultation_date?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      coaching_bookings: {
        Row: {
          id: string;
          organization_id: string | null;
          member_id: string | null;
          coach_id: string | null;
          booking_date: string;
          start_time: string;
          end_time: string;
          status: string;
          booking_type: string | null;
          booking_source: string;
          booked_at: string | null;
          member_message: string | null;
          google_event_id: string | null;
          google_calendar_synced: boolean;
          block_reason: string | null;
          consultation_id: string | null;
          reminder_sent: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          member_id?: string | null;
          coach_id?: string | null;
          booking_date: string;
          start_time: string;
          end_time: string;
          status?: string;
          booking_type?: string | null;
          booking_source?: string;
          booked_at?: string | null;
          member_message?: string | null;
          google_event_id?: string | null;
          google_calendar_synced?: boolean;
          block_reason?: string | null;
          consultation_id?: string | null;
          reminder_sent?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          member_id?: string | null;
          coach_id?: string | null;
          booking_date?: string;
          start_time?: string;
          end_time?: string;
          status?: string;
          booking_type?: string | null;
          booking_source?: string;
          booked_at?: string | null;
          member_message?: string | null;
          google_event_id?: string | null;
          google_calendar_synced?: boolean;
          block_reason?: string | null;
          consultation_id?: string | null;
          reminder_sent?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      google_calendar_settings: {
        Row: {
          id: string;
          organization_id: string | null;
          user_id: string | null;
          google_access_token: string | null;
          google_refresh_token: string | null;
          google_token_expires_at: string | null;
          calendar_id: string;
          sync_enabled: boolean;
          last_synced_at: string | null;
          available_days: Json;
          available_start_time: string;
          available_end_time: string;
          slot_duration_minutes: number;
          buffer_minutes: number;
          max_bookings_per_day: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          user_id?: string | null;
          google_access_token?: string | null;
          google_refresh_token?: string | null;
          google_token_expires_at?: string | null;
          calendar_id?: string;
          sync_enabled?: boolean;
          last_synced_at?: string | null;
          available_days?: Json;
          available_start_time?: string;
          available_end_time?: string;
          slot_duration_minutes?: number;
          buffer_minutes?: number;
          max_bookings_per_day?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          user_id?: string | null;
          google_access_token?: string | null;
          google_refresh_token?: string | null;
          google_token_expires_at?: string | null;
          calendar_id?: string;
          sync_enabled?: boolean;
          last_synced_at?: string | null;
          available_days?: Json;
          available_start_time?: string;
          available_end_time?: string;
          slot_duration_minutes?: number;
          buffer_minutes?: number;
          max_bookings_per_day?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      message_templates: {
        Row: {
          id: string;
          organization_id: string | null;
          name: string;
          category: string;
          content: string;
          auto_send: boolean;
          auto_send_trigger: string | null;
          auto_send_timing: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          name: string;
          category: string;
          content: string;
          auto_send?: boolean;
          auto_send_trigger?: string | null;
          auto_send_timing?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          name?: string;
          category?: string;
          content?: string;
          auto_send?: boolean;
          auto_send_trigger?: string | null;
          auto_send_timing?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          organization_id: string | null;
          friend_id: string | null;
          member_id: string | null;
          seminar_id: string | null;
          booking_id: string | null;
          payment_type: string;
          item_name: string;
          amount: number;
          currency: string;
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          stripe_charge_id: string | null;
          stripe_receipt_url: string | null;
          status: string;
          paid_at: string | null;
          refunded_at: string | null;
          payment_link_sent: boolean;
          payment_link_sent_at: string | null;
          completion_notified: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          friend_id?: string | null;
          member_id?: string | null;
          seminar_id?: string | null;
          booking_id?: string | null;
          payment_type: string;
          item_name: string;
          amount: number;
          currency?: string;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_charge_id?: string | null;
          stripe_receipt_url?: string | null;
          status?: string;
          paid_at?: string | null;
          refunded_at?: string | null;
          payment_link_sent?: boolean;
          payment_link_sent_at?: string | null;
          completion_notified?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          friend_id?: string | null;
          member_id?: string | null;
          seminar_id?: string | null;
          booking_id?: string | null;
          payment_type?: string;
          item_name?: string;
          amount?: number;
          currency?: string;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_charge_id?: string | null;
          stripe_receipt_url?: string | null;
          status?: string;
          paid_at?: string | null;
          refunded_at?: string | null;
          payment_link_sent?: boolean;
          payment_link_sent_at?: string | null;
          completion_notified?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      stripe_settings: {
        Row: {
          id: string;
          organization_id: string | null;
          stripe_account_id: string | null;
          stripe_publishable_key: string | null;
          stripe_secret_key: string | null;
          stripe_webhook_secret: string | null;
          default_coaching_price: number;
          auto_send_payment_link: boolean;
          send_receipt_via_line: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          stripe_account_id?: string | null;
          stripe_publishable_key?: string | null;
          stripe_secret_key?: string | null;
          stripe_webhook_secret?: string | null;
          default_coaching_price?: number;
          auto_send_payment_link?: boolean;
          send_receipt_via_line?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          stripe_account_id?: string | null;
          stripe_publishable_key?: string | null;
          stripe_secret_key?: string | null;
          stripe_webhook_secret?: string | null;
          default_coaching_price?: number;
          auto_send_payment_link?: boolean;
          send_receipt_via_line?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// ============================================================
// Convenience Type Aliases
// ============================================================

type Tables = Database['public']['Tables'];

export type Organization = Tables['organizations']['Row'];
export type OrganizationInsert = Tables['organizations']['Insert'];
export type OrganizationUpdate = Tables['organizations']['Update'];

export type User = Tables['users']['Row'];
export type UserInsert = Tables['users']['Insert'];
export type UserUpdate = Tables['users']['Update'];

export type LineAccount = Tables['line_accounts']['Row'];
export type LineAccountInsert = Tables['line_accounts']['Insert'];
export type LineAccountUpdate = Tables['line_accounts']['Update'];

export type Friend = Tables['friends']['Row'];
export type FriendInsert = Tables['friends']['Insert'];
export type FriendUpdate = Tables['friends']['Update'];

export type Tag = Tables['tags']['Row'];
export type TagInsert = Tables['tags']['Insert'];
export type TagUpdate = Tables['tags']['Update'];

export type FriendTag = Tables['friend_tags']['Row'];
export type FriendTagInsert = Tables['friend_tags']['Insert'];
export type FriendTagUpdate = Tables['friend_tags']['Update'];

export type Seminar = Tables['seminars']['Row'];
export type SeminarInsert = Tables['seminars']['Insert'];
export type SeminarUpdate = Tables['seminars']['Update'];

export type Attendance = Tables['attendances']['Row'];
export type AttendanceInsert = Tables['attendances']['Insert'];
export type AttendanceUpdate = Tables['attendances']['Update'];

export type Broadcast = Tables['broadcasts']['Row'];
export type BroadcastInsert = Tables['broadcasts']['Insert'];
export type BroadcastUpdate = Tables['broadcasts']['Update'];

export type MessageLog = Tables['message_logs']['Row'];
export type MessageLogInsert = Tables['message_logs']['Insert'];
export type MessageLogUpdate = Tables['message_logs']['Update'];

export type Member = Tables['members']['Row'];
export type MemberInsert = Tables['members']['Insert'];
export type MemberUpdate = Tables['members']['Update'];

export type Omiai = Tables['omiai']['Row'];
export type OmiaiInsert = Tables['omiai']['Insert'];
export type OmiaiUpdate = Tables['omiai']['Update'];

export type Dating = Tables['dating']['Row'];
export type DatingInsert = Tables['dating']['Insert'];
export type DatingUpdate = Tables['dating']['Update'];

export type Marriage = Tables['marriages']['Row'];
export type MarriageInsert = Tables['marriages']['Insert'];
export type MarriageUpdate = Tables['marriages']['Update'];

export type Consultation = Tables['consultations']['Row'];
export type ConsultationInsert = Tables['consultations']['Insert'];
export type ConsultationUpdate = Tables['consultations']['Update'];

export type CoachingBooking = Tables['coaching_bookings']['Row'];
export type CoachingBookingInsert = Tables['coaching_bookings']['Insert'];
export type CoachingBookingUpdate = Tables['coaching_bookings']['Update'];

export type GoogleCalendarSettings = Tables['google_calendar_settings']['Row'];
export type GoogleCalendarSettingsInsert = Tables['google_calendar_settings']['Insert'];
export type GoogleCalendarSettingsUpdate = Tables['google_calendar_settings']['Update'];

export type MessageTemplate = Tables['message_templates']['Row'];
export type MessageTemplateInsert = Tables['message_templates']['Insert'];
export type MessageTemplateUpdate = Tables['message_templates']['Update'];

export type Payment = Tables['payments']['Row'];
export type PaymentInsert = Tables['payments']['Insert'];
export type PaymentUpdate = Tables['payments']['Update'];

export type StripeSettings = Tables['stripe_settings']['Row'];
export type StripeSettingsInsert = Tables['stripe_settings']['Insert'];
export type StripeSettingsUpdate = Tables['stripe_settings']['Update'];
