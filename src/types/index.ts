
export interface Customer {
  id: string;
  name: string;
  phone: string;
  createdDate: string;
  email?: string;
  address?: string;
  totalPurchases: number;
  outstandingDebt: number;
  creditLimit: number;
  lastPurchaseDate: string | null;
  riskRating: 'low' | 'medium' | 'high';
}

export interface Transaction {
  id: string;
  customerId: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  notes: string;
  date: string;
  paid: boolean;
  paidDate: string | null;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  sellingPrice: number;
  costPrice: number;
  profit: number;
  timestamp: string;
  synced: boolean;
  customerId?: string;
  customerName?: string;
  paymentMethod: 'cash' | 'mpesa' | 'debt' | 'partial' | 'split';
  paymentDetails: {
    cashAmount: number;
    mpesaAmount: number;
    debtAmount: number;
    mpesaReference?: string;
    tillNumber?: string;
    discountAmount?: number;
    saleReference?: string;
  };
  total: number;
  clientSaleId?: string;
  offlineId?: string;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number; // Now supports decimal values for precise variant calculations
  lowStockThreshold: number;
  createdAt: string;
  updatedAt: string;
  image_url?: string | null;
  // Variant support
  parent_id?: string | null;
  variant_name?: string | null;
  variant_multiplier?: number;
  stock_derivation_quantity?: number;
  is_parent?: boolean;
}
