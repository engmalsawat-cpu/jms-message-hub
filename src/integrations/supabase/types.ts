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
      academic_qualifications: {
        Row: {
          certificate_url: string | null
          country: string | null
          created_at: string
          degree: string
          field_of_study: string
          graduation_year: number | null
          id: string
          institution: string
          updated_at: string
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          country?: string | null
          created_at?: string
          degree: string
          field_of_study: string
          graduation_year?: number | null
          id?: string
          institution: string
          updated_at?: string
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          country?: string | null
          created_at?: string
          degree?: string
          field_of_study?: string
          graduation_year?: number | null
          id?: string
          institution?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blacklist: {
        Row: {
          added_by: string | null
          created_at: string
          email: string
          id: string
          journal_id: string
          reason: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          email: string
          id?: string
          journal_id: string
          reason?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string
          email?: string
          id?: string
          journal_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blacklist_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_members: {
        Row: {
          committee_id: string
          created_at: string
          id: string
          is_head: boolean
          user_id: string
        }
        Insert: {
          committee_id: string
          created_at?: string
          id?: string
          is_head?: boolean
          user_id: string
        }
        Update: {
          committee_id?: string
          created_at?: string
          id?: string
          is_head?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "committee_members_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_papers: {
        Row: {
          committee_id: string
          created_at: string
          decision: string | null
          id: string
          notes: string | null
          paper_id: string
          status: string
          updated_at: string
        }
        Insert: {
          committee_id: string
          created_at?: string
          decision?: string | null
          id?: string
          notes?: string | null
          paper_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          committee_id?: string
          created_at?: string
          decision?: string | null
          id?: string
          notes?: string | null
          paper_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "committee_papers_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_papers_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_votes: {
        Row: {
          committee_paper_id: string
          created_at: string
          id: string
          justification: string | null
          user_id: string
          vote: string
        }
        Insert: {
          committee_paper_id: string
          created_at?: string
          id?: string
          justification?: string | null
          user_id: string
          vote: string
        }
        Update: {
          committee_paper_id?: string
          created_at?: string
          id?: string
          justification?: string | null
          user_id?: string
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "committee_votes_committee_paper_id_fkey"
            columns: ["committee_paper_id"]
            isOneToOne: false
            referencedRelation: "committee_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      committees: {
        Row: {
          committee_type: string
          created_at: string
          id: string
          journal_id: string
          min_votes: number
          name_ar: string
          name_en: string
          updated_at: string
          voting_mechanism: string
        }
        Insert: {
          committee_type?: string
          created_at?: string
          id?: string
          journal_id: string
          min_votes?: number
          name_ar: string
          name_en: string
          updated_at?: string
          voting_mechanism?: string
        }
        Update: {
          committee_type?: string
          created_at?: string
          id?: string
          journal_id?: string
          min_votes?: number
          name_ar?: string
          name_en?: string
          updated_at?: string
          voting_mechanism?: string
        }
        Relationships: [
          {
            foreignKeyName: "committees_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_records: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          journal_id: string
          metadata: Json | null
          paper_id: string | null
          record_type: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          journal_id: string
          metadata?: Json | null
          paper_id?: string | null
          record_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          journal_id?: string
          metadata?: Json | null
          paper_id?: string | null
          record_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_records_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_members: {
        Row: {
          created_at: string
          id: string
          journal_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          journal_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          journal_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_members_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
        ]
      }
      journals: {
        Row: {
          created_at: string
          created_by: string | null
          description_ar: string | null
          description_en: string | null
          id: string
          issn: string | null
          settings: Json | null
          status: Database["public"]["Enums"]["journal_status"]
          title_ar: string
          title_en: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          issn?: string | null
          settings?: Json | null
          status?: Database["public"]["Enums"]["journal_status"]
          title_ar: string
          title_en: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          issn?: string | null
          settings?: Json | null
          status?: Database["public"]["Enums"]["journal_status"]
          title_ar?: string
          title_en?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: Json | null
          body: string
          created_at: string
          id: string
          sender_id: string
          thread_id: string
        }
        Insert: {
          attachments?: Json | null
          body: string
          created_at?: string
          id?: string
          sender_id: string
          thread_id: string
        }
        Update: {
          attachments?: Json | null
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body_ar: string | null
          body_en: string | null
          created_at: string
          id: string
          is_read: boolean
          metadata: Json | null
          title_ar: string | null
          title_en: string | null
          type: string
          user_id: string
        }
        Insert: {
          body_ar?: string | null
          body_en?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          title_ar?: string | null
          title_en?: string | null
          type: string
          user_id: string
        }
        Update: {
          body_ar?: string | null
          body_en?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          title_ar?: string | null
          title_en?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      paper_roles: {
        Row: {
          created_at: string
          id: string
          paper_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          paper_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          paper_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_roles_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_stage_history: {
        Row: {
          action: string
          created_at: string
          id: string
          notes: string | null
          paper_id: string
          performed_by: string | null
          stage_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          notes?: string | null
          paper_id: string
          performed_by?: string | null
          stage_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          notes?: string | null
          paper_id?: string
          performed_by?: string | null
          stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paper_stage_history_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paper_stage_history_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      papers: {
        Row: {
          abstract_ar: string | null
          abstract_en: string | null
          created_at: string
          current_stage_id: string | null
          file_url: string | null
          id: string
          journal_id: string
          keywords: string[] | null
          metadata: Json | null
          status: Database["public"]["Enums"]["paper_status"]
          submitted_at: string | null
          submitted_by: string
          title_ar: string | null
          title_en: string | null
          updated_at: string
        }
        Insert: {
          abstract_ar?: string | null
          abstract_en?: string | null
          created_at?: string
          current_stage_id?: string | null
          file_url?: string | null
          id?: string
          journal_id: string
          keywords?: string[] | null
          metadata?: Json | null
          status?: Database["public"]["Enums"]["paper_status"]
          submitted_at?: string | null
          submitted_by: string
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          abstract_ar?: string | null
          abstract_en?: string | null
          created_at?: string
          current_stage_id?: string | null
          file_url?: string | null
          id?: string
          journal_id?: string
          keywords?: string[] | null
          metadata?: Json | null
          status?: Database["public"]["Enums"]["paper_status"]
          submitted_at?: string | null
          submitted_by?: string
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "papers_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "papers_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          academic_rank: string | null
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          google_scholar_url: string | null
          id: string
          institution: string | null
          orcid: string | null
          phone: string | null
          preferred_language: string
          updated_at: string
        }
        Insert: {
          academic_rank?: string | null
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          google_scholar_url?: string | null
          id: string
          institution?: string | null
          orcid?: string | null
          phone?: string | null
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          academic_rank?: string | null
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          google_scholar_url?: string | null
          id?: string
          institution?: string | null
          orcid?: string | null
          phone?: string | null
          preferred_language?: string
          updated_at?: string
        }
        Relationships: []
      }
      scientific_productions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          production_type: string
          publication_date: string | null
          publisher: string | null
          title: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          production_type?: string
          publication_date?: string | null
          publisher?: string | null
          title: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          production_type?: string
          publication_date?: string | null
          publisher?: string | null
          title?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      specializations: {
        Row: {
          created_at: string
          id: string
          name_ar: string
          name_en: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name_ar: string
          name_en: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name_ar?: string
          name_en?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "specializations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "specializations"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_windows: {
        Row: {
          closes_at: string
          created_at: string
          id: string
          journal_id: string
          opens_at: string
          title: string
        }
        Insert: {
          closes_at: string
          created_at?: string
          id?: string
          journal_id: string
          opens_at: string
          title: string
        }
        Update: {
          closes_at?: string
          created_at?: string
          id?: string
          journal_id?: string
          opens_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_windows_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          created_at: string
          id: string
          paper_id: string | null
          participants: string[] | null
          subject: string | null
          thread_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          paper_id?: string | null
          participants?: string[] | null
          subject?: string | null
          thread_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          paper_id?: string | null
          participants?: string[] | null
          subject?: string | null
          thread_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_specializations: {
        Row: {
          created_at: string
          id: string
          specialization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          specialization_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          specialization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_specializations_specialization_id_fkey"
            columns: ["specialization_id"]
            isOneToOne: false
            referencedRelation: "specializations"
            referencedColumns: ["id"]
          },
        ]
      }
      work_experiences: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_current: boolean
          job_title: string
          organization: string
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          job_title: string
          organization: string
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          job_title?: string
          organization?: string
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workflow_stages: {
        Row: {
          created_at: string
          id: string
          journal_id: string
          name_ar: string
          name_en: string
          settings: Json | null
          stage_order: number
          stage_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          journal_id: string
          name_ar: string
          name_en: string
          settings?: Json | null
          stage_order?: number
          stage_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          journal_id?: string
          name_ar?: string
          name_en?: string
          settings?: Json | null
          stage_order?: number
          stage_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_stages_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "editor_in_chief"
        | "managing_editor"
        | "reviewer"
        | "researcher"
        | "committee_member"
      journal_status: "active" | "inactive" | "archived"
      paper_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "revision_required"
        | "revised"
        | "accepted"
        | "rejected"
        | "published"
        | "withdrawn"
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
      app_role: [
        "admin",
        "editor_in_chief",
        "managing_editor",
        "reviewer",
        "researcher",
        "committee_member",
      ],
      journal_status: ["active", "inactive", "archived"],
      paper_status: [
        "draft",
        "submitted",
        "under_review",
        "revision_required",
        "revised",
        "accepted",
        "rejected",
        "published",
        "withdrawn",
      ],
    },
  },
} as const
