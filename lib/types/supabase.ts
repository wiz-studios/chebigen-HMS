export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          id: string
          patient_id: string
          provider_id: string
          scheduled_time: string
          status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show" | "arrived"
          notes: string
          created_at: string
          duration: number | null
          appointment_type: string | null
        }
        Insert: {
          id?: string
          patient_id: string
          provider_id: string
          scheduled_time: string
          status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show" | "arrived"
          notes?: string
          created_at?: string
          duration?: number | null
          appointment_type?: string | null
        }
        Update: {
          id?: string
          patient_id?: string
          provider_id?: string
          scheduled_time?: string
          status?: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show" | "arrived"
          notes?: string
          created_at?: string
          duration?: number | null
          appointment_type?: string | null
        }
      }
      patients: {
        Row: {
          id: string
          user_id: string
          first_name: string
          last_name: string
          mrn: string
          dob: string
          gender: string
          contact: string
          address: string
          medical_history: string | null
          allergies: string | null
          current_medications: string | null
          emergency_contact: string | null
          blood_type: string | null
          insurance_info: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          first_name: string
          last_name: string
          mrn: string
          dob: string
          gender: string
          contact: string
          address: string
          medical_history?: string | null
          allergies?: string | null
          current_medications?: string | null
          emergency_contact?: string | null
          blood_type?: string | null
          insurance_info?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          first_name?: string
          last_name?: string
          mrn?: string
          dob?: string
          gender?: string
          contact?: string
          address?: string
          medical_history?: string | null
          allergies?: string | null
          current_medications?: string | null
          emergency_contact?: string | null
          blood_type?: string | null
          insurance_info?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          role: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}