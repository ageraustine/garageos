// Expense types

export interface ExpenseResponse {
  id: number;
  chain_id: number;
  branch_id: number | null;
  branch_name: string | null;
  category: string;
  category_label: string;
  amount: string;
  description: string;
  vendor: string | null;
  expense_date: string;
  receipt_url: string | null;
  job_id: number | null;
  is_recurring: boolean;
  notes: string | null;
  created_by_id: number;
  created_by_name: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ExpenseCreate {
  category: string;
  amount: number;
  description: string;
  vendor?: string;
  expense_date: string;
  branch_id?: number;
  job_id?: number;
  is_recurring?: boolean;
  notes?: string;
}

export interface ExpenseUpdate {
  category?: string;
  amount?: number;
  description?: string;
  vendor?: string;
  expense_date?: string;
  branch_id?: number;
  job_id?: number;
  is_recurring?: boolean;
  notes?: string;
}

export interface ExpenseListParams {
  branch_id?: number;
  category?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}
