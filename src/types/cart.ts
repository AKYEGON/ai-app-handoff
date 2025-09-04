import { Product } from './index';

export interface CartItem extends Product {
  quantity: number;
  customPrice?: number;
}

export interface SplitPaymentData {
  methods: {
    cash?: { amount: number; percentage: number };
    mpesa?: { amount: number; percentage: number; reference?: string };
    debt?: { amount: number; percentage: number; customerId?: string };
    discount?: { amount: number; percentage: number };
  };
  total: number;
  isValid: boolean;
}