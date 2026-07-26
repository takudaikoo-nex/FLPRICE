export type PlanId = string;
export type PlanCategory = 'cremation' | 'funeral';
export type ItemType = 'checkbox' | 'dropdown' | 'free_input';

export interface Plan {
  id: PlanId;
  name: string;
  price: number; // 税抜
  category: PlanCategory;
  description: string;
}

export interface DropdownOption {
  id: string;
  name: string;
  price: number; // デフォルト価格
  planPrices?: Record<string, number>; // プランごとに異なる場合
  allowedPlans: PlanId[];
}

export interface Item {
  id: number;
  name: string;
  description: string;
  displayOrder?: number;
  type: ItemType;
  basePrice?: number;
  allowedPlans: PlanId[];
  includedInPlans: PlanId[]; // このプランではプラン料金に含まれる（無料）
  options?: DropdownOption[];
  nonTaxable?: boolean;
  reducedTax?: boolean;
}

export interface CustomerInfo {
  deathDate: string;
  funeralDate?: string;
  deceasedName: string;
  birthDate: string;
  age?: string;
  address: string;
  honseki: string;
  applicantName: string;
  applicantRelation: string;
  applicantBirthDate: string;
  applicantAge?: string;
  applicantPostalCode?: string;
  applicantAddress?: string;
  applicantPhone?: string;
  chiefMournerName: string;
  chiefMournerAddress: string;
  chiefMournerPhone: string;
  chiefMournerMobile: string;
  religion: string;
  templeName: string;
  templePhone: string;
  templeFax: string;
  remarks?: string;
  deathDateMode?: 'western' | 'japanese';
  funeralDateMode?: 'western' | 'japanese';
  birthDateMode?: 'western' | 'japanese';
  applicantBirthDateMode?: 'western' | 'japanese';
}

export interface Estimate {
  id: number;
  created_at: string;
  content: any;
  customer_info: CustomerInfo;
  total_price: number;
}

// ===== 顧客管理 =====

export interface Customer {
  id: string;
  customer_no: string;
  name: string;
  kana: string;
  phone: string;
  postal_code: string;
  address: string;
  note: string;
  created_at?: string;
}

// ===== 供花発注システム =====

export interface FlowerSettings {
  id: number;
  site_base_url: string;
  order_deadline_hours: number;
  notify_emails: string[];
  tax_rate: number;
  card_payment_enabled: boolean;
  company_name: string;
  company_postal_code: string;
  company_address: string;
  company_tel: string;
  invoice_registration_number: string;
  bank_info: string;
  payment_due_days: number;
  mail_from: string;
  mail_from_name: string;
  supplier_name: string;
  supplier_email: string;
}

export interface FlowerProduct {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  price: number; // 税抜（送料・設営費込み）
  image_paths: string[];
  display_order: number;
  is_active: boolean;
}

export interface Funeral {
  id: string;
  estimate_id: number | null;
  deceased_name: string;
  chief_mourner_name: string;
  venue_name: string;
  venue_address: string;
  wake_at: string | null;
  ceremony_at: string | null;
  order_deadline: string | null;
  public_token: string;
  is_order_open: boolean;
  note: string;
  purchase_order_sent_at?: string | null;
  created_at?: string;
}

export type FlowerPaymentMethod = 'card' | 'invoice';
export type FlowerPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
export type FlowerOrderStatus = 'received' | 'confirmed' | 'cancelled';

export interface FlowerOrderItem {
  id: number;
  order_id: number;
  product_id: string | null;
  product_code: string;
  product_name: string;
  unit_price: number;
  tax_rate: number;
  quantity: number;
  nafuda_name: string;
}

export interface FlowerOrder {
  id: number;
  order_number: string;
  funeral_id: string;
  orderer_name: string;
  orderer_kana: string;
  orderer_company: string;
  orderer_phone: string;
  orderer_email: string;
  orderer_postal_code: string;
  orderer_address: string;
  relation: string;
  payment_method: FlowerPaymentMethod;
  payment_status: FlowerPaymentStatus;
  order_status: FlowerOrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  remarks: string;
  created_at: string;
  invoice_sent_at: string | null;
  notified_at: string | null;
  flower_order_items?: FlowerOrderItem[];
  funerals?: Pick<Funeral, 'id' | 'deceased_name' | 'ceremony_at' | 'venue_name' | 'venue_address'>;
}
