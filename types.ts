
export interface User {
  uid: string;
  email: string;
  displayName: string;
}

export interface Customer {
  id: string;
  name: string;
  gender: string;
  age: number;
  phone: string;
  address: string;
  createdAt: string;
  points: number; // Current points balance
  recordedBy?: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  type: 'frame' | 'lens' | 'accessory' | 'contact_lens';
  price: number;
  cost?: number; // Added for COGS calculation
  stock: number;
  description?: string;
}

export interface VisionData {
  sph: number;
  cyl: number;
  axis: number;
  add: number;
  pd: number;
  sh: number;
  va?: string;
}

export interface Prescription {
  id: string;
  customerId: string;
  date: string;
  vision: {
    right: VisionData;
    left: VisionData;
  };
  frame: {
    size: string; // General string representation (e.g. calculated from width-bridge-temple)
    width?: number; // Lens Width
    height?: number; // Lens Height
    diagonal?: number; // ED
    bridge?: number; // Bridge
    style: string;
    brand?: string; // Brand/Model of the frame
    color?: string;
  };
  lens: {
    type: string;
    features: string;
    index: string;
  };
  payment: {
    framePrice: number;
    lensPrice: number;
    discount: number;
    pointsUsed?: number; // Track points used for this transaction
    promotionId?: string; // Track which promotion was applied
    deposit: number;
    remaining: number;
    method?: string;
  };
  pickupDate?: string;
  dueDate?: string;
  lifestyle?: string;
  usageType?: string;
  recordedBy?: string;
}

export interface Appointment {
  id: string;
  customerId: string;
  date: string;
  time: string;
  note: string;
  recordedBy?: string;
}

export interface Job {
  id: string;
  customerId: string;
  orderDate: string;
  pickupDate: string;
  status: 'รอเลนส์' | 'กำลังประกอบ' | 'พร้อมรับ' | 'รับแล้ว';
  items: string[];
}

export interface TransactionItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Purchase {
  id: string;
  customerId: string;
  date: string;
  items: TransactionItem[];
  total: number;
}

export interface PaymentHistory {
  id: string;
  prescriptionId?: string; // Optional now, can be linked to installment
  installmentId?: string; // Link to installment plan
  customerId: string;
  date: string;
  time: string;
  amount: number;
  method: string;
  type: 'deposit' | 'full' | 'partial' | 'installment';
  note?: string;
  recordedBy?: string;
}

export interface PointTransaction {
  id: string;
  customerId: string;
  date: string;
  type: 'earn' | 'redeem' | 'adjust';
  points: number;
  relatedId?: string; // prescriptionId or paymentId
  note?: string;
}

// Updated to allow string for custom types
export type PromotionType = 'bundle_frame_lens' | 'tier_discount' | 'spend_save' | 'time_based' | 'brand_discount' | string;

export interface Promotion {
  id: string;
  name: string;
  description: string;
  conditionText?: string; // New field for detailed text conditions
  type: PromotionType;
  isActive: boolean;
  startDate: string;
  endDate: string;
  conditions: {
    minSpend?: number;        // For spend_save
    discountAmount?: number;  // For spend_save
    discountPercent?: number; // For brand_discount, time_based
    targetBrand?: string;     // For brand_discount (matches part of product name)
    startHour?: string;       // For time_based (e.g., "14:00")
    endHour?: string;         // For time_based (e.g., "16:00")
    tierRates?: {             // For tier_discount
      bronze: number;
      silver: number;
      gold: number;
      platinum: number;
    };
  };
}

export interface InstallmentSchedule {
    term: number; // 1, 2, 3...
    dueDate: string;
    amount: number;
    status: 'pending' | 'paid' | 'overdue';
    paidDate?: string;
}

export interface InstallmentPlan {
    id: string;
    customerId: string;
    productName: string; // Brief description of what is being paid for
    totalAmount: number; // Full price
    downPayment: number; // Paid upfront
    principalAmount: number; // total - downPayment
    months: number;
    interestRate: number; // %
    monthlyAmount: number;
    startDate: string;
    status: 'active' | 'completed' | 'cancelled';
    schedules: InstallmentSchedule[];
    note?: string;
    recordedBy?: string;
    customerName?: string; // Snapshot of customer name at creation time
}

export interface SystemLog {
  id: string;
  timestamp: string;
  action: string; 
  details: string; 
  userId: string;
  userName: string;
  userEmail?: string;
  ipAddress?: string; 
  userAgent?: string;
  relatedId?: string; 
}

// --- ACTIVITY LOG SYSTEM (NEW) ---

export type LogActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW' | 'PRINT' | 'OTHER';
export type LogModule = 'CUSTOMER' | 'ORDER' | 'INVOICE' | 'PRODUCT' | 'STOCK' | 'SETTINGS' | 'AUTH' | 'ACCOUNTING';

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  role?: string;
  actionType: LogActionType;
  module: LogModule;
  refId?: string; // Reference ID (e.g., CustomerID, OrderID)
  description: string;
  oldData?: any; // JSON Snapshot
  newData?: any; // JSON Snapshot
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

// --- ACCOUNTING MODULE TYPES ---

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  description?: string;
  isSystem?: boolean; // If true, cannot be deleted
}

export interface JournalLine {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  reference: string; // e.g., INV-001, RC-001
  description: string;
  lines: JournalLine[];
  totalAmount: number;
  status: 'draft' | 'posted' | 'voided';
  moduleSource: 'sales' | 'inventory' | 'manual';
  createdBy: string;
  createdAt: string;
}

export interface AccountingPeriod {
  id: string;
  year: number;
  month: number;
  isClosed: boolean;
  closedBy?: string;
  closedAt?: string;
}

// --------------------------------

export interface AppSettings {
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  taxId: string;
  logo: string; // URL for the logo
  receiptHeader: string;
  receiptFooter: string;
  defaultPd: number;
  lowStockThreshold: number;
  enableVat: boolean; // Add VAT Toggle
  vatRate: number;
  // Loyalty System
  enablePoints: boolean;
  earnRate: number; // THB amount to earn 1 point (e.g. 25)
  redeemRate: number; // THB discount per 1 point (e.g. 1)
  // Document Running Numbers
  documentRunningNumbers?: Record<string, number>; // Key: "PREFIX-YEAR" (e.g. "QT-2024"), Value: last number
  // Security
  autoLogoutEnabled?: boolean;
  autoLogoutMinutes?: number;
}
