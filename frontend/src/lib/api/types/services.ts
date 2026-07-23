// Service-related types

export interface ServiceStage {
  id: number;
  name: string;
  order: number;
}

export interface QuotationItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  is_labor: boolean;
  is_active: boolean;
}

export interface QuotationItemCreate {
  name: string;
  description?: string | null;
  price: number;
  is_labor?: boolean;
}

export interface QuotationItemUpdate {
  name?: string;
  description?: string | null;
  price?: number;
  is_labor?: boolean;
  is_active?: boolean;
}

export interface Service {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  stages: ServiceStage[];
  quotation_items: QuotationItem[];
}

export interface StageCreate {
  name: string;
  order: number;
}

export interface ServiceCreate {
  name: string;
  description?: string | null;
  stages: StageCreate[];
}

export interface ServiceUpdate {
  name?: string;
  description?: string | null;
  is_active?: boolean;
  stages?: StageCreate[];
}
