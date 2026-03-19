export type PlanId = string;

export interface Plan {
  id: PlanId;
  name: string;
  price: number; // 税込
  description: string;
}

export interface Item {
  id: number;
  name: string;
  description: string;
  displayOrder?: number;
  basePrice: number; // デフォルト値（通常0、ユーザーが金額を入力）
  allowedPlans: PlanId[];
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

  // Date Modes
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

export interface SelectedState {
  planId: PlanId;
  optionValues: Map<number, number>; // Item ID -> 金額
}
