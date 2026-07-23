// Payment types (M-Pesa)

export interface STKPushRequest {
  phone: string;
  amount: number;
  idempotency_key: string;
}

export interface STKPushResponse {
  payment_id: number;
  checkout_request_id: string;
  customer_message: string;
  status: string;
}
