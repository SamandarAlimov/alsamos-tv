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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      billing_history: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          description: string | null
          id: string
          status: string | null
          stripe_invoice_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          status?: string | null
          stripe_invoice_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          status?: string | null
          stripe_invoice_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      channel_schedules: {
        Row: {
          category: string | null
          channel_id: string
          created_at: string
          end_time: string
          id: string
          is_live: boolean | null
          program_description: string | null
          program_title: string
          start_time: string
          thumbnail_url: string | null
        }
        Insert: {
          category?: string | null
          channel_id: string
          created_at?: string
          end_time: string
          id?: string
          is_live?: boolean | null
          program_description?: string | null
          program_title: string
          start_time: string
          thumbnail_url?: string | null
        }
        Update: {
          category?: string | null
          channel_id?: string
          created_at?: string
          end_time?: string
          id?: string
          is_live?: boolean | null
          program_description?: string | null
          program_title?: string
          start_time?: string
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_schedules_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_schedules_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels_public"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          category: string | null
          created_at: string
          current_program: string | null
          description: string | null
          embed_allowed: boolean | null
          id: string
          is_alsamos_channel: boolean | null
          is_live: boolean | null
          logo_url: string | null
          name: string
          rtmp_url: string | null
          share_enabled: boolean | null
          stream_key: string | null
          stream_type: string | null
          stream_url: string | null
          viewer_count: number | null
          youtube_channel_id: string | null
          youtube_video_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          current_program?: string | null
          description?: string | null
          embed_allowed?: boolean | null
          id?: string
          is_alsamos_channel?: boolean | null
          is_live?: boolean | null
          logo_url?: string | null
          name: string
          rtmp_url?: string | null
          share_enabled?: boolean | null
          stream_key?: string | null
          stream_type?: string | null
          stream_url?: string | null
          viewer_count?: number | null
          youtube_channel_id?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          current_program?: string | null
          description?: string | null
          embed_allowed?: boolean | null
          id?: string
          is_alsamos_channel?: boolean | null
          is_live?: boolean | null
          logo_url?: string | null
          name?: string
          rtmp_url?: string | null
          share_enabled?: boolean | null
          stream_key?: string | null
          stream_type?: string | null
          stream_url?: string | null
          viewer_count?: number | null
          youtube_channel_id?: string | null
          youtube_video_id?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          short_video_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          short_video_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          short_video_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_short_video_id_fkey"
            columns: ["short_video_id"]
            isOneToOne: false
            referencedRelation: "short_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          ai_score: number | null
          backdrop_url: string | null
          cast_members: string[] | null
          created_at: string
          creator_id: string | null
          description: string | null
          director: string | null
          duration_seconds: number | null
          episodes: number | null
          genres: string[] | null
          id: string
          is_original: boolean | null
          is_trending: boolean | null
          rating: string | null
          release_year: number | null
          seasons: number | null
          thumbnail_url: string | null
          title: string
          trailer_url: string | null
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string
          video_url: string | null
          view_count: number | null
        }
        Insert: {
          ai_score?: number | null
          backdrop_url?: string | null
          cast_members?: string[] | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          director?: string | null
          duration_seconds?: number | null
          episodes?: number | null
          genres?: string[] | null
          id?: string
          is_original?: boolean | null
          is_trending?: boolean | null
          rating?: string | null
          release_year?: number | null
          seasons?: number | null
          thumbnail_url?: string | null
          title: string
          trailer_url?: string | null
          type: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          video_url?: string | null
          view_count?: number | null
        }
        Update: {
          ai_score?: number | null
          backdrop_url?: string | null
          cast_members?: string[] | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          director?: string | null
          duration_seconds?: number | null
          episodes?: number | null
          genres?: string[] | null
          id?: string
          is_original?: boolean | null
          is_trending?: boolean | null
          rating?: string | null
          release_year?: number | null
          seasons?: number | null
          thumbnail_url?: string | null
          title?: string
          trailer_url?: string | null
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          video_url?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      creator_profiles: {
        Row: {
          channel_banner_url: string | null
          channel_description: string | null
          channel_name: string | null
          created_at: string
          id: string
          is_verified: boolean | null
          monetization_enabled: boolean | null
          subscriber_count: number | null
          total_earnings: number | null
          total_views: number | null
          user_id: string
        }
        Insert: {
          channel_banner_url?: string | null
          channel_description?: string | null
          channel_name?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean | null
          monetization_enabled?: boolean | null
          subscriber_count?: number | null
          total_earnings?: number | null
          total_views?: number | null
          user_id: string
        }
        Update: {
          channel_banner_url?: string | null
          channel_description?: string | null
          channel_name?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean | null
          monetization_enabled?: boolean | null
          subscriber_count?: number | null
          total_earnings?: number | null
          total_views?: number | null
          user_id?: string
        }
        Relationships: []
      }
      downloads: {
        Row: {
          content_id: string
          created_at: string
          expires_at: string | null
          id: string
          progress_percent: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          progress_percent?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          progress_percent?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "downloads_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      followers: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          short_video_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          short_video_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          short_video_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_short_video_id_fkey"
            columns: ["short_video_id"]
            isOneToOne: false
            referencedRelation: "short_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          autoplay_enabled: boolean | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          is_kids_profile: boolean | null
          language: string | null
          parental_controls_enabled: boolean | null
          parental_rating_limit: string | null
          pin_code: string | null
          subtitle_language: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          autoplay_enabled?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_kids_profile?: boolean | null
          language?: string | null
          parental_controls_enabled?: boolean | null
          parental_rating_limit?: string | null
          pin_code?: string | null
          subtitle_language?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          autoplay_enabled?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_kids_profile?: boolean | null
          language?: string | null
          parental_controls_enabled?: boolean | null
          parental_rating_limit?: string | null
          pin_code?: string | null
          subtitle_language?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      short_videos: {
        Row: {
          comment_count: number | null
          created_at: string
          creator_id: string
          description: string | null
          duration_seconds: number | null
          id: string
          is_published: boolean | null
          like_count: number | null
          thumbnail_url: string | null
          title: string | null
          video_url: string
          view_count: number | null
        }
        Insert: {
          comment_count?: number | null
          created_at?: string
          creator_id: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_published?: boolean | null
          like_count?: number | null
          thumbnail_url?: string | null
          title?: string | null
          video_url: string
          view_count?: number | null
        }
        Update: {
          comment_count?: number | null
          created_at?: string
          creator_id?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_published?: boolean | null
          like_count?: number | null
          thumbnail_url?: string | null
          title?: string | null
          video_url?: string
          view_count?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      viewing_history: {
        Row: {
          completed: boolean | null
          content_id: string
          id: string
          progress_seconds: number | null
          user_id: string
          watched_at: string
        }
        Insert: {
          completed?: boolean | null
          content_id: string
          id?: string
          progress_seconds?: number | null
          user_id: string
          watched_at?: string
        }
        Update: {
          completed?: boolean | null
          content_id?: string
          id?: string
          progress_seconds?: number | null
          user_id?: string
          watched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "viewing_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist: {
        Row: {
          added_at: string
          content_id: string
          id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          content_id: string
          id?: string
          user_id: string
        }
        Update: {
          added_at?: string
          content_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      channels_public: {
        Row: {
          category: string | null
          created_at: string | null
          current_program: string | null
          description: string | null
          embed_allowed: boolean | null
          id: string | null
          is_alsamos_channel: boolean | null
          is_live: boolean | null
          logo_url: string | null
          name: string | null
          share_enabled: boolean | null
          stream_type: string | null
          stream_url: string | null
          viewer_count: number | null
          youtube_channel_id: string | null
          youtube_video_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          current_program?: string | null
          description?: string | null
          embed_allowed?: boolean | null
          id?: string | null
          is_alsamos_channel?: boolean | null
          is_live?: boolean | null
          logo_url?: string | null
          name?: string | null
          share_enabled?: boolean | null
          stream_type?: string | null
          stream_url?: string | null
          viewer_count?: number | null
          youtube_channel_id?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          current_program?: string | null
          description?: string | null
          embed_allowed?: boolean | null
          id?: string | null
          is_alsamos_channel?: boolean | null
          is_live?: boolean | null
          logo_url?: string | null
          name?: string | null
          share_enabled?: boolean | null
          stream_type?: string | null
          stream_url?: string | null
          viewer_count?: number | null
          youtube_channel_id?: string | null
          youtube_video_id?: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          is_kids_profile: boolean | null
          language: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          is_kids_profile?: boolean | null
          language?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          is_kids_profile?: boolean | null
          language?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_stream_key: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_view_count: { Args: { content_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "creator"
      content_type: "movie" | "series" | "short" | "live" | "documentary"
      subscription_tier:
        | "free"
        | "plus"
        | "pro"
        | "vip"
        | "family"
        | "creator_pro"
        | "studio_max"
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
      app_role: ["admin", "moderator", "user", "creator"],
      content_type: ["movie", "series", "short", "live", "documentary"],
      subscription_tier: [
        "free",
        "plus",
        "pro",
        "vip",
        "family",
        "creator_pro",
        "studio_max",
      ],
    },
  },
} as const
