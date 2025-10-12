// Database types for B2B+ Platform
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string; name: string; slug: string;
          type: 'distributor' | 'restaurant' | 'hotel' | 'hospital' | 'school';
          tax_id: string | null; phone: string | null; website: string | null;
          created_at: string; updated_at: string;
        }
        Insert: Omit<Database['public']['Tables']['organizations']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string; created_at?: string; updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>
      }
      organization_members: {
        Row: {
          id: string; organization_id: string; user_id: string;
          role: 'owner' | 'admin' | 'member' | 'viewer'; created_at: string;
        }
        Insert: Omit<Database['public']['Tables']['organization_members']['Row'], 'id' | 'created_at'> & {
          id?: string; created_at?: string;
        }
        Update: Partial<Database['public']['Tables']['organization_members']['Insert']>
      }
      profiles: {
        Row: {
          id: string; email: string; full_name: string | null; phone: string | null;
          avatar_url: string | null; current_organization_id: string | null;
          expo_push_token: string | null; created_at: string; updated_at: string;
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string; updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      products: {
        Row: {
          id: string; organization_id: string; sku: string; name: string;
          description: string | null; category: string; subcategory: string | null;
          brand: string | null; base_price: number; unit_of_measure: string;
          units_per_case: number | null; weight_lbs: number | null;
          dimensions_inches: Json | null; in_stock: boolean; image_url: string | null;
          additional_images: string[] | null; specifications: Json | null;
          allergens: string[] | null; nutritional_info: Json | null;
          search_vector: unknown | null; embedding: unknown | null;
          created_at: string; updated_at: string;
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at' | 'search_vector' | 'embedding'> & {
          id?: string; created_at?: string; updated_at?: string;
          search_vector?: unknown | null; embedding?: unknown | null;
        }
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }
      shipping_addresses: {
        Row: {
          id: string; organization_id: string; label: string; contact_name: string;
          phone: string; street_address: string; street_address2: string | null;
          city: string; state: string; postal_code: string; country: string;
          delivery_instructions: string | null; is_default: boolean;
          last_used_at: string | null; created_at: string;
        }
        Insert: Omit<Database['public']['Tables']['shipping_addresses']['Row'], 'id' | 'created_at'> & {
          id?: string; created_at?: string; country?: string;
        }
        Update: Partial<Database['public']['Tables']['shipping_addresses']['Insert']>
      }
      orders: {
        Row: {
          id: string; organization_id: string; user_id: string; order_number: string;
          po_number: string | null;
          status: 'draft' | 'submitted' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
          subtotal: number; tax: number; shipping_cost: number; total: number;
          shipping_address_id: string | null; shipping_tracking_number: string | null;
          shipping_carrier: string | null; notes: string | null;
          submitted_at: string | null; shipped_at: string | null; delivered_at: string | null;
          created_at: string; updated_at: string;
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'order_number' | 'created_at' | 'updated_at'> & {
          id?: string; order_number?: string; created_at?: string; updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }
      order_items: {
        Row: {
          id: string; order_id: string; product_id: string; sku: string;
          name: string; quantity: number; unit_price: number; line_total: number;
          created_at: string;
        }
        Insert: Omit<Database['public']['Tables']['order_items']['Row'], 'id' | 'created_at'> & {
          id?: string; created_at?: string;
        }
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>
      }
      cart_items: {
        Row: {
          id: string; organization_id: string; user_id: string; product_id: string;
          quantity: number; created_at: string; updated_at: string;
        }
        Insert: Omit<Database['public']['Tables']['cart_items']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string; created_at?: string; updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['cart_items']['Insert']>
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}
