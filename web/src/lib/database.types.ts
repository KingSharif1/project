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
          id: string
          email: string
          full_name: string
          role: 'admin' | 'dispatcher'
          is_active: boolean
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          role: 'admin' | 'dispatcher'
          is_active?: boolean
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'dispatcher'
          is_active?: boolean
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      facilities: {
        Row: {
          id: string
          name: string
          address: string
          city: string
          state: string
          zip_code: string
          phone: string
          contact_person: string | null
          contact_email: string | null
          ambulatory_rate: number
          wheelchair_rate: number
          stretcher_rate: number
          payment_terms: string
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          city: string
          state?: string
          zip_code: string
          phone: string
          contact_person?: string | null
          contact_email?: string | null
          ambulatory_rate?: number
          wheelchair_rate?: number
          stretcher_rate?: number
          payment_terms?: string
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          city?: string
          state?: string
          zip_code?: string
          phone?: string
          contact_person?: string | null
          contact_email?: string | null
          ambulatory_rate?: number
          wheelchair_rate?: number
          stretcher_rate?: number
          payment_terms?: string
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      drivers: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string
          license_number: string | null
          license_expiry: string | null
          certification_expiry: string | null
          status: 'available' | 'on_trip' | 'off_duty'
          rating: number
          total_trips: number
          ambulatory_rate: number
          wheelchair_rate: number
          stretcher_rate: number
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone: string
          license_number?: string | null
          license_expiry?: string | null
          certification_expiry?: string | null
          status?: 'available' | 'on_trip' | 'off_duty'
          rating?: number
          total_trips?: number
          ambulatory_rate?: number
          wheelchair_rate?: number
          stretcher_rate?: number
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string
          license_number?: string | null
          license_expiry?: string | null
          certification_expiry?: string | null
          status?: 'available' | 'on_trip' | 'off_duty'
          rating?: number
          total_trips?: number
          ambulatory_rate?: number
          wheelchair_rate?: number
          stretcher_rate?: number
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          vehicle_number: string
          make: string
          model: string
          year: number
          license_plate: string | null
          vin: string | null
          capacity: number
          type: 'ambulatory' | 'wheelchair' | 'stretcher'
          status: 'available' | 'in_use' | 'maintenance'
          mileage: number
          last_maintenance_date: string | null
          next_maintenance_due: string | null
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vehicle_number: string
          make: string
          model: string
          year: number
          license_plate?: string | null
          vin?: string | null
          capacity?: number
          type: 'ambulatory' | 'wheelchair' | 'stretcher'
          status?: 'available' | 'in_use' | 'maintenance'
          mileage?: number
          last_maintenance_date?: string | null
          next_maintenance_due?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vehicle_number?: string
          make?: string
          model?: string
          year?: number
          license_plate?: string | null
          vin?: string | null
          capacity?: number
          type?: 'ambulatory' | 'wheelchair' | 'stretcher'
          status?: 'available' | 'in_use' | 'maintenance'
          mileage?: number
          last_maintenance_date?: string | null
          next_maintenance_due?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      patients: {
        Row: {
          id: string
          first_name: string
          last_name: string
          date_of_birth: string | null
          phone: string
          email: string | null
          address: string
          city: string
          state: string
          zip_code: string
          insurance_provider: string | null
          insurance_policy_number: string | null
          insurance_expiry: string | null
          mobility_type: 'ambulatory' | 'wheelchair' | 'stretcher'
          special_needs: string | null
          preferred_driver_id: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          date_of_birth?: string | null
          phone: string
          email?: string | null
          address: string
          city: string
          state?: string
          zip_code: string
          insurance_provider?: string | null
          insurance_policy_number?: string | null
          insurance_expiry?: string | null
          mobility_type: 'ambulatory' | 'wheelchair' | 'stretcher'
          special_needs?: string | null
          preferred_driver_id?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          date_of_birth?: string | null
          phone?: string
          email?: string | null
          address?: string
          city?: string
          state?: string
          zip_code?: string
          insurance_provider?: string | null
          insurance_policy_number?: string | null
          insurance_expiry?: string | null
          mobility_type?: 'ambulatory' | 'wheelchair' | 'stretcher'
          special_needs?: string | null
          preferred_driver_id?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      recurring_trips: {
        Row: {
          id: string
          template_name: string
          patient_id: string | null
          facility_id: string | null
          pickup_address: string
          dropoff_address: string
          trip_type: 'ambulatory' | 'wheelchair' | 'stretcher'
          preferred_driver_id: string | null
          frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
          days_of_week: string[] | null
          time_of_day: string
          start_date: string
          end_date: string | null
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_name: string
          patient_id?: string | null
          facility_id?: string | null
          pickup_address: string
          dropoff_address: string
          trip_type: 'ambulatory' | 'wheelchair' | 'stretcher'
          preferred_driver_id?: string | null
          frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
          days_of_week?: string[] | null
          time_of_day: string
          start_date: string
          end_date?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          template_name?: string
          patient_id?: string | null
          facility_id?: string | null
          pickup_address?: string
          dropoff_address?: string
          trip_type?: 'ambulatory' | 'wheelchair' | 'stretcher'
          preferred_driver_id?: string | null
          frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly'
          days_of_week?: string[] | null
          time_of_day?: string
          start_date?: string
          end_date?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      trips: {
        Row: {
          id: string
          trip_number: string
          patient_id: string | null
          driver_id: string | null
          vehicle_id: string | null
          facility_id: string | null
          pickup_address: string
          pickup_city: string
          pickup_state: string
          pickup_zip: string
          dropoff_address: string
          dropoff_city: string
          dropoff_state: string
          dropoff_zip: string
          scheduled_pickup_time: string
          scheduled_dropoff_time: string | null
          actual_pickup_time: string | null
          actual_dropoff_time: string | null
          trip_type: 'ambulatory' | 'wheelchair' | 'stretcher'
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          distance_miles: number
          wait_time_minutes: number
          rate: number
          wait_time_charge: number
          total_charge: number
          driver_payout: number
          is_return_trip: boolean
          linked_trip_id: string | null
          recurring_trip_id: string | null
          notes: string | null
          cancellation_reason: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trip_number: string
          patient_id?: string | null
          driver_id?: string | null
          vehicle_id?: string | null
          facility_id?: string | null
          pickup_address: string
          pickup_city: string
          pickup_state?: string
          pickup_zip: string
          dropoff_address: string
          dropoff_city: string
          dropoff_state?: string
          dropoff_zip: string
          scheduled_pickup_time: string
          scheduled_dropoff_time?: string | null
          actual_pickup_time?: string | null
          actual_dropoff_time?: string | null
          trip_type: 'ambulatory' | 'wheelchair' | 'stretcher'
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          distance_miles?: number
          wait_time_minutes?: number
          rate?: number
          wait_time_charge?: number
          total_charge?: number
          driver_payout?: number
          is_return_trip?: boolean
          linked_trip_id?: string | null
          recurring_trip_id?: string | null
          notes?: string | null
          cancellation_reason?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trip_number?: string
          patient_id?: string | null
          driver_id?: string | null
          vehicle_id?: string | null
          facility_id?: string | null
          pickup_address?: string
          pickup_city?: string
          pickup_state?: string
          pickup_zip?: string
          dropoff_address?: string
          dropoff_city?: string
          dropoff_state?: string
          dropoff_zip?: string
          scheduled_pickup_time?: string
          scheduled_dropoff_time?: string | null
          actual_pickup_time?: string | null
          actual_dropoff_time?: string | null
          trip_type?: 'ambulatory' | 'wheelchair' | 'stretcher'
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          distance_miles?: number
          wait_time_minutes?: number
          rate?: number
          wait_time_charge?: number
          total_charge?: number
          driver_payout?: number
          is_return_trip?: boolean
          linked_trip_id?: string | null
          recurring_trip_id?: string | null
          notes?: string | null
          cancellation_reason?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      trip_note_templates: {
        Row: {
          id: string
          title: string
          content: string
          category: 'general' | 'medical' | 'behavioral' | 'equipment'
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          category: 'general' | 'medical' | 'behavioral' | 'equipment'
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          category?: 'general' | 'medical' | 'behavioral' | 'equipment'
          is_active?: boolean
          created_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          facility_id: string
          invoice_date: string
          due_date: string
          period_start: string
          period_end: string
          subtotal: number
          tax: number
          total_amount: number
          payment_status: 'pending' | 'paid' | 'overdue' | 'cancelled'
          payment_date: string | null
          payment_method: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_number: string
          facility_id: string
          invoice_date?: string
          due_date: string
          period_start: string
          period_end: string
          subtotal?: number
          tax?: number
          total_amount?: number
          payment_status?: 'pending' | 'paid' | 'overdue' | 'cancelled'
          payment_date?: string | null
          payment_method?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_number?: string
          facility_id?: string
          invoice_date?: string
          due_date?: string
          period_start?: string
          period_end?: string
          subtotal?: number
          tax?: number
          total_amount?: number
          payment_status?: 'pending' | 'paid' | 'overdue' | 'cancelled'
          payment_date?: string | null
          payment_method?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoice_line_items: {
        Row: {
          id: string
          invoice_id: string
          trip_id: string | null
          description: string
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          trip_id?: string | null
          description: string
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          trip_id?: string | null
          description?: string
          amount?: number
          created_at?: string
        }
      }
      driver_payouts: {
        Row: {
          id: string
          payout_number: string
          driver_id: string
          period_start: string
          period_end: string
          total_trips: number
          total_amount: number
          payment_status: 'pending' | 'paid' | 'cancelled'
          payment_date: string | null
          payment_method: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          payout_number: string
          driver_id: string
          period_start: string
          period_end: string
          total_trips?: number
          total_amount?: number
          payment_status?: 'pending' | 'paid' | 'cancelled'
          payment_date?: string | null
          payment_method?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          payout_number?: string
          driver_id?: string
          period_start?: string
          period_end?: string
          total_trips?: number
          total_amount?: number
          payment_status?: 'pending' | 'paid' | 'cancelled'
          payment_date?: string | null
          payment_method?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      activity_log: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          details: Json | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          details?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          details?: Json | null
          ip_address?: string | null
          created_at?: string
        }
      }
    }
  }
}
