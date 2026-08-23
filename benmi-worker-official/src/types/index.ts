export type DiningOption = 'takeaway' | 'dine_in';

export type OrderStatus =
  | 'NEW'
  | 'ACCEPTED'
  | 'DONE'
  | 'PICKED_UP'
  | 'PAID'
  | 'WAITING_CUSTOMER_CHANGE'
  | 'WAITING_CUSTOMER_REJECT'
  | 'REJECTED'
  | 'EXPIRED'
  | 'FORCE_REJECT';

export interface Order {
  key: string;
  customer: string;
  time: string; // "YYYY-MM-DD HH:mm"
  content: string;
  status: OrderStatus;
  createdAt: number;
  userId?: string;
  total: number;
  reason?: string;
  note?: string;
  diningOption?: DiningOption;
  tableNumber?: string | null;
  roundCount?: number;
  round_count?: number;
  lastAppendedAt?: string | null;
  last_appended_at?: string | null;
}

export interface AppendOrderPayload {
  parent_order_key: string;
  user_id?: string;
  customer_name?: string;
  appended_content: string;
  appended_total: number;
  note?: string;
  tenant_id?: string;
}

export interface Menu {
  small?: { [itemName: string]: number };
  large?: { [itemName: string]: number };
  combo?: { [itemName: string]: number };
  drinks?: { [itemName: string]: number };
  topping?: { [itemName: string]: number };
  out_of_stock?: string[];
  [category: string]: any;
}

export interface StoreConfig {
  operatingHours?: string | null;
  liffId?: string | null;
  [key: string]: any;
}
