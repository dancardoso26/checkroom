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
      academic_terms: {
        Row: {
          code: string
          created_at: string
          ends_on: string
          id: string
          starts_on: string
        }
        Insert: {
          code: string
          created_at?: string
          ends_on: string
          id?: string
          starts_on: string
        }
        Update: {
          code?: string
          created_at?: string
          ends_on?: string
          id?: string
          starts_on?: string
        }
        Relationships: [
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after_state: Json | null
          before_state: Json | null
          entity: string
          entity_id: string | null
          id: number
          occurred_at: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          entity: string
          entity_id?: string | null
          id?: never
          occurred_at?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          entity?: string
          entity_id?: string | null
          id?: never
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_resources: {
        Row: {
          booking_id: string
          resource_id: string
        }
        Insert: {
          booking_id: string
          resource_id: string
        }
        Update: {
          booking_id?: string
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_resources_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          cancellation_reason: string | null
          cancelled_at: string | null
          class_id: string
          created_at: string
          created_by: string
          ends_at: string
          id: string
          professor_id: string
          purpose: string
          room_id: string
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          subject_id: string | null
        }
        Insert: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          cancellation_reason?: string | null
          cancelled_at?: string | null
          class_id: string
          created_at?: string
          created_by: string
          ends_at: string
          id?: string
          professor_id: string
          purpose: string
          room_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          subject_id?: string | null
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          cancellation_reason?: string | null
          cancelled_at?: string | null
          class_id?: string
          created_at?: string
          created_by?: string
          ends_at?: string
          id?: string
          professor_id?: string
          purpose?: string
          room_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_blocks: {
        Row: {
          created_at: string
          ends_on: string
          id: string
          reason: string
          room_id: string | null
          starts_on: string
        }
        Insert: {
          created_at?: string
          ends_on: string
          id?: string
          reason: string
          room_id?: string | null
          starts_on: string
        }
        Update: {
          created_at?: string
          ends_on?: string
          id?: string
          reason?: string
          room_id?: string | null
          starts_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_blocks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          course_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          department: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          department: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          department?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      lecture_courses: {
        Row: {
          course_id: string
          lecture_id: string
        }
        Insert: {
          course_id: string
          lecture_id: string
        }
        Update: {
          course_id?: string
          lecture_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_courses_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_enrollments: {
        Row: {
          enrolled_at: string
          id: string
          lecture_id: string
          profile_id: string
        }
        Insert: {
          enrolled_at?: string
          id?: string
          lecture_id: string
          profile_id: string
        }
        Update: {
          enrolled_at?: string
          id?: string
          lecture_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_enrollments_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_enrollments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lectures: {
        Row: {
          created_at: string
          created_by: string
          ends_at: string
          id: string
          room_id: string
          seats: number
          speaker: string
          speaker_professor_id: string | null
          starts_at: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ends_at: string
          id?: string
          room_id: string
          seats: number
          speaker: string
          speaker_professor_id?: string | null
          starts_at: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ends_at?: string
          id?: string
          room_id?: string
          seats?: number
          speaker?: string
          speaker_professor_id?: string | null
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lectures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lectures_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lectures_speaker_professor_id_fkey"
            columns: ["speaker_professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
        ]
      }
      professors: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          anonymized_at: string | null
          class_id: string | null
          course_id: string | null
          created_at: string
          user_master: boolean
          full_name: string
          id: string
          professor_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          terms_accepted_at: string | null
          terms_version: string | null
        }
        Insert: {
          anonymized_at?: string | null
          class_id?: string | null
          course_id?: string | null
          created_at?: string
          user_master?: boolean
          full_name: string
          id: string
          professor_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          terms_accepted_at?: string | null
          terms_version?: string | null
        }
        Update: {
          anonymized_at?: string | null
          class_id?: string | null
          course_id?: string | null
          created_at?: string
          user_master?: boolean
          full_name?: string
          id?: string
          professor_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          terms_accepted_at?: string | null
          terms_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: true
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      room_resources: {
        Row: {
          resource_id: string
          room_id: string
        }
        Insert: {
          resource_id: string
          room_id: string
        }
        Update: {
          resource_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_resources_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          building: string
          building_number: number
          capacity: number
          created_at: string
          id: string
          name: string
          floor: string
          room_number: number
          room_type: Database["public"]["Enums"]["room_type"]
        }
        Insert: {
          building_number: number
          capacity: number
          created_at?: string
          id?: string
          floor: string
          room_number: number
          room_type: Database["public"]["Enums"]["room_type"]
        }
        Update: {
          building_number?: number
          capacity?: number
          created_at?: string
          id?: string
          floor?: string
          room_number?: number
          room_type?: Database["public"]["Enums"]["room_type"]
        }
        Relationships: []
      }
      subjects: {
        Row: {
          course_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      teaching_assignments: {
        Row: {
          class_id: string
          created_at: string
          id: string
          professor_id: string
          subject_id: string
          term: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          professor_id: string
          subject_id: string
          term: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          professor_id?: string
          subject_id?: string
          term?: string
        }
        Relationships: [
          {
            foreignKeyName: "teaching_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_assignments_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          cancelled_at: string | null
          created_at: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          requested_by: string
          resolution_note: string | null
          resolved_at: string | null
          room_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
        }
        Insert: {
          assigned_to?: string | null
          cancelled_at?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          requested_by: string
          resolution_note?: string | null
          resolved_at?: string | null
          room_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
        }
        Update: {
          assigned_to?: string | null
          cancelled_at?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          requested_by?: string
          resolution_note?: string | null
          resolved_at?: string | null
          room_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      anonimizar_conta: { Args: never; Returns: undefined }
      remover_usuario: { Args: { p_alvo: string }; Returns: undefined }
      alterar_papel: {
        Args: {
          p_alvo: string
          p_papel: Database["public"]["Enums"]["user_role"]
          p_turma?: string | null
        }
        Returns: undefined
      }
      assumir_chamado: { Args: { p_chamado: string }; Returns: string }
      cadastrar_palestra: {
        Args: {
          p_cursos: string[]
          p_fim: string
          p_inicio: string
          p_palestrante: string
          p_palestrante_professor_id?: string | null
          p_room_id: string
          p_titulo: string
          p_vagas: number
        }
        Returns: string
      }
      cancelar_chamado: { Args: { p_chamado: string }; Returns: string }
      excluir_chamado: { Args: { p_chamado: string }; Returns: string }
      cancelar_inscricao: { Args: { p_palestra: string }; Returns: string }
      cancel_booking: {
        Args: { p_booking_id: string; p_reason?: string }
        Returns: string
      }
      create_booking: {
        Args: {
          p_activity_type?: Database["public"]["Enums"]["activity_type"]
          p_class_id: string
          p_created_by: string
          p_ends_at: string
          p_professor_id: string
          p_purpose: string
          p_resource_ids: string[]
          p_room_id: string
          p_starts_at: string
          p_subject_id?: string
        }
        Returns: string
      }
      eh_admin: { Args: never; Returns: boolean }
      inscrever_em_palestra: { Args: { p_palestra: string }; Returns: string }
      inscritos_por_palestra: {
        Args: { p_palestras: string[] }
        Returns: { inscritos: number; lecture_id: string }[]
      }
      papel_atual: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      professor_atual: { Args: never; Returns: string }
      resolver_chamado: {
        Args: { p_chamado: string; p_nota: string }
        Returns: string
      }
      salvar_espaco: {
        Args: {
          p_andar: string
          p_capacidade: number
          p_id: string | null
          p_predio: number
          p_recursos: string[]
          p_sala: number
          p_tipo: Database["public"]["Enums"]["room_type"]
        }
        Returns: string
      }
    }
    Enums: {
      activity_type: "class" | "lecture" | "exam" | "event"
      booking_status: "active" | "cancelled"
      room_type: "classroom" | "laboratory" | "auditorium"
      ticket_priority: "low" | "medium" | "high"
      ticket_status: "open" | "in_progress" | "resolved" | "cancelled"
      user_role: "student" | "professor" | "it_support" | "admin"
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
    Enums: {
      activity_type: ["class", "lecture", "exam", "event"],
      booking_status: ["active", "cancelled"],
      room_type: ["classroom", "laboratory", "auditorium"],
      ticket_priority: ["low", "medium", "high"],
      ticket_status: ["open", "in_progress", "resolved", "cancelled"],
      user_role: ["student", "professor", "it_support", "admin"],
    },
  },
} as const
