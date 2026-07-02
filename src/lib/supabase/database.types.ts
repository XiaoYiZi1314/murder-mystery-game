export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      admin_accounts: {
        Row: {
          id: string;
          account: string;
          password_hash: string;
          display_name: string;
          phone: string | null;
          role: "boss" | "mgr" | "dm";
          is_active: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      admin_operation_logs: {
        Row: {
          id: string;
          operator_id: string;
          action: string;
          target_type: string;
          target_id: string | null;
          before_json: Json | null;
          after_json: Json | null;
          remark: string | null;
          created_at: string;
        };
      };
      consumption_records: {
        Row: {
          id: string;
          member_id: string;
          original_amount_cents: number;
          discount_rate: number;
          paid_amount_cents: number;
          earned_points: number;
          before_balance_cents: number;
          after_balance_cents: number;
          operator_id: string;
          script_id: string | null;
          remark: string | null;
          created_at: string;
        };
      };
      makeup_gallery_items: {
        Row: {
          id: string;
          title: string;
          image_url: string;
          thumbnail_url: string | null;
          description: string | null;
          style_tags: string[];
          related_script_id: string | null;
          service_duration_minutes: number | null;
          price_cents: number | null;
          includes: string | null;
          visible: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
      };
      member_levels: {
        Row: {
          id: string;
          name: string;
          min_recharge_cents: number;
          discount_rate: number;
          sort_order: number;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      member_profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string;
          avatar_url: string | null;
          birthday: string | null;
          title: string;
          remark: string;
          balance_cents: number;
          total_recharge_cents: number;
          total_gift_cents: number;
          total_spend_cents: number;
          points: number;
          level_id: string | null;
          last_consumed_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      point_transactions: {
        Row: {
          id: string;
          member_id: string;
          type: "earn" | "redeem" | "adjust";
          points: number;
          before_points: number;
          after_points: number;
          source_type: string | null;
          source_id: string | null;
          operator_id: string | null;
          remark: string | null;
          created_at: string;
        };
      };
      recharge_records: {
        Row: {
          id: string;
          member_id: string;
          amount_cents: number;
          gift_cents: number;
          before_balance_cents: number;
          after_balance_cents: number;
          operator_id: string;
          remark: string | null;
          created_at: string;
        };
      };
      recharge_rules: {
        Row: {
          id: string;
          threshold_cents: number;
          gift_cents: number;
          sort_order: number;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      recommendations: {
        Row: {
          id: string;
          script_id: string;
          position: number;
          title_override: string | null;
          summary_override: string | null;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      script_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          sort_order: number;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      script_category_relations: {
        Row: {
          script_id: string;
          category_id: string;
          created_at: string;
        };
      };
      scripts: {
        Row: {
          id: string;
          title: string;
          slug: string;
          cover_url: string | null;
          summary: string | null;
          description: string | null;
          player_min: number;
          player_max: number;
          duration_minutes: number;
          difficulty: "入门" | "进阶" | "硬核";
          needs_makeup: boolean;
          price_cents: number | null;
          status: "draft" | "published" | "archived";
          sort_order: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      store_settings: {
        Row: {
          id: string;
          store_name: string;
          wechat_account: string | null;
          wechat_qr_url: string | null;
          phone: string | null;
          address: string | null;
          business_hours: string | null;
          description: string | null;
          social_links: Json;
          created_at: string;
          updated_at: string;
        };
      };
    };
    Functions: {
      admin_adjust_member: {
        Args: {
          p_session_token: string;
          p_member_id: string;
          p_field: string;
          p_delta?: number;
          p_new_level_name?: string | null;
          p_note?: string | null;
        };
        Returns: Json;
      };
      admin_consume_member: {
        Args: {
          p_session_token: string;
          p_member_id: string;
          p_item: string;
          p_amount: number;
          p_note?: string | null;
        };
        Returns: Json;
      };
      admin_create_member: {
        Args: {
          p_session_token: string;
          p_name: string;
          p_phone: string;
          p_initial_recharge?: number;
          p_note?: string | null;
        };
        Returns: Json;
      };
      admin_delete_staff_account: {
        Args: {
          p_session_token: string;
          p_admin_id: string;
        };
        Returns: Json;
      };
      admin_recharge_member: {
        Args: {
          p_session_token: string;
          p_member_id: string;
          p_amount: number;
          p_note?: string | null;
        };
        Returns: Json;
      };
      admin_save_recommendations: {
        Args: {
          p_session_token: string;
          p_items: Json;
        };
        Returns: Json;
      };
      admin_save_settings: {
        Args: {
          p_session_token: string;
          p_store: Json;
          p_recharge_rules: Json;
          p_level_rules: Json;
        };
        Returns: Json;
      };
      admin_set_script_status: {
        Args: {
          p_session_token: string;
          p_script_id: string;
          p_status: "draft" | "published" | "archived";
        };
        Returns: Json;
      };
      admin_upsert_makeup: {
        Args: {
          p_session_token: string;
          p_makeup_id?: string | null;
          p_title: string;
          p_style: string;
          p_service_duration_minutes?: number | null;
          p_related_script_id?: string | null;
          p_price?: number | null;
          p_visible: boolean;
          p_cover?: string | null;
          p_description?: string | null;
        };
        Returns: Json;
      };
      admin_upsert_script: {
        Args: {
          p_session_token: string;
          p_script_id?: string | null;
          p_title: string;
          p_cover_url?: string | null;
          p_player_min: number;
          p_player_max: number;
          p_duration_minutes: number;
          p_difficulty: "入门" | "进阶" | "硬核";
          p_needs_makeup: boolean;
          p_summary?: string | null;
          p_status: "draft" | "published" | "archived";
          p_tags: string[];
        };
        Returns: Json;
      };
      admin_upsert_staff_account: {
        Args: {
          p_session_token: string;
          p_admin_id?: string | null;
          p_name: string;
          p_phone: string;
          p_account: string;
          p_role: "boss" | "mgr" | "dm";
          p_active: boolean;
          p_password?: string | null;
        };
        Returns: Json;
      };
      get_admin_bootstrap: {
        Args: {
          p_session_token: string;
        };
        Returns: Json;
      };
      get_member_dashboard: {
        Args: {
          p_session_token: string;
        };
        Returns: Json;
      };
      login_admin: {
        Args: {
          p_account: string;
          p_password: string;
          p_role?: "boss" | "mgr" | "dm" | null;
        };
        Returns: Json;
      };
      login_member: {
        Args: {
          p_phone: string;
          p_password: string;
          p_remember?: boolean;
        };
        Returns: Json;
      };
      logout_admin: {
        Args: {
          p_session_token: string;
        };
        Returns: null;
      };
      logout_member: {
        Args: {
          p_session_token: string;
        };
        Returns: null;
      };
      register_member: {
        Args: {
          p_phone: string;
          p_password: string;
          p_confirm_password: string;
          p_remember?: boolean;
        };
        Returns: Json;
      };
      update_member_profile_settings: {
        Args: {
          p_session_token: string;
          p_display_name: string;
          p_birthday?: string | null;
          p_title?: string | null;
          p_remark?: string | null;
        };
        Returns: Json;
      };
    };
  };
};
