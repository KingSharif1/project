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
      activity_log: {
        Row: {
          action: string
          clinic_id: string | null
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          clinic_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          clinic_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      automated_notification_log: {
        Row: {
          created_at: string | null
          id: string
          message_body: string | null
          notification_type: string | null
          recipient_contact: string | null
          status: string | null
          subject: string | null
          trip_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_body?: string | null
          notification_type?: string | null
          recipient_contact?: string | null
          status?: string | null
          subject?: string | null
          trip_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message_body?: string | null
          notification_type?: string | null
          recipient_contact?: string | null
          status?: string | null
          subject?: string | null
          trip_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automated_notification_log_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_rate_configurations: {
        Row: {
          clinic_id: string
          clinic_name: string | null
          created_at: string
          id: string
          rate: number
          service_level: string
          trip_status: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          clinic_name?: string | null
          created_at?: string
          id?: string
          rate: number
          service_level: string
          trip_status: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          clinic_name?: string | null
          created_at?: string
          id?: string
          rate?: number
          service_level?: string
          trip_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_rate_configurations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          ambulatory_rate: number | null
          cancellation_rate: number | null
          city: string | null
          company_code: string | null
          contact_email: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          no_show_rate: number | null
          payment_terms: string | null
          phone: string | null
          state: string | null
          stretcher_rate: number | null
          updated_at: string
          wheelchair_rate: number | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          ambulatory_rate?: number | null
          cancellation_rate?: number | null
          city?: string | null
          company_code?: string | null
          contact_email?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          no_show_rate?: number | null
          payment_terms?: string | null
          phone?: string | null
          state?: string | null
          stretcher_rate?: number | null
          updated_at?: string
          wheelchair_rate?: number | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          ambulatory_rate?: number | null
          cancellation_rate?: number | null
          city?: string | null
          company_code?: string | null
          contact_email?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          no_show_rate?: number | null
          payment_terms?: string | null
          phone?: string | null
          state?: string | null
          stretcher_rate?: number | null
          updated_at?: string
          wheelchair_rate?: number | null
          zip_code?: string | null
        }
        Relationships: []
      }
      compliance_metrics: {
        Row: {
          avg_days_to_renewal: number | null
          clinic_id: string | null
          compliance_rate: number | null
          compliant_documents: number | null
          created_at: string | null
          estimated_non_compliance_cost: number | null
          expired_documents: number | null
          expiring_soon_documents: number | null
          id: string
          metric_date: string | null
          not_set_documents: number | null
          total_documents: number | null
          total_drivers: number | null
        }
        Insert: {
          avg_days_to_renewal?: number | null
          clinic_id?: string | null
          compliance_rate?: number | null
          compliant_documents?: number | null
          created_at?: string | null
          estimated_non_compliance_cost?: number | null
          expired_documents?: number | null
          expiring_soon_documents?: number | null
          id?: string
          metric_date?: string | null
          not_set_documents?: number | null
          total_documents?: number | null
          total_drivers?: number | null
        }
        Update: {
          avg_days_to_renewal?: number | null
          clinic_id?: string | null
          compliance_rate?: number | null
          compliant_documents?: number | null
          created_at?: string | null
          estimated_non_compliance_cost?: number | null
          expired_documents?: number | null
          expiring_soon_documents?: number | null
          id?: string
          metric_date?: string | null
          not_set_documents?: number | null
          total_documents?: number | null
          total_drivers?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_metrics_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors: {
        Row: {
          address: string | null
          ambulatory_additional_mile_rate: number | null
          ambulatory_base_miles: number | null
          ambulatory_rate: number | null
          billing_contact: string | null
          billing_email: string | null
          billing_phone: string | null
          cancellation_rate: number | null
          city: string | null
          clinic_id: string | null
          contact_email: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          no_show_rate: number | null
          notes: string | null
          payment_terms: string | null
          phone: string | null
          rate_tiers: Json | null
          state: string | null
          stretcher_additional_mile_rate: number | null
          stretcher_base_miles: number | null
          stretcher_rate: number | null
          tax_id: string | null
          updated_at: string | null
          wheelchair_additional_mile_rate: number | null
          wheelchair_base_miles: number | null
          wheelchair_rate: number | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          ambulatory_additional_mile_rate?: number | null
          ambulatory_base_miles?: number | null
          ambulatory_rate?: number | null
          billing_contact?: string | null
          billing_email?: string | null
          billing_phone?: string | null
          cancellation_rate?: number | null
          city?: string | null
          clinic_id?: string | null
          contact_email?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          no_show_rate?: number | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rate_tiers?: Json | null
          state?: string | null
          stretcher_additional_mile_rate?: number | null
          stretcher_base_miles?: number | null
          stretcher_rate?: number | null
          tax_id?: string | null
          updated_at?: string | null
          wheelchair_additional_mile_rate?: number | null
          wheelchair_base_miles?: number | null
          wheelchair_rate?: number | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          ambulatory_additional_mile_rate?: number | null
          ambulatory_base_miles?: number | null
          ambulatory_rate?: number | null
          billing_contact?: string | null
          billing_email?: string | null
          billing_phone?: string | null
          cancellation_rate?: number | null
          city?: string | null
          clinic_id?: string | null
          contact_email?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          no_show_rate?: number | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rate_tiers?: Json | null
          state?: string | null
          stretcher_additional_mile_rate?: number | null
          stretcher_base_miles?: number | null
          stretcher_rate?: number | null
          tax_id?: string | null
          updated_at?: string | null
          wheelchair_additional_mile_rate?: number | null
          wheelchair_base_miles?: number | null
          wheelchair_rate?: number | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facilities_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      document_expiry_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          alert_date: string | null
          alert_sent: boolean | null
          created_at: string | null
          days_until_expiry: number | null
          document_type: string
          driver_id: string | null
          email_sent: boolean | null
          expiry_date: string
          id: string
          push_sent: boolean | null
          sms_sent: boolean | null
          snoozed_until: string | null
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          alert_date?: string | null
          alert_sent?: boolean | null
          created_at?: string | null
          days_until_expiry?: number | null
          document_type: string
          driver_id?: string | null
          email_sent?: boolean | null
          expiry_date: string
          id?: string
          push_sent?: boolean | null
          sms_sent?: boolean | null
          snoozed_until?: string | null
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          alert_date?: string | null
          alert_sent?: boolean | null
          created_at?: string | null
          days_until_expiry?: number | null
          document_type?: string
          driver_id?: string | null
          email_sent?: boolean | null
          expiry_date?: string
          id?: string
          push_sent?: boolean | null
          sms_sent?: boolean | null
          snoozed_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_expiry_alerts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      document_submissions: {
        Row: {
          document_type: string
          driver_id: string | null
          expiry_date: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          rejection_reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submission_date: string | null
          version: number | null
        }
        Insert: {
          document_type: string
          driver_id?: string | null
          expiry_date?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submission_date?: string | null
          version?: number | null
        }
        Update: {
          document_type?: string
          driver_id?: string | null
          expiry_date?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submission_date?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_submissions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_location_history: {
        Row: {
          accuracy: number | null
          driver_id: string | null
          heading: number | null
          id: string
          latitude: number
          longitude: number
          speed: number | null
          status: string | null
          timestamp: string | null
          trip_id: string | null
        }
        Insert: {
          accuracy?: number | null
          driver_id?: string | null
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          speed?: number | null
          status?: string | null
          timestamp?: string | null
          trip_id?: string | null
        }
        Update: {
          accuracy?: number | null
          driver_id?: string | null
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          speed?: number | null
          status?: string | null
          timestamp?: string | null
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_location_history_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_location_history_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          ambulatory_additional_mile_rate: number | null
          ambulatory_base_miles: number | null
          assigned_vehicle_id: string | null
          availability_status: Database["public"]["Enums"]["DriverStatus"]
          background_check_expiry: string | null
          cancellation_rate: number | null
          clinic_id: string | null
          created_at: string
          current_location_lat: number | null
          current_location_lng: number | null
          date_of_birth: string | null
          deductions: Json | null
          drug_test_expiry: string | null
          first_name: string | null
          hourly_rate: number | null
          id: string
          last_location_update: string | null
          last_name: string | null
          license_class: string
          license_expiry: string
          license_number: string
          medical_cert_expiry: string | null
          no_show_rate: number | null
          rate_tiers: Json | null
          stretcher_additional_mile_rate: number | null
          stretcher_base_miles: number | null
          temporary_password: string | null
          updated_at: string
          user_id: string
          wheelchair_additional_mile_rate: number | null
          wheelchair_base_miles: number | null
        }
        Insert: {
          ambulatory_additional_mile_rate?: number | null
          ambulatory_base_miles?: number | null
          assigned_vehicle_id?: string | null
          availability_status?: Database["public"]["Enums"]["DriverStatus"]
          background_check_expiry?: string | null
          cancellation_rate?: number | null
          clinic_id?: string | null
          created_at?: string
          current_location_lat?: number | null
          current_location_lng?: number | null
          date_of_birth?: string | null
          deductions?: Json | null
          drug_test_expiry?: string | null
          first_name?: string | null
          hourly_rate?: number | null
          id?: string
          last_location_update?: string | null
          last_name?: string | null
          license_class: string
          license_expiry: string
          license_number: string
          medical_cert_expiry?: string | null
          no_show_rate?: number | null
          rate_tiers?: Json | null
          stretcher_additional_mile_rate?: number | null
          stretcher_base_miles?: number | null
          temporary_password?: string | null
          updated_at?: string
          user_id: string
          wheelchair_additional_mile_rate?: number | null
          wheelchair_base_miles?: number | null
        }
        Update: {
          ambulatory_additional_mile_rate?: number | null
          ambulatory_base_miles?: number | null
          assigned_vehicle_id?: string | null
          availability_status?: Database["public"]["Enums"]["DriverStatus"]
          background_check_expiry?: string | null
          cancellation_rate?: number | null
          clinic_id?: string | null
          created_at?: string
          current_location_lat?: number | null
          current_location_lng?: number | null
          date_of_birth?: string | null
          deductions?: Json | null
          drug_test_expiry?: string | null
          first_name?: string | null
          hourly_rate?: number | null
          id?: string
          last_location_update?: string | null
          last_name?: string | null
          license_class?: string
          license_expiry?: string
          license_number?: string
          medical_cert_expiry?: string | null
          no_show_rate?: number | null
          rate_tiers?: Json | null
          stretcher_additional_mile_rate?: number | null
          stretcher_base_miles?: number | null
          temporary_password?: string | null
          updated_at?: string
          user_id?: string
          wheelchair_additional_mile_rate?: number | null
          wheelchair_base_miles?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_assigned_vehicle_id_fkey"
            columns: ["assigned_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      general_deductions: {
        Row: {
          created_at: string
          fuel_surcharge: number | null
          id: number
          insurance_deduction: number | null
          maintenance_deduction: number | null
          other_deductions: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fuel_surcharge?: number | null
          id?: number
          insurance_deduction?: number | null
          maintenance_deduction?: number | null
          other_deductions?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fuel_surcharge?: number | null
          id?: number
          insurance_deduction?: number | null
          maintenance_deduction?: number | null
          other_deductions?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_notifications: boolean | null
          push_notifications: boolean | null
          sms_notifications: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_notifications?: boolean | null
          push_notifications?: boolean | null
          sms_notifications?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_notifications?: boolean | null
          push_notifications?: boolean | null
          sms_notifications?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          document_expiry: boolean | null
          driver_id: string | null
          driver_updates: boolean | null
          email_enabled: boolean | null
          id: string
          push_enabled: boolean | null
          sms_enabled: boolean | null
          system_alerts: boolean | null
          trip_reminders: boolean | null
          user_id: string | null
        }
        Insert: {
          document_expiry?: boolean | null
          driver_id?: string | null
          driver_updates?: boolean | null
          email_enabled?: boolean | null
          id?: string
          push_enabled?: boolean | null
          sms_enabled?: boolean | null
          system_alerts?: boolean | null
          trip_reminders?: boolean | null
          user_id?: string | null
        }
        Update: {
          document_expiry?: boolean | null
          driver_id?: string | null
          driver_updates?: boolean | null
          email_enabled?: boolean | null
          id?: string
          push_enabled?: boolean | null
          sms_enabled?: boolean | null
          system_alerts?: boolean | null
          trip_reminders?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          driver_id: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          priority: string | null
          read_at: string | null
          related_user_id: string | null
          title: string
          trip_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          driver_id?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          priority?: string | null
          read_at?: string | null
          related_user_id?: string | null
          title: string
          trip_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          driver_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          priority?: string | null
          read_at?: string | null
          related_user_id?: string | null
          title?: string
          trip_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_user_id_fkey"
            columns: ["related_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          account_number: string | null
          address_label: string | null
          address_line_2: string | null
          clinic_id: string | null
          created_at: string
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          gender: string | null
          id: string
          insurance_number: string | null
          insurance_provider: string | null
          landmark: string | null
          last_name: string
          medical_notes: string | null
          middle_name: string | null
          mobility_requirements:
            | Database["public"]["Enums"]["MobilityRequirement"]
            | null
          notes: string | null
          phone: string | null
          ride_alone: boolean | null
          service_level: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          address_label?: string | null
          address_line_2?: string | null
          clinic_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          gender?: string | null
          id?: string
          insurance_number?: string | null
          insurance_provider?: string | null
          landmark?: string | null
          last_name: string
          medical_notes?: string | null
          middle_name?: string | null
          mobility_requirements?:
            | Database["public"]["Enums"]["MobilityRequirement"]
            | null
          notes?: string | null
          phone?: string | null
          ride_alone?: boolean | null
          service_level?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          address_label?: string | null
          address_line_2?: string | null
          clinic_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          insurance_number?: string | null
          insurance_provider?: string | null
          landmark?: string | null
          last_name?: string
          medical_notes?: string | null
          middle_name?: string | null
          mobility_requirements?:
            | Database["public"]["Enums"]["MobilityRequirement"]
            | null
          notes?: string | null
          phone?: string | null
          ride_alone?: boolean | null
          service_level?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_configurations: {
        Row: {
          additional_rate: number | null
          created_at: string
          from_mile: number
          id: string
          rate: number
          service_level: string
          to_mile: number | null
          updated_at: string
        }
        Insert: {
          additional_rate?: number | null
          created_at?: string
          from_mile: number
          id?: string
          rate: number
          service_level: string
          to_mile?: number | null
          updated_at?: string
        }
        Update: {
          additional_rate?: number | null
          created_at?: string
          from_mile?: number
          id?: string
          rate?: number
          service_level?: string
          to_mile?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      realtime_driver_locations: {
        Row: {
          accuracy: number | null
          created_at: string
          driver_id: string
          heading: number | null
          id: string
          last_updated: string
          latitude: number
          longitude: number
          speed: number | null
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          driver_id: string
          heading?: number | null
          id?: string
          last_updated?: string
          latitude: number
          longitude: number
          speed?: number | null
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          driver_id?: string
          heading?: number | null
          id?: string
          last_updated?: string
          latitude?: number
          longitude?: number
          speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "realtime_driver_locations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_schedules: {
        Row: {
          created_at: string | null
          days_before_expiry: number
          email_enabled: boolean | null
          email_template_body: string | null
          email_template_subject: string | null
          id: string
          is_enabled: boolean | null
          label: string
          priority: number | null
          sms_enabled: boolean | null
          sms_template: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          days_before_expiry: number
          email_enabled?: boolean | null
          email_template_body?: string | null
          email_template_subject?: string | null
          id?: string
          is_enabled?: boolean | null
          label: string
          priority?: number | null
          sms_enabled?: boolean | null
          sms_template?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          days_before_expiry?: number
          email_enabled?: boolean | null
          email_template_body?: string | null
          email_template_subject?: string | null
          id?: string
          is_enabled?: boolean | null
          label?: string
          priority?: number | null
          sms_enabled?: boolean | null
          sms_template?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_assignment_history: {
        Row: {
          action: string
          changed_by_id: string | null
          changed_by_name: string | null
          created_at: string | null
          driver_id: string | null
          id: string
          reason: string | null
          trip_id: string | null
        }
        Insert: {
          action: string
          changed_by_id?: string | null
          changed_by_name?: string | null
          created_at?: string | null
          driver_id?: string | null
          id?: string
          reason?: string | null
          trip_id?: string | null
        }
        Update: {
          action?: string
          changed_by_id?: string | null
          changed_by_name?: string | null
          created_at?: string | null
          driver_id?: string | null
          id?: string
          reason?: string | null
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_assignment_history_changed_by_id_fkey"
            columns: ["changed_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_assignment_history_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_assignment_history_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_signatures: {
        Row: {
          created_at: string | null
          id: string
          signature_data: string
          signature_type: string | null
          signed_at: string | null
          signer_name: string | null
          signer_role: string | null
          trip_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          signature_data: string
          signature_type?: string | null
          signed_at?: string | null
          signer_name?: string | null
          signer_role?: string | null
          trip_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          signature_data?: string
          signature_type?: string | null
          signed_at?: string | null
          signer_name?: string | null
          signer_role?: string | null
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_signatures_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_sources: {
        Row: {
          address: string | null
          billing_address: string | null
          clinic_id: string
          contact_email: string | null
          created_at: string | null
          id: string
          name: string
          phone: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          billing_address?: string | null
          clinic_id: string
          contact_email?: string | null
          created_at?: string | null
          id?: string
          name: string
          phone?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          billing_address?: string | null
          clinic_id?: string
          contact_email?: string | null
          created_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_sources_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          location_lat: number | null
          location_lng: number | null
          notes: string | null
          status: string
          trip_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          status: string
          trip_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          status?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_status_history_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          actual_cost: number | null
          actual_dropoff_time: string | null
          actual_pickup_time: string | null
          appointment_time: string | null
          assigned_by: string | null
          cancellation_reason: string | null
          clinic_id: string | null
          clinic_note: string | null
          created_at: string
          created_by_name: string | null
          date: string | null
          dispatcher_id: string | null
          do_address: string | null
          driver_id: string | null
          dropoff_address: string
          dropoff_city: string
          dropoff_instructions: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          dropoff_state: string
          dropoff_zip: string
          estimated_cost: number | null
          facility_id: string | null
          id: string
          insurance_covered: boolean | null
          is_return: boolean | null
          is_will_call: boolean | null
          last_modified_by_name: string | null
          level_of_assistance: string | null
          level_of_service: string | null
          medical_equipment_needed: string | null
          mileage: number | null
          notes: string | null
          passenger_signature: string | null
          patient_id: string
          phone: string | null
          pickup_address: string
          pickup_city: string
          pickup_instructions: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_state: string
          pickup_zip: string
          priority: Database["public"]["Enums"]["TripPriority"]
          pu_address: string | null
          pu_schedule: string | null
          revenue: number | null
          rider: string | null
          round_trip_id: string | null
          scheduled_dropoff_time: string | null
          scheduled_pickup_time: string
          special_instructions: string | null
          status: Database["public"]["Enums"]["TripStatus"]
          stops: Json | null
          trip_classification: string | null
          trip_number: string
          trip_source_id: string | null
          trip_type: Database["public"]["Enums"]["TripType"]
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          actual_cost?: number | null
          actual_dropoff_time?: string | null
          actual_pickup_time?: string | null
          appointment_time?: string | null
          assigned_by?: string | null
          cancellation_reason?: string | null
          clinic_id?: string | null
          clinic_note?: string | null
          created_at?: string
          created_by_name?: string | null
          date?: string | null
          dispatcher_id?: string | null
          do_address?: string | null
          driver_id?: string | null
          dropoff_address: string
          dropoff_city: string
          dropoff_instructions?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          dropoff_state: string
          dropoff_zip: string
          estimated_cost?: number | null
          facility_id?: string | null
          id?: string
          insurance_covered?: boolean | null
          is_return?: boolean | null
          is_will_call?: boolean | null
          last_modified_by_name?: string | null
          level_of_assistance?: string | null
          level_of_service?: string | null
          medical_equipment_needed?: string | null
          mileage?: number | null
          notes?: string | null
          passenger_signature?: string | null
          patient_id: string
          phone?: string | null
          pickup_address: string
          pickup_city: string
          pickup_instructions?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_state: string
          pickup_zip: string
          priority?: Database["public"]["Enums"]["TripPriority"]
          pu_address?: string | null
          pu_schedule?: string | null
          revenue?: number | null
          rider?: string | null
          round_trip_id?: string | null
          scheduled_dropoff_time?: string | null
          scheduled_pickup_time: string
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["TripStatus"]
          stops?: Json | null
          trip_classification?: string | null
          trip_number: string
          trip_source_id?: string | null
          trip_type: Database["public"]["Enums"]["TripType"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          actual_cost?: number | null
          actual_dropoff_time?: string | null
          actual_pickup_time?: string | null
          appointment_time?: string | null
          assigned_by?: string | null
          cancellation_reason?: string | null
          clinic_id?: string | null
          clinic_note?: string | null
          created_at?: string
          created_by_name?: string | null
          date?: string | null
          dispatcher_id?: string | null
          do_address?: string | null
          driver_id?: string | null
          dropoff_address?: string
          dropoff_city?: string
          dropoff_instructions?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          dropoff_state?: string
          dropoff_zip?: string
          estimated_cost?: number | null
          facility_id?: string | null
          id?: string
          insurance_covered?: boolean | null
          is_return?: boolean | null
          is_will_call?: boolean | null
          last_modified_by_name?: string | null
          level_of_assistance?: string | null
          level_of_service?: string | null
          medical_equipment_needed?: string | null
          mileage?: number | null
          notes?: string | null
          passenger_signature?: string | null
          patient_id?: string
          phone?: string | null
          pickup_address?: string
          pickup_city?: string
          pickup_instructions?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_state?: string
          pickup_zip?: string
          priority?: Database["public"]["Enums"]["TripPriority"]
          pu_address?: string | null
          pu_schedule?: string | null
          revenue?: number | null
          rider?: string | null
          round_trip_id?: string | null
          scheduled_dropoff_time?: string | null
          scheduled_pickup_time?: string
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["TripStatus"]
          stops?: Json | null
          trip_classification?: string | null
          trip_number?: string
          trip_source_id?: string | null
          trip_type?: Database["public"]["Enums"]["TripType"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_trip_source_id_fkey"
            columns: ["trip_source_id"]
            isOneToOne: false
            referencedRelation: "trip_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_clinics: {
        Row: {
          clinic_id: string
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_clinics_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          city: string | null
          clinic_id: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string
          facility_id: string | null
          first_name: string
          id: string
          last_name: string
          must_change_password: boolean | null
          phone: string | null
          profile_image_url: string | null
          role: string
          state: string | null
          status: string
          updated_at: string | null
          username: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          clinic_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email: string
          facility_id?: string | null
          first_name: string
          id?: string
          last_name: string
          must_change_password?: boolean | null
          phone?: string | null
          profile_image_url?: string | null
          role: string
          state?: string | null
          status?: string
          updated_at?: string | null
          username?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          clinic_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string
          facility_id?: string | null
          first_name?: string
          id?: string
          last_name?: string
          must_change_password?: boolean | null
          phone?: string | null
          profile_image_url?: string | null
          role?: string
          state?: string | null
          status?: string
          updated_at?: string | null
          username?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          assigned_driver_id: string | null
          capacity: number
          clinic_id: string | null
          created_at: string | null
          id: string
          inspection_expiry: string | null
          insurance_expiry: string | null
          license_plate: string
          make: string
          model: string
          registration_expiry: string | null
          status: string
          stretcher_capable: boolean | null
          updated_at: string | null
          vehicle_type: string
          vin: string | null
          wheelchair_accessible: boolean | null
          year: number
        }
        Insert: {
          assigned_driver_id?: string | null
          capacity?: number
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          inspection_expiry?: string | null
          insurance_expiry?: string | null
          license_plate: string
          make: string
          model: string
          registration_expiry?: string | null
          status?: string
          stretcher_capable?: boolean | null
          updated_at?: string | null
          vehicle_type: string
          vin?: string | null
          wheelchair_accessible?: boolean | null
          year: number
        }
        Update: {
          assigned_driver_id?: string | null
          capacity?: number
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          inspection_expiry?: string | null
          insurance_expiry?: string | null
          license_plate?: string
          make?: string
          model?: string
          registration_expiry?: string | null
          status?: string
          stretcher_capable?: boolean | null
          updated_at?: string | null
          vehicle_type?: string
          vin?: string | null
          wheelchair_accessible?: boolean | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_update_user_password: {
        Args: { new_password: string; target_email: string }
        Returns: boolean
      }
      can_manage_users: { Args: never; Returns: boolean }
      current_user_clinic_id: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_authenticated: { Args: never; Returns: boolean }
      user_clinic_id: { Args: never; Returns: string }
      user_role: { Args: never; Returns: string }
      verify_user_password: {
        Args: { user_email: string; user_password: string }
        Returns: boolean
      }
    }
    Enums: {
      DriverStatus: "available" | "on_trip" | "off_duty" | "break"
      MobilityRequirement:
        | "ambulatory"
        | "wheelchair"
        | "stretcher"
        | "assistance"
      TripPriority: "emergency" | "urgent" | "standard" | "scheduled"
      TripStatus:
        | "scheduled"
        | "assigned"
        | "en_route_pickup"
        | "arrived_pickup"
        | "patient_loaded"
        | "en_route_dropoff"
        | "arrived_dropoff"
        | "completed"
        | "cancelled"
        | "no_show"
      TripType: "pickup" | "dropoff" | "round_trip" | "multi_stop"
      UserRole: "driver" | "dispatcher" | "broker" | "admin"
      UserStatus: "active" | "inactive" | "suspended"
      VehicleStatus: "available" | "in_use" | "maintenance" | "out_of_service"
      VehicleType: "ambulette" | "wheelchair_van" | "stretcher_van" | "standard"
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
      DriverStatus: ["available", "on_trip", "off_duty", "break"],
      MobilityRequirement: [
        "ambulatory",
        "wheelchair",
        "stretcher",
        "assistance",
      ],
      TripPriority: ["emergency", "urgent", "standard", "scheduled"],
      TripStatus: [
        "scheduled",
        "assigned",
        "en_route_pickup",
        "arrived_pickup",
        "patient_loaded",
        "en_route_dropoff",
        "arrived_dropoff",
        "completed",
        "cancelled",
        "no_show",
      ],
      TripType: ["pickup", "dropoff", "round_trip", "multi_stop"],
      UserRole: ["driver", "dispatcher", "broker", "admin"],
      UserStatus: ["active", "inactive", "suspended"],
      VehicleStatus: ["available", "in_use", "maintenance", "out_of_service"],
      VehicleType: ["ambulette", "wheelchair_van", "stretcher_van", "standard"],
    },
  },
} as const
