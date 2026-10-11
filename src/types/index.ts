export type UserRole = 'owner' | 'admin' | 'manager' | 'salesperson' | 'accountant' | 'inventory_manager';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  activeBusinessId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Business {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  businessType: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  currency: string; // e.g. 'BDT', 'USD'
  currencySymbol: string; // e.g. '৳', '$'
  logoUrl?: string;
  openingCashBalance: number;
  createdAt: string;
  updatedAt?: string;
}

export interface BusinessMember {
  id: string;
  businessId: string;
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  joinedAt: string;
}

export interface ProductCategory {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  categoryName: string;
  unit: string; // pcs, kg, box, liter, meter, etc.
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
  openingStock: number;
  alertStock: number;
  imageUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  purchasePrice: number; // for COGS and gross profit calculation
  total: number;
}

export interface Sale {
  id: string;
  businessId: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number; // fixed discount amount
  tax: number; // fixed tax amount
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: 'cash' | 'bank' | 'mfs' | 'credit';
  accountId?: string;
  accountName?: string;
  status: 'paid' | 'partial' | 'due' | 'returned';
  notes?: string;
  date: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  purchasePrice: number;
  total: number;
}

export interface Purchase {
  id: string;
  businessId: string;
  billNumber: string;
  supplierId?: string;
  supplierName: string;
  supplierPhone?: string;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: 'cash' | 'bank' | 'mfs' | 'credit';
  accountId?: string;
  accountName?: string;
  status: 'paid' | 'partial' | 'due' | 'returned';
  notes?: string;
  date: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  openingBalance: number; // positive = customer owes us (Receivable)
  currentBalance: number;
  createdAt: string;
}

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  openingBalance: number; // positive = we owe supplier (Payable)
  currentBalance: number;
  createdAt: string;
}

export type AccountType = 'cash' | 'bank' | 'mfs';

export interface FinancialAccount {
  id: string;
  businessId: string;
  name: string;
  type: AccountType;
  accountNumber?: string;
  bankName?: string;
  branchName?: string;
  mfsProvider?: 'bkash' | 'nagad' | 'rocket' | 'upay' | 'other';
  currentBalance: number;
  openingBalance: number;
  isDefault?: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  businessId: string;
  category: string;
  amount: number;
  accountId: string;
  accountName?: string;
  date: string;
  note?: string;
  receiptUrl?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}

export interface Income {
  id: string;
  businessId: string;
  category: string;
  amount: number;
  accountId: string;
  accountName?: string;
  date: string;
  note?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}

export interface AccountTransfer {
  id: string;
  businessId: string;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number;
  date: string;
  note?: string;
  createdBy: string;
  createdAt: string;
}

export type MovementType = 'sale' | 'purchase' | 'adjustment_in' | 'adjustment_out' | 'damage' | 'sale_return' | 'purchase_return';

export interface StockMovement {
  id: string;
  businessId: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantity: number; // always positive magnitude
  previousStock: number;
  newStock: number;
  referenceId?: string; // saleId, purchaseId, returnId
  reason?: string;
  date: string;
  createdBy: string;
  createdAt: string;
}

export interface ReturnRecord {
  id: string;
  businessId: string;
  type: 'sale_return' | 'purchase_return';
  referenceNumber: string; // original invoice or bill #
  partyName: string; // customer or supplier name
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  totalRefund: number;
  accountId?: string;
  date: string;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export type AuditActionType =
  | 'invoice_created'
  | 'stock_adjusted'
  | 'account_transfer'
  | 'purchase_created'
  | 'customer_payment'
  | 'supplier_payment'
  | 'return_processed'
  | 'product_created'
  | 'product_deleted'
  | 'expense_created'
  | 'income_created'
  | 'member_added'
  | 'member_removed';

export type AuditCategory = 'sales' | 'inventory' | 'finance' | 'purchases' | 'team' | 'security';

export interface AuditLog {
  id: string;
  businessId: string;
  action: AuditActionType;
  category: AuditCategory;
  title: string;
  details: string;
  performedBy: string;
  performedByName: string;
  performedByEmail?: string;
  targetId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
