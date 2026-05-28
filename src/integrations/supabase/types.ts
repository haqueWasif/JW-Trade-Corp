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
      account_shares: {
        Row: {
          account_id: string
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          share_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          share_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          share_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coach_conversations: {
        Row: {
          created_at: string
          id: string
          kind: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coach_messages: {
        Row: {
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "coach_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checklists: {
        Row: {
          account_id: string | null
          accumulation_identified: boolean | null
          asia_range_marked: boolean | null
          confidence_level: number | null
          created_at: string
          daily_bias: string | null
          date: string
          distribution_confirmed: boolean | null
          emotional_state: string | null
          entry_model_valid: boolean | null
          htf_bias: string | null
          id: string
          instrument: string | null
          liquidity_marked: boolean | null
          london_manipulation_checked: boolean | null
          manipulation_identified: boolean | null
          max_trades_not_exceeded: boolean | null
          news_checked: boolean | null
          plan_notes: string | null
          po3_model_present: boolean | null
          red_news_avoided: boolean | null
          risk_calculated: boolean | null
          session: string
          sleep_quality: string | null
          strategy_model: string | null
          trade_allowed: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          accumulation_identified?: boolean | null
          asia_range_marked?: boolean | null
          confidence_level?: number | null
          created_at?: string
          daily_bias?: string | null
          date?: string
          distribution_confirmed?: boolean | null
          emotional_state?: string | null
          entry_model_valid?: boolean | null
          htf_bias?: string | null
          id?: string
          instrument?: string | null
          liquidity_marked?: boolean | null
          london_manipulation_checked?: boolean | null
          manipulation_identified?: boolean | null
          max_trades_not_exceeded?: boolean | null
          news_checked?: boolean | null
          plan_notes?: string | null
          po3_model_present?: boolean | null
          red_news_avoided?: boolean | null
          risk_calculated?: boolean | null
          session?: string
          sleep_quality?: string | null
          strategy_model?: string | null
          trade_allowed?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          accumulation_identified?: boolean | null
          asia_range_marked?: boolean | null
          confidence_level?: number | null
          created_at?: string
          daily_bias?: string | null
          date?: string
          distribution_confirmed?: boolean | null
          emotional_state?: string | null
          entry_model_valid?: boolean | null
          htf_bias?: string | null
          id?: string
          instrument?: string | null
          liquidity_marked?: boolean | null
          london_manipulation_checked?: boolean | null
          manipulation_identified?: boolean | null
          max_trades_not_exceeded?: boolean | null
          news_checked?: boolean | null
          plan_notes?: string | null
          po3_model_present?: boolean | null
          red_news_avoided?: boolean | null
          risk_calculated?: boolean | null
          session?: string
          sleep_quality?: string | null
          strategy_model?: string | null
          trade_allowed?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_checklists_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reviews: {
        Row: {
          best_decision: string | null
          biggest_mistake: string | null
          created_at: string
          date: string
          discipline_score: number | null
          followed_plan: boolean | null
          followed_po3: boolean | null
          id: string
          lesson_tomorrow: string | null
          ny_only: boolean | null
          respected_max_trades: boolean | null
          respected_risk: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          best_decision?: string | null
          biggest_mistake?: string | null
          created_at?: string
          date?: string
          discipline_score?: number | null
          followed_plan?: boolean | null
          followed_po3?: boolean | null
          id?: string
          lesson_tomorrow?: string | null
          ny_only?: boolean | null
          respected_max_trades?: boolean | null
          respected_risk?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          best_decision?: string | null
          biggest_mistake?: string | null
          created_at?: string
          date?: string
          discipline_score?: number | null
          followed_plan?: boolean | null
          followed_po3?: boolean | null
          id?: string
          lesson_tomorrow?: string | null
          ny_only?: boolean | null
          respected_max_trades?: boolean | null
          respected_risk?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_account_id: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          active_account_id?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          active_account_id?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      prop_firm_rules: {
        Row: {
          account_id: string
          consistency_rule_pct: number | null
          created_at: string
          daily_loss_pct: number
          id: string
          inactivity_days: number
          max_loss_pct: number
          min_trading_days: number
          news_trading_allowed: boolean | null
          notes: string | null
          phase1_max_days: number | null
          phase1_target_pct: number
          phase2_max_days: number | null
          phase2_target_pct: number
          profit_split_pct: number | null
          updated_at: string
          user_id: string
          weekend_holding_allowed: boolean | null
        }
        Insert: {
          account_id: string
          consistency_rule_pct?: number | null
          created_at?: string
          daily_loss_pct?: number
          id?: string
          inactivity_days?: number
          max_loss_pct?: number
          min_trading_days?: number
          news_trading_allowed?: boolean | null
          notes?: string | null
          phase1_max_days?: number | null
          phase1_target_pct?: number
          phase2_max_days?: number | null
          phase2_target_pct?: number
          profit_split_pct?: number | null
          updated_at?: string
          user_id: string
          weekend_holding_allowed?: boolean | null
        }
        Update: {
          account_id?: string
          consistency_rule_pct?: number | null
          created_at?: string
          daily_loss_pct?: number
          id?: string
          inactivity_days?: number
          max_loss_pct?: number
          min_trading_days?: number
          news_trading_allowed?: boolean | null
          notes?: string | null
          phase1_max_days?: number | null
          phase1_target_pct?: number
          phase2_max_days?: number | null
          phase2_target_pct?: number
          profit_split_pct?: number | null
          updated_at?: string
          user_id?: string
          weekend_holding_allowed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "prop_firm_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          account_id: string | null
          created_at: string
          date: string
          direction: string
          emotion_after: string | null
          emotion_before: string | null
          emotion_during: string | null
          entry_price: number | null
          entry_reason: string | null
          exit_price: number | null
          followed_plan: boolean | null
          grade: string | null
          htf_bias: string | null
          id: string
          instrument: string
          lesson: string | null
          mistakes: string | null
          outcome: string | null
          planned_rr: number | null
          pnl: number | null
          po3_phase: string | null
          position_size: number | null
          r_multiple: number | null
          reward_amount: number | null
          risk_amount: number | null
          risk_pct: number | null
          rule_broken: boolean | null
          screenshot_after: string | null
          screenshot_before: string | null
          session: string | null
          setup_type: string | null
          stop_loss: number | null
          take_profit: number | null
          time: string | null
          updated_at: string
          user_id: string
          which_rule: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          date?: string
          direction: string
          emotion_after?: string | null
          emotion_before?: string | null
          emotion_during?: string | null
          entry_price?: number | null
          entry_reason?: string | null
          exit_price?: number | null
          followed_plan?: boolean | null
          grade?: string | null
          htf_bias?: string | null
          id?: string
          instrument: string
          lesson?: string | null
          mistakes?: string | null
          outcome?: string | null
          planned_rr?: number | null
          pnl?: number | null
          po3_phase?: string | null
          position_size?: number | null
          r_multiple?: number | null
          reward_amount?: number | null
          risk_amount?: number | null
          risk_pct?: number | null
          rule_broken?: boolean | null
          screenshot_after?: string | null
          screenshot_before?: string | null
          session?: string | null
          setup_type?: string | null
          stop_loss?: number | null
          take_profit?: number | null
          time?: string | null
          updated_at?: string
          user_id: string
          which_rule?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string
          date?: string
          direction?: string
          emotion_after?: string | null
          emotion_before?: string | null
          emotion_during?: string | null
          entry_price?: number | null
          entry_reason?: string | null
          exit_price?: number | null
          followed_plan?: boolean | null
          grade?: string | null
          htf_bias?: string | null
          id?: string
          instrument?: string
          lesson?: string | null
          mistakes?: string | null
          outcome?: string | null
          planned_rr?: number | null
          pnl?: number | null
          po3_phase?: string | null
          position_size?: number | null
          r_multiple?: number | null
          reward_amount?: number | null
          risk_amount?: number | null
          risk_pct?: number | null
          rule_broken?: boolean | null
          screenshot_after?: string | null
          screenshot_before?: string | null
          session?: string | null
          setup_type?: string | null
          stop_loss?: number | null
          take_profit?: number | null
          time?: string | null
          updated_at?: string
          user_id?: string
          which_rule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_accounts: {
        Row: {
          account_size: number
          challenge_type: string
          created_at: string
          current_balance: number
          current_equity: number
          id: string
          is_active: boolean
          name: string
          phase: string
          prop_firm: string
          starting_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_size?: number
          challenge_type?: string
          created_at?: string
          current_balance?: number
          current_equity?: number
          id?: string
          is_active?: boolean
          name?: string
          phase?: string
          prop_firm?: string
          starting_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_size?: number
          challenge_type?: string
          created_at?: string
          current_balance?: number
          current_equity?: number
          id?: string
          is_active?: boolean
          name?: string
          phase?: string
          prop_firm?: string
          starting_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          default_pairs: string[]
          id: string
          max_trades_per_day: number
          min_rr: number
          personal_daily_stop_pct: number
          preferred_session: string
          risk_per_trade_pct: number
          stop_after_losses: number
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_pairs?: string[]
          id?: string
          max_trades_per_day?: number
          min_rr?: number
          personal_daily_stop_pct?: number
          preferred_session?: string
          risk_per_trade_pct?: number
          stop_after_losses?: number
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_pairs?: string[]
          id?: string
          max_trades_per_day?: number
          min_rr?: number
          personal_daily_stop_pct?: number
          preferred_session?: string
          risk_per_trade_pct?: number
          stop_after_losses?: number
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_share_by_token: {
        Args: { _token: string }
        Returns: {
          account_id: string
          is_active: boolean
          user_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
