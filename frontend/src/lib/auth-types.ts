// Auth type definitions
// Interface Segregation: focused auth-related types

export interface User {
  id: number;
  name: string;
  phone: string;
  role: "advisor" | "mechanic" | "manager" | "hq";
  chain_id: number | null;
  chain_name: string | null;
  chain_display_name: string | null;
  chain_currency: string;
  branch_id: number | null;
  is_external_seller: boolean;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface RegisterFormData {
  chainName: string;
  displayName: string;
  ownerName: string;
  phone: string;
  pin: string;
  confirmPin: string;
}

export interface LoginFormData {
  phone: string;
  pin: string;
}
