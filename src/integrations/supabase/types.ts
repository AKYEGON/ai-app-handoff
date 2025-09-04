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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          address: string | null
          created_at: string | null
          created_date: string | null
          credit_limit: number | null
          email: string | null
          id: string
          last_purchase_date: string | null
          name: string
          outstanding_debt: number | null
          phone: string
          risk_rating: string | null
          total_purchases: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          created_date?: string | null
          credit_limit?: number | null
          email?: string | null
          id?: string
          last_purchase_date?: string | null
          name: string
          outstanding_debt?: number | null
          phone: string
          risk_rating?: string | null
          total_purchases?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          created_date?: string | null
          credit_limit?: number | null
          email?: string | null
          id?: string
          last_purchase_date?: string | null
          name?: string
          outstanding_debt?: number | null
          phone?: string
          risk_rating?: string | null
          total_purchases?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daraja_credentials: {
        Row: {
          business_short_code: string | null
          consumer_key: string | null
          consumer_secret: string | null
          created_at: string | null
          id: string
          is_sandbox: boolean | null
          passkey: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          business_short_code?: string | null
          consumer_key?: string | null
          consumer_secret?: string | null
          created_at?: string | null
          id?: string
          is_sandbox?: boolean | null
          passkey?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          business_short_code?: string | null
          consumer_key?: string | null
          consumer_secret?: string | null
          created_at?: string | null
          id?: string
          is_sandbox?: boolean | null
          passkey?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      debt_payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          customer_name: string
          id: string
          payment_method: string
          reference: string | null
          synced: boolean
          timestamp: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          customer_name: string
          id?: string
          payment_method?: string
          reference?: string | null
          synced?: boolean
          timestamp?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          customer_name?: string
          id?: string
          payment_method?: string
          reference?: string | null
          synced?: boolean
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      duka_products: {
        Row: {
          category: string
          id: number
          image_url: string | null
          name: string
        }
        Insert: {
          category: string
          id?: number
          image_url?: string | null
          name: string
        }
        Update: {
          category?: string
          id?: number
          image_url?: string | null
          name?: string
        }
        Relationships: []
      }
      duka_products_templates: {
        Row: {
          category: string | null
          id: number
          image_url: string | null
          name: string
        }
        Insert: {
          category?: string | null
          id?: never
          image_url?: string | null
          name: string
        }
        Update: {
          category?: string | null
          id?: never
          image_url?: string | null
          name?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          cost_price: number
          created_at: string | null
          current_stock: number
          id: string
          image_url: string | null
          is_parent: boolean | null
          low_stock_threshold: number | null
          name: string
          parent_id: string | null
          selling_price: number
          stock_derivation_quantity: number | null
          updated_at: string | null
          user_id: string
          variant_multiplier: number | null
          variant_name: string | null
        }
        Insert: {
          category: string
          cost_price: number
          created_at?: string | null
          current_stock?: number
          id?: string
          image_url?: string | null
          is_parent?: boolean | null
          low_stock_threshold?: number | null
          name: string
          parent_id?: string | null
          selling_price: number
          stock_derivation_quantity?: number | null
          updated_at?: string | null
          user_id: string
          variant_multiplier?: number | null
          variant_name?: string | null
        }
        Update: {
          category?: string
          cost_price?: number
          created_at?: string | null
          current_stock?: number
          id?: string
          image_url?: string | null
          is_parent?: boolean | null
          low_stock_threshold?: number | null
          name?: string
          parent_id?: string | null
          selling_price?: number
          stock_derivation_quantity?: number | null
          updated_at?: string | null
          user_id?: string
          variant_multiplier?: number | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_type: string | null
          created_at: string | null
          email: string | null
          id: string
          location: string | null
          phone: string | null
          shop_name: string | null
          sms_notifications_enabled: boolean | null
          sms_phone_number: string | null
          subscription_end_date: string | null
          subscription_plan: string | null
          subscription_status: string | null
          trial_customers_used: number | null
          trial_end_date: string | null
          trial_products_used: number | null
          trial_sales_used: number | null
          trial_start_date: string | null
          updated_at: string | null
        }
        Insert: {
          business_type?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          location?: string | null
          phone?: string | null
          shop_name?: string | null
          sms_notifications_enabled?: boolean | null
          sms_phone_number?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_customers_used?: number | null
          trial_end_date?: string | null
          trial_products_used?: number | null
          trial_sales_used?: number | null
          trial_start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          business_type?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          shop_name?: string | null
          sms_notifications_enabled?: boolean | null
          sms_phone_number?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_customers_used?: number | null
          trial_end_date?: string | null
          trial_products_used?: number | null
          trial_sales_used?: number | null
          trial_start_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sales: {
        Row: {
          client_sale_id: string | null
          cost_price: number
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          id: string
          offline_id: string | null
          payment_details: Json | null
          payment_method: string
          product_id: string
          product_name: string
          profit: number
          quantity: number
          selling_price: number
          synced: boolean | null
          timestamp: string | null
          total_amount: number
          user_id: string
        }
        Insert: {
          client_sale_id?: string | null
          cost_price: number
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          offline_id?: string | null
          payment_details?: Json | null
          payment_method: string
          product_id: string
          product_name: string
          profit: number
          quantity: number
          selling_price: number
          synced?: boolean | null
          timestamp?: string | null
          total_amount: number
          user_id: string
        }
        Update: {
          client_sale_id?: string | null
          cost_price?: number
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          offline_id?: string | null
          payment_details?: Json | null
          payment_method?: string
          product_id?: string
          product_name?: string
          profit?: number
          quantity?: number
          selling_price?: number
          synced?: boolean | null
          timestamp?: string | null
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_settings: {
        Row: {
          created_at: string | null
          id: string
          settings_key: string
          settings_value: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          settings_key: string
          settings_value?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          settings_key?: string
          settings_value?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          features: Json
          id: string
          is_active: boolean | null
          name: string
          price: number
        }
        Insert: {
          created_at?: string | null
          features: Json
          id: string
          is_active?: boolean | null
          name: string
          price: number
        }
        Update: {
          created_at?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      sync_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          data: Json
          id: string
          max_attempts: number | null
          next_retry_at: string | null
          operation_type: string
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          data: Json
          id?: string
          max_attempts?: number | null
          next_retry_at?: string | null
          operation_type: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          data?: Json
          id?: string
          max_attempts?: number | null
          next_retry_at?: string | null
          operation_type?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          created_at: string | null
          customer_id: string
          date: string | null
          id: string
          item_id: string | null
          notes: string | null
          paid: boolean | null
          paid_date: string | null
          quantity: number
          total_amount: number
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          date?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          paid?: boolean | null
          paid_date?: string | null
          quantity: number
          total_amount: number
          unit_price: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          date?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          paid?: boolean | null
          paid_date?: string | null
          quantity?: number
          total_amount?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      record_debt_payment_with_balance_update: {
        Args: {
          p_amount: number
          p_customer_id: string
          p_customer_name: string
          p_last_purchase_date: string
          p_new_outstanding_debt: number
          p_payment_method: string
          p_reference: string
          p_timestamp: string
          p_user_id: string
        }
        Returns: undefined
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
