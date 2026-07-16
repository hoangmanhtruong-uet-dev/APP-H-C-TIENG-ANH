export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      learner_lesson_progress: {
        Row: {
          completed_at: string | null;
          created_at: string;
          current_section_id: string | null;
          last_accessed_at: string;
          lesson_id: string;
          lesson_version_id: string;
          progress_percent: number;
          started_at: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          current_section_id?: string | null;
          last_accessed_at?: string;
          lesson_id: string;
          lesson_version_id: string;
          progress_percent?: number;
          started_at?: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          current_section_id?: string | null;
          last_accessed_at?: string;
          lesson_id?: string;
          lesson_version_id?: string;
          progress_percent?: number;
          started_at?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learner_lesson_progress_current_section_fkey";
            columns: ["lesson_version_id", "current_section_id"];
            isOneToOne: false;
            referencedRelation: "lesson_sections";
            referencedColumns: ["lesson_version_id", "id"];
          },
          {
            foreignKeyName: "learner_lesson_progress_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learner_lesson_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learner_lesson_progress_version_fkey";
            columns: ["lesson_id", "lesson_version_id"];
            isOneToOne: false;
            referencedRelation: "lesson_versions";
            referencedColumns: ["lesson_id", "id"];
          },
        ];
      };
      learner_profiles: {
        Row: {
          created_at: string;
          current_band: number | null;
          daily_study_minutes: number | null;
          onboarding_completed_at: string | null;
          onboarding_step: number;
          primary_goal: string | null;
          priority_skills: string[];
          study_days_per_week: number | null;
          target_band: number | null;
          target_exam_date: string | null;
          test_type: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          current_band?: number | null;
          daily_study_minutes?: number | null;
          onboarding_completed_at?: string | null;
          onboarding_step?: number;
          primary_goal?: string | null;
          priority_skills?: string[];
          study_days_per_week?: number | null;
          target_band?: number | null;
          target_exam_date?: string | null;
          test_type?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          current_band?: number | null;
          daily_study_minutes?: number | null;
          onboarding_completed_at?: string | null;
          onboarding_step?: number;
          primary_goal?: string | null;
          priority_skills?: string[];
          study_days_per_week?: number | null;
          target_band?: number | null;
          target_exam_date?: string | null;
          test_type?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learner_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      learner_section_progress: {
        Row: {
          completed_at: string | null;
          created_at: string;
          last_viewed_at: string;
          lesson_id: string;
          lesson_version_id: string;
          section_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          last_viewed_at?: string;
          lesson_id: string;
          lesson_version_id: string;
          section_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          last_viewed_at?: string;
          lesson_id?: string;
          lesson_version_id?: string;
          section_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learner_section_progress_lesson_fkey";
            columns: ["user_id", "lesson_id"];
            isOneToOne: false;
            referencedRelation: "learner_lesson_progress";
            referencedColumns: ["user_id", "lesson_id"];
          },
          {
            foreignKeyName: "learner_section_progress_section_fkey";
            columns: ["lesson_version_id", "section_id"];
            isOneToOne: false;
            referencedRelation: "lesson_sections";
            referencedColumns: ["lesson_version_id", "id"];
          },
          {
            foreignKeyName: "learner_section_progress_version_fkey";
            columns: ["lesson_id", "lesson_version_id"];
            isOneToOne: false;
            referencedRelation: "lesson_versions";
            referencedColumns: ["lesson_id", "id"];
          },
        ];
      };
      learning_modules: {
        Row: {
          created_at: string;
          description: string;
          difficulty: string;
          display_order: number;
          estimated_minutes: number;
          id: string;
          published_at: string | null;
          skill: string;
          slug: string;
          status: string;
          test_type: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          difficulty: string;
          display_order: number;
          estimated_minutes: number;
          id?: string;
          published_at?: string | null;
          skill: string;
          slug: string;
          status?: string;
          test_type: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          difficulty?: string;
          display_order?: number;
          estimated_minutes?: number;
          id?: string;
          published_at?: string | null;
          skill?: string;
          slug?: string;
          status?: string;
          test_type?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lesson_sections: {
        Row: {
          body_markdown: string;
          created_at: string;
          display_order: number;
          id: string;
          is_required: boolean;
          lesson_version_id: string;
          section_type: string;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          body_markdown: string;
          created_at?: string;
          display_order: number;
          id?: string;
          is_required?: boolean;
          lesson_version_id: string;
          section_type: string;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          body_markdown?: string;
          created_at?: string;
          display_order?: number;
          id?: string;
          is_required?: boolean;
          lesson_version_id?: string;
          section_type?: string;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_sections_lesson_version_id_fkey";
            columns: ["lesson_version_id"];
            isOneToOne: false;
            referencedRelation: "lesson_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_versions: {
        Row: {
          archived_at: string | null;
          created_at: string;
          difficulty: string;
          estimated_minutes: number;
          id: string;
          lesson_id: string;
          published_at: string | null;
          status: string;
          summary: string;
          title: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          difficulty: string;
          estimated_minutes: number;
          id?: string;
          lesson_id: string;
          published_at?: string | null;
          status?: string;
          summary: string;
          title: string;
          updated_at?: string;
          version: number;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          difficulty?: string;
          estimated_minutes?: number;
          id?: string;
          lesson_id?: string;
          published_at?: string | null;
          status?: string;
          summary?: string;
          title?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_versions_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          created_at: string;
          display_order: number;
          id: string;
          module_id: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_order: number;
          id?: string;
          module_id: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_order?: number;
          id?: string;
          module_id?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "learning_modules";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          locale: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          locale?: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          locale?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      complete_learner_onboarding: {
        Args: never;
        Returns: {
          created_at: string;
          current_band: number | null;
          daily_study_minutes: number | null;
          onboarding_completed_at: string | null;
          onboarding_step: number;
          primary_goal: string | null;
          priority_skills: string[];
          study_days_per_week: number | null;
          target_band: number | null;
          target_exam_date: string | null;
          test_type: string | null;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "learner_profiles";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      complete_lesson_section: {
        Args: { p_lesson_id: string; p_section_id: string };
        Returns: {
          completed_at: string | null;
          created_at: string;
          current_section_id: string | null;
          last_accessed_at: string;
          lesson_id: string;
          lesson_version_id: string;
          progress_percent: number;
          started_at: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "learner_lesson_progress";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      open_lesson_section: {
        Args: { p_lesson_id: string; p_section_id?: string };
        Returns: {
          completed_at: string | null;
          created_at: string;
          current_section_id: string | null;
          last_accessed_at: string;
          lesson_id: string;
          lesson_version_id: string;
          progress_percent: number;
          started_at: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "learner_lesson_progress";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
