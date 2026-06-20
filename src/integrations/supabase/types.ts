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
      author_decisions: {
        Row: {
          created_at: string
          decision: Database["public"]["Enums"]["author_decision_type"]
          id: string
          paper_id: string
          prepared_by: string
          sent_at: string
          unified_message: string
        }
        Insert: {
          created_at?: string
          decision: Database["public"]["Enums"]["author_decision_type"]
          id?: string
          paper_id: string
          prepared_by: string
          sent_at?: string
          unified_message: string
        }
        Update: {
          created_at?: string
          decision?: Database["public"]["Enums"]["author_decision_type"]
          id?: string
          paper_id?: string
          prepared_by?: string
          sent_at?: string
          unified_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "author_decisions_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
        ]
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
      criteria_scores: {
        Row: {
          comment: string | null
          created_at: string
          criteria_id: string
          id: string
          review_report_id: string
          score: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          criteria_id: string
          id?: string
          review_report_id: string
          score?: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          criteria_id?: string
          id?: string
          review_report_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "criteria_scores_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "evaluation_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "criteria_scores_review_report_id_fkey"
            columns: ["review_report_id"]
            isOneToOne: false
            referencedRelation: "review_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_criteria: {
        Row: {
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          is_active: boolean
          journal_id: string
          max_score: number
          name_ar: string
          name_en: string
          sort_order: number
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          journal_id: string
          max_score?: number
          name_ar: string
          name_en: string
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          journal_id?: string
          max_score?: number
          name_ar?: string
          name_en?: string
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_criteria_journal_id_fkey"
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
          page_count: number | null
          status: Database["public"]["Enums"]["paper_status"]
          submitted_at: string | null
          submitted_by: string
          title_ar: string | null
          title_en: string | null
          updated_at: string
          word_count: number | null
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
          page_count?: number | null
          status?: Database["public"]["Enums"]["paper_status"]
          submitted_at?: string | null
          submitted_by: string
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
          word_count?: number | null
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
          page_count?: number | null
          status?: Database["public"]["Enums"]["paper_status"]
          submitted_at?: string | null
          submitted_by?: string
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
          word_count?: number | null
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
          {
            foreignKeyName: "papers_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      review_reports: {
        Row: {
          confidential_comments: string | null
          created_at: string
          general_comments: string | null
          id: string
          is_submitted: boolean
          paper_id: string
          recommendation:
            | Database["public"]["Enums"]["review_recommendation"]
            | null
          report_file_url: string | null
          review_request_id: string
          reviewer_id: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          confidential_comments?: string | null
          created_at?: string
          general_comments?: string | null
          id?: string
          is_submitted?: boolean
          paper_id: string
          recommendation?:
            | Database["public"]["Enums"]["review_recommendation"]
            | null
          report_file_url?: string | null
          review_request_id: string
          reviewer_id: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          confidential_comments?: string | null
          created_at?: string
          general_comments?: string | null
          id?: string
          is_submitted?: boolean
          paper_id?: string
          recommendation?:
            | Database["public"]["Enums"]["review_recommendation"]
            | null
          report_file_url?: string | null
          review_request_id?: string
          reviewer_id?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_reports_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_reports_review_request_id_fkey"
            columns: ["review_request_id"]
            isOneToOne: false
            referencedRelation: "review_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      review_requests: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          paper_id: string
          requested_by: string
          responded_at: string | null
          response_notes: string | null
          reviewer_id: string
          status: Database["public"]["Enums"]["review_request_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paper_id: string
          requested_by: string
          responded_at?: string | null
          response_notes?: string | null
          reviewer_id: string
          status?: Database["public"]["Enums"]["review_request_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paper_id?: string
          requested_by?: string
          responded_at?: string | null
          response_notes?: string | null
          reviewer_id?: string
          status?: Database["public"]["Enums"]["review_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_requests_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_requested_by_profiles_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_reviewer_id_profiles_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      can_view_paper_as_reviewer: {
        Args: { _paper_id: string; _user_id: string }
        Returns: boolean
      }
      can_vote_on_committee_paper: {
        Args: { _committee_paper_id: string; _user_id: string }
        Returns: boolean
      }
      get_committee_paper_tally: {
        Args: { _committee_paper_id: string }
        Returns: {
          abstain_count: number
          approve_count: number
          approve_revisions_count: number
          cast_count: number
          member_count: number
          reject_count: number
        }[]
      }
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
      is_hq_admin: { Args: { _user_id: string }; Returns: boolean }
      is_member_of_journal: {
        Args: { _journal_id: string; _user_id: string }
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
        | "hq_admin"
      author_decision_type:
        | "accept"
        | "minor_revision"
        | "major_revision"
        | "reject"
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
      review_recommendation:
        | "accept"
        | "minor_revision"
        | "major_revision"
        | "reject"
      review_request_status:
        | "pending"
        | "accepted"
        | "declined"
        | "completed"
        | "cancelled"
        | "expired"
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
        "hq_admin",
      ],
      author_decision_type: [
        "accept",
        "minor_revision",
        "major_revision",
        "reject",
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
      review_recommendation: [
        "accept",
        "minor_revision",
        "major_revision",
        "reject",
      ],
      review_request_status: [
        "pending",
        "accepted",
        "declined",
        "completed",
        "cancelled",
        "expired",
      ],
    },
  },
} as const
