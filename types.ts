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
}

export interface CustomerInfo {
  deathDate: string;
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
