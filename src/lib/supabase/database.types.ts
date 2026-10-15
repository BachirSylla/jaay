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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          position: number
          shop_id: string
        }
        Insert: {
          id?: string
          name: string
          position?: number
          shop_id: string
        }
        Update: {
          id?: string
          name?: string
          position?: number
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          shop_id: string
          type: Database["public"]["Enums"]["customer_type"]
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          shop_id: string
          type?: Database["public"]["Enums"]["customer_type"]
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          shop_id?: string
          type?: Database["public"]["Enums"]["customer_type"]
        }
        Relationships: [
          {
            foreignKeyName: "customers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          reception_id: string | null
          shop_id: string
          spent_at: string
          status: Database["public"]["Enums"]["op_status"]
          supplier_id: string | null
        }
        Insert: {
          amount: number
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          reception_id?: string | null
          shop_id: string
          spent_at?: string
          status?: Database["public"]["Enums"]["op_status"]
          supplier_id?: string | null
        }
        Update: {
          amount?: number
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          reception_id?: string | null
          shop_id?: string
          spent_at?: string
          status?: Database["public"]["Enums"]["op_status"]
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_reception_id_shop_id_fkey"
            columns: ["reception_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "receptions"
            referencedColumns: ["id", "shop_id"]
          },
          {
            foreignKeyName: "expenses_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_shop_id_fkey"
            columns: ["supplier_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "shop_id"]
          },
        ]
      }
      lots: {
        Row: {
          created_at: string
          id: string
          product_id: string
          qty_available: number | null
          qty_received: number
          qty_returned: number
          qty_sold: number
          received_at: string
          reception_id: string
          shop_id: string
          supplier_id: string
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          qty_available?: number | null
          qty_received: number
          qty_returned?: number
          qty_sold?: number
          received_at: string
          reception_id: string
          shop_id: string
          supplier_id: string
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          qty_available?: number | null
          qty_received?: number
          qty_returned?: number
          qty_sold?: number
          received_at?: string
          reception_id?: string
          shop_id?: string
          supplier_id?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "lots_product_id_shop_id_fkey"
            columns: ["product_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "shop_id"]
          },
          {
            foreignKeyName: "lots_reception_id_shop_id_fkey"
            columns: ["reception_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "receptions"
            referencedColumns: ["id", "shop_id"]
          },
          {
            foreignKeyName: "lots_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_supplier_id_shop_id_fkey"
            columns: ["supplier_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "shop_id"]
          },
        ]
      }
      product_photos: {
        Row: {
          created_at: string
          id: string
          position: number
          product_id: string
          shop_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          product_id: string
          shop_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          product_id?: string
          shop_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_photos_product_id_shop_id_fkey"
            columns: ["product_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "shop_id"]
          },
          {
            foreignKeyName: "product_photos_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          archived_at: string | null
          category_id: string | null
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          low_stock_threshold: number
          name: string
          reseller_price: number | null
          shop_id: string
          suggested_price: number | null
        }
        Insert: {
          archived_at?: string | null
          category_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          low_stock_threshold?: number
          name: string
          reseller_price?: number | null
          shop_id: string
          suggested_price?: number | null
        }
        Update: {
          archived_at?: string | null
          category_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          low_stock_threshold?: number
          name?: string
          reseller_price?: number | null
          shop_id?: string
          suggested_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_shop_id_fkey"
            columns: ["category_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "shop_id"]
          },
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_platform_admin: boolean
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          is_platform_admin?: boolean
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_platform_admin?: boolean
          phone?: string | null
        }
        Relationships: []
      }
      receptions: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          received_at: string
          shop_id: string
          status: Database["public"]["Enums"]["op_status"]
          supplier_id: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          received_at?: string
          shop_id: string
          status?: Database["public"]["Enums"]["op_status"]
          supplier_id: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          received_at?: string
          shop_id?: string
          status?: Database["public"]["Enums"]["op_status"]
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receptions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receptions_supplier_id_shop_id_fkey"
            columns: ["supplier_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "shop_id"]
          },
        ]
      }
      sale_item_allocations: {
        Row: {
          id: string
          lot_id: string
          quantity: number
          sale_item_id: string
          shop_id: string
          supplier_id: string
          unit_cost: number
        }
        Insert: {
          id?: string
          lot_id: string
          quantity: number
          sale_item_id: string
          shop_id: string
          supplier_id: string
          unit_cost: number
        }
        Update: {
          id?: string
          lot_id?: string
          quantity?: number
          sale_item_id?: string
          shop_id?: string
          supplier_id?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_item_allocations_lot_id_shop_id_fkey"
            columns: ["lot_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id", "shop_id"]
          },
          {
            foreignKeyName: "sale_item_allocations_sale_item_id_shop_id_fkey"
            columns: ["sale_item_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id", "shop_id"]
          },
          {
            foreignKeyName: "sale_item_allocations_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_item_allocations_supplier_id_shop_id_fkey"
            columns: ["supplier_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "shop_id"]
          },
        ]
      }
      sale_items: {
        Row: {
          id: string
          line_total: number | null
          product_id: string
          quantity: number
          sale_id: string
          shop_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          line_total?: number | null
          product_id: string
          quantity: number
          sale_id: string
          shop_id: string
          unit_price: number
        }
        Update: {
          id?: string
          line_total?: number | null
          product_id?: string
          quantity?: number
          sale_id?: string
          shop_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_shop_id_fkey"
            columns: ["product_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "shop_id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_shop_id_fkey"
            columns: ["sale_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id", "shop_id"]
          },
          {
            foreignKeyName: "sale_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string
          sale_id: string
          shop_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at?: string
          sale_id: string
          shop_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string
          sale_id?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_sale_id_shop_id_fkey"
            columns: ["sale_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id", "shop_id"]
          },
          {
            foreignKeyName: "sale_payments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount_paid: number
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          channel: Database["public"]["Enums"]["sale_channel"]
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_type: Database["public"]["Enums"]["customer_type"]
          id: string
          note: string | null
          number: number
          shop_id: string
          sold_at: string
          status: Database["public"]["Enums"]["op_status"]
          total_amount: number
        }
        Insert: {
          amount_paid: number
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          channel?: Database["public"]["Enums"]["sale_channel"]
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_type?: Database["public"]["Enums"]["customer_type"]
          id?: string
          note?: string | null
          number: number
          shop_id: string
          sold_at?: string
          status?: Database["public"]["Enums"]["op_status"]
          total_amount: number
        }
        Update: {
          amount_paid?: number
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          channel?: Database["public"]["Enums"]["sale_channel"]
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_type?: Database["public"]["Enums"]["customer_type"]
          id?: string
          note?: string | null
          number?: number
          shop_id?: string
          sold_at?: string
          status?: Database["public"]["Enums"]["op_status"]
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_shop_id_fkey"
            columns: ["customer_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "shop_id"]
          },
          {
            foreignKeyName: "sales_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_members: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["shop_role"]
          shop_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: Database["public"]["Enums"]["shop_role"]
          shop_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["shop_role"]
          shop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_members_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          catalog_enabled: boolean
          created_at: string
          created_by: string | null
          currency: string
          id: string
          logo_path: string | null
          name: string
          next_sale_number: number
          show_public_prices: boolean
          slug: string
          whatsapp_phone: string | null
        }
        Insert: {
          catalog_enabled?: boolean
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          logo_path?: string | null
          name: string
          next_sale_number?: number
          show_public_prices?: boolean
          slug: string
          whatsapp_phone?: string | null
        }
        Update: {
          catalog_enabled?: boolean
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          logo_path?: string | null
          name?: string
          next_sale_number?: number
          show_public_prices?: boolean
          slug?: string
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          archived_at: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          shop_id: string
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          shop_id: string
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_reception: {
        Args: { p_reason: string; p_reception_id: string }
        Returns: undefined
      }
      cancel_sale: {
        Args: { p_reason: string; p_sale_id: string }
        Returns: undefined
      }
      create_default_categories: {
        Args: { p_shop_id: string }
        Returns: undefined
      }
      create_reception: {
        Args: {
          p_delivery_fee?: number
          p_items: Json
          p_note?: string
          p_received_at: string
          p_shop_id: string
          p_supplier_id: string
        }
        Returns: string
      }
      create_sale: {
        Args: {
          p_channel: Database["public"]["Enums"]["sale_channel"]
          p_customer_id: string
          p_customer_type: Database["public"]["Enums"]["customer_type"]
          p_items: Json
          p_note?: string
          p_payments: Json
          p_shop_id: string
          p_sold_at: string
        }
        Returns: {
          amount_paid: number
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          channel: Database["public"]["Enums"]["sale_channel"]
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_type: Database["public"]["Enums"]["customer_type"]
          id: string
          note: string | null
          number: number
          shop_id: string
          sold_at: string
          status: Database["public"]["Enums"]["op_status"]
          total_amount: number
        }
        SetofOptions: {
          from: "*"
          to: "sales"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_shop: {
        Args: { p_name: string; p_slug?: string; p_whatsapp_phone?: string }
        Returns: {
          catalog_enabled: boolean
          created_at: string
          created_by: string | null
          currency: string
          id: string
          logo_path: string | null
          name: string
          next_sale_number: number
          show_public_prices: boolean
          slug: string
          whatsapp_phone: string | null
        }
        SetofOptions: {
          from: "*"
          to: "shops"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      find_user_id_by_email: { Args: { p_email: string }; Returns: string }
      get_customer_stats: {
        Args: { p_shop_id: string }
        Returns: {
          customer_id: string
          last_purchase_at: string
          purchases: number
          total_spent: number
        }[]
      }
      get_reception_lines: {
        Args: { p_reception_id: string }
        Returns: {
          lot_id: string
          product_id: string
          qty_received: number
          qty_returned: number
          qty_sold: number
          unit_cost: number
        }[]
      }
      get_receptions: {
        Args: { p_shop_id: string }
        Returns: {
          cancel_reason: string
          created_at: string
          created_by_name: string
          delivery_fee: number
          id: string
          note: string
          received_at: string
          status: Database["public"]["Enums"]["op_status"]
          supplier_id: string
          supplier_name: string
          total_cost: number
          total_qty: number
        }[]
      }
      get_stock: {
        Args: { p_shop_id: string }
        Returns: {
          is_low: boolean
          product_id: string
          qty_available: number
        }[]
      }
      has_shop_role: {
        Args: {
          p_roles: Database["public"]["Enums"]["shop_role"][]
          p_shop_id: string
        }
        Returns: boolean
      }
      is_shop_member: { Args: { p_shop_id: string }; Returns: boolean }
      reserved_shop_slugs: { Args: never; Returns: string[] }
      shares_shop_with: { Args: { p_user_id: string }; Returns: boolean }
      slugify: { Args: { p_value: string }; Returns: string }
      storage_shop_id: { Args: { p_name: string }; Returns: string }
    }
    Enums: {
      customer_type: "individual" | "reseller"
      expense_category: "delivery" | "packaging" | "advertising" | "other"
      op_status: "active" | "cancelled"
      payment_method: "wave" | "orange_money" | "cash" | "other"
      sale_channel:
        | "whatsapp"
        | "instagram"
        | "facebook"
        | "tiktok"
        | "in_person"
        | "other"
      shop_role: "owner" | "admin" | "manager"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      customer_type: ["individual", "reseller"],
      expense_category: ["delivery", "packaging", "advertising", "other"],
      op_status: ["active", "cancelled"],
      payment_method: ["wave", "orange_money", "cash", "other"],
      sale_channel: [
        "whatsapp",
        "instagram",
        "facebook",
        "tiktok",
        "in_person",
        "other",
      ],
      shop_role: ["owner", "admin", "manager"],
    },
  },
} as const
