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
  appended_content?: string;
  appended_total: number;
  note?: string;
  tenant_id?: string;
  items?: OrderItemInput[];
  appended_items?: OrderItemInput[];
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

export interface OrderItemOption {
  group?: string;
  choice?: string;
  name?: string;
  price?: number;
}

export interface OrderItemInput {
  itemId?: string;
  item_id?: string;
  name: string;
  category?: string;
  category_name?: string;
  quantity: number;
  price: number;
  unit_price?: number;
  subtotal?: number;
  options?: OrderItemOption[];
  selected_options?: OrderItemOption[] | string;
  note?: string;
  notes?: string;
}

export interface OrderItemRecord {
  id?: number;
  tenant_id: string;
  order_key: string;
  round_number: number;
  item_id?: string | null;
  item_name: string;
  category_name?: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  selected_options?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface ItemAnalyticsRow {
  itemName: string;
  categoryName: string;
  totalQuantity: number;
  totalSales: number;
  orderAppearances: number;
  optionsBreakdown?: { [optionName: string]: number };
}

export interface ItemAnalyticsSummary {
  tenantId: string;
  range: string;
  startDate: string;
  endDate: string;
  totalItemsSold: number;
  totalRevenue: number;
  totalOrders: number;
  topItem: ItemAnalyticsRow | null;
  items: ItemAnalyticsRow[];
}

export interface StoreConfig {
  operatingHours?: string | null;
  liffId?: string | null;
  [key: string]: any;
}
