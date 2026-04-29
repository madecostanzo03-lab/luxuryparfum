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
      brands: {
        Row: {
          brand_tier: number
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          brand_tier?: number
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          brand_tier?: number
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      clean_image_import_queue: {
        Row: {
          assigned_perfume_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          notes: string | null
          original_filename: string
          pending_path: string
          phash: string | null
          status: string
          suggested_perfume_ids: string[]
          suggestion_scores: number[]
          updated_at: string
        }
        Insert: {
          assigned_perfume_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          original_filename: string
          pending_path: string
          phash?: string | null
          status?: string
          suggested_perfume_ids?: string[]
          suggestion_scores?: number[]
          updated_at?: string
        }
        Update: {
          assigned_perfume_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          original_filename?: string
          pending_path?: string
          phash?: string | null
          status?: string
          suggested_perfume_ids?: string[]
          suggestion_scores?: number[]
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      perfume_variants: {
        Row: {
          concentration:
            | Database["public"]["Enums"]["concentration_type"]
            | null
          created_at: string
          id: string
          in_stock: boolean
          perfume_id: string
          price: number
          size_ml: number | null
        }
        Insert: {
          concentration?:
            | Database["public"]["Enums"]["concentration_type"]
            | null
          created_at?: string
          id?: string
          in_stock?: boolean
          perfume_id: string
          price: number
          size_ml?: number | null
        }
        Update: {
          concentration?:
            | Database["public"]["Enums"]["concentration_type"]
            | null
          created_at?: string
          id?: string
          in_stock?: boolean
          perfume_id?: string
          price?: number
          size_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "perfume_variants_perfume_id_fkey"
            columns: ["perfume_id"]
            isOneToOne: false
            referencedRelation: "perfumes"
            referencedColumns: ["id"]
          },
        ]
      }
      perfumes: {
        Row: {
          base_name: string | null
          brand_id: string
          clean_image_url: string | null
          concentration:
            | Database["public"]["Enums"]["concentration_type"]
            | null
          created_at: string
          description: string | null
          fragrance_type: Database["public"]["Enums"]["fragrance_type"] | null
          gender: Database["public"]["Enums"]["gender_type"]
          id: string
          image_url: string | null
          in_stock: boolean
          is_bestseller: boolean
          is_recommended: boolean
          name: string
          notes: string | null
          price: number
          promotion_text: string | null
          size_ml: number | null
          updated_at: string
        }
        Insert: {
          base_name?: string | null
          brand_id: string
          clean_image_url?: string | null
          concentration?:
            | Database["public"]["Enums"]["concentration_type"]
            | null
          created_at?: string
          description?: string | null
          fragrance_type?: Database["public"]["Enums"]["fragrance_type"] | null
          gender: Database["public"]["Enums"]["gender_type"]
          id?: string
          image_url?: string | null
          in_stock?: boolean
          is_bestseller?: boolean
          is_recommended?: boolean
          name: string
          notes?: string | null
          price: number
          promotion_text?: string | null
          size_ml?: number | null
          updated_at?: string
        }
        Update: {
          base_name?: string | null
          brand_id?: string
          clean_image_url?: string | null
          concentration?:
            | Database["public"]["Enums"]["concentration_type"]
            | null
          created_at?: string
          description?: string | null
          fragrance_type?: Database["public"]["Enums"]["fragrance_type"] | null
          gender?: Database["public"]["Enums"]["gender_type"]
          id?: string
          image_url?: string | null
          in_stock?: boolean
          is_bestseller?: boolean
          is_recommended?: boolean
          name?: string
          notes?: string | null
          price?: number
          promotion_text?: string | null
          size_ml?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfumes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      price_review_queue: {
        Row: {
          created_at: string
          diferencia: number | null
          id: string
          nombre_db: string
          nombre_pdf_candidato: string | null
          notas: string | null
          perfume_id: string
          precio_db: number
          precio_pdf: number | null
          score: number | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          diferencia?: number | null
          id?: string
          nombre_db: string
          nombre_pdf_candidato?: string | null
          notas?: string | null
          perfume_id: string
          precio_db: number
          precio_pdf?: number | null
          score?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          diferencia?: number | null
          id?: string
          nombre_db?: string
          nombre_pdf_candidato?: string | null
          notas?: string | null
          perfume_id?: string
          precio_db?: number
          precio_pdf?: number | null
          score?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      concentration_type: "edt" | "edp" | "edc" | "parfum" | "extrait"
      fragrance_type: "fresco" | "dulce" | "amaderado" | "intenso"
      gender_type: "hombre" | "mujer" | "unisex"
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
      app_role: ["admin", "moderator", "user"],
      concentration_type: ["edt", "edp", "edc", "parfum", "extrait"],
      fragrance_type: ["fresco", "dulce", "amaderado", "intenso"],
      gender_type: ["hombre", "mujer", "unisex"],
    },
  },
} as const
