export interface Payment {
  id: string;

  companyId: string;
  planId: string;

  amount: number;
  currency: string;

  paymentMethod: 'orange_money' | 'mtn_money' | 'bank_transfer' | 'cash' | 'card';

  transactionReference: string;

  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

  invoiceNumber: string;

  billingPeriodStart?: Date;
  billingPeriodEnd?: Date;

  paidAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}
