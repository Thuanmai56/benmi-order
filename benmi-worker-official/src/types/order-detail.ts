/** Historical sale values. Catalog changes never rewrite an accepted snapshot. */
export interface DetailChoice {
  optionId: string;
  itemId: string;
  name: string;
  quantity: number;
  surcharge: number;
  groups: DetailGroup[];
  subOptions: Array<{ id?: string; name: string; price: number }>;
}
export interface DetailGroup { groupId: string; groupName: string; items: DetailChoice[] }
export interface DetailLine {
  lineId: string;
  itemId: string;
  name: string;
  categoryId: string;
  category: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  note: string;
  portions: Array<{ portionIndex: number; note: string; groups: DetailGroup[] }>;
}
export interface DetailRound {
  roundNumber: number;
  createdAt: string;
  note: string;
  groups: DetailGroup[];
  items: DetailLine[];
  discount: number;
  total: number;
  /** Exact legacy source, never interpreted as a new choice or note. */
  legacyContent?: string;
}
export interface OrderDetailSnapshot { schemaVersion: 1; rounds: DetailRound[]; total: number }
