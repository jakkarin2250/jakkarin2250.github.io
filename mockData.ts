
import { Customer, Product, Prescription, Appointment, Job, Purchase, PaymentHistory, Promotion, InstallmentPlan, Account } from '../types';

export const mockCustomers: Customer[] = [
  { id: '1', name: 'สมชาย ใจดี', gender: 'ชาย', age: 45, phone: '0812345678', address: '123 ถ.สุขุมวิท กทม.', createdAt: '2024-01-15', points: 150, recordedBy: 'admin' },
  { id: '2', name: 'สมหญิง รักสวย', gender: 'หญิง', age: 32, phone: '0898765432', address: '456 ถ.สีลม กทม.', createdAt: '2024-02-20', points: 50, recordedBy: 'admin' }
];

export const mockProducts: Product[] = [
  { id: '1', code: 'FR001', name: 'Ray-Ban Aviator', type: 'frame', price: 4500, cost: 2500, stock: 10, description: 'Classic gold frame' },
  { id: '2', code: 'LN001', name: 'Hoya BlueControl', type: 'lens', price: 2500, cost: 1200, stock: 50, description: 'Blue light filter' },
  { id: '3', code: 'AC001', name: 'Lens Cloth', type: 'accessory', price: 50, cost: 15, stock: 100 }
];

export const mockPrescriptions: Prescription[] = [
  {
    id: '1', customerId: '1', date: '2024-03-01',
    vision: {
      right: { sph: -2.00, cyl: -0.50, axis: 180, add: 0, pd: 62, sh: 0 },
      left: { sph: -1.75, cyl: -0.25, axis: 175, add: 0, pd: 62, sh: 0 }
    },
    frame: { size: '54-18-140', style: 'Full Rim', brand: 'Ray-Ban' },
    lens: { type: 'Single Vision', features: 'Multicoat', index: '1.56' },
    payment: { framePrice: 4500, lensPrice: 2500, discount: 500, pointsUsed: 0, deposit: 3000, remaining: 3500 },
    pickupDate: '2024-03-08', lifestyle: 'Office work', recordedBy: 'admin'
  }
];

export const mockAppointments: Appointment[] = [
  { id: '1', customerId: '2', date: new Date().toISOString().split('T')[0], time: '14:00', note: 'วัดสายตาประจำปี' }
];

export const mockJobs: Job[] = [
  { id: '1', customerId: '1', orderDate: '2024-03-01', pickupDate: '2024-03-08', status: 'กำลังประกอบ', items: ['Ray-Ban Aviator', 'Hoya BlueControl'] }
];

export const mockPurchases: Purchase[] = [
  { id: '1', customerId: '2', date: '2024-02-20', items: [{ productId: '3', name: 'Lens Cloth', quantity: 2, price: 50 }], total: 100 }
];

export const mockPaymentHistory: PaymentHistory[] = [
    { id: '1', prescriptionId: '1', customerId: '1', date: '2024-03-01', time: '10:00', amount: 3000, method: 'Cash', type: 'deposit', recordedBy: 'admin' }
];

export const mockInstallments: InstallmentPlan[] = [
    {
        id: '1',
        customerId: '1',
        productName: 'กรอบ IC Berlin + เลนส์ Progressive',
        totalAmount: 25000,
        downPayment: 5000,
        principalAmount: 20000,
        months: 4,
        interestRate: 0,
        monthlyAmount: 5000,
        startDate: '2024-03-01',
        status: 'active',
        schedules: [
            { term: 1, dueDate: '2024-04-01', amount: 5000, status: 'pending' },
            { term: 2, dueDate: '2024-05-01', amount: 5000, status: 'pending' },
            { term: 3, dueDate: '2024-06-01', amount: 5000, status: 'pending' },
            { term: 4, dueDate: '2024-07-01', amount: 5000, status: 'pending' },
        ],
        note: 'ผ่อน 0% 4 เดือน',
        recordedBy: 'admin'
    }
];

export const mockPromotions: Promotion[] = [
  {
    id: '1',
    name: 'ซื้อกรอบแถมเลนส์',
    description: 'เมื่อซื้อกรอบแว่นราคาปกติ รับฟรีเลนส์ Multicoat (มูลค่าไม่เกิน 1,500 บาท)',
    type: 'bundle_frame_lens',
    isActive: true,
    startDate: '2024-01-01',
    endDate: '2030-12-31',
    conditions: {
      discountAmount: 1500 
    }
  },
  {
    id: '2',
    name: 'สมาชิกลดเพิ่ม',
    description: 'ส่วนลดพิเศษตามระดับสมาชิก Bronze 5%, Silver 10%, Gold 15%',
    type: 'tier_discount',
    isActive: true,
    startDate: '2024-01-01',
    endDate: '2030-12-31',
    conditions: {
      tierRates: {
        bronze: 5,
        silver: 10,
        gold: 15,
        platinum: 20
      }
    }
  },
  {
    id: '3',
    name: 'ช้อปครบ 5,000 ลด 500',
    description: 'เมื่อมียอดซื้อรวม 5,000 บาทขึ้นไป ลดทันที 500 บาท',
    type: 'spend_save',
    isActive: true,
    startDate: '2024-01-01',
    endDate: '2030-12-31',
    conditions: {
      minSpend: 5000,
      discountAmount: 500
    }
  },
  {
    id: '4',
    name: 'Happy Hour (13:00 - 16:00)',
    description: 'ลด 10% ทุกรายการในช่วงเวลาบ่ายโมงถึงสี่โมงเย็น',
    type: 'time_based',
    isActive: true,
    startDate: '2024-01-01',
    endDate: '2030-12-31',
    conditions: {
      startHour: '13:00',
      endHour: '16:00',
      discountPercent: 10
    }
  },
  {
    id: '5',
    name: 'Ray-Ban Day',
    description: 'สินค้าแบรนด์ Ray-Ban ลด 20%',
    type: 'brand_discount',
    isActive: true,
    startDate: '2024-01-01',
    endDate: '2030-12-31',
    conditions: {
      targetBrand: 'Ray-Ban',
      discountPercent: 20
    }
  }
];

// --- Accounting Seed Data ---
export const mockAccounts: Account[] = [
  // Assets (1000-1999)
  { id: 'acc_1001', code: '1001', name: 'เงินสด (Cash)', type: 'Asset', isSystem: true },
  { id: 'acc_1002', code: '1002', name: 'เงินฝากธนาคาร (Bank)', type: 'Asset', isSystem: true },
  { id: 'acc_1200', code: '1200', name: 'ลูกหนี้การค้า (Accounts Receivable)', type: 'Asset', isSystem: true },
  { id: 'acc_1300', code: '1300', name: 'สินค้าคงเหลือ (Inventory)', type: 'Asset', isSystem: true },
  
  // Liabilities (2000-2999)
  { id: 'acc_2001', code: '2001', name: 'เจ้าหนี้การค้า (Accounts Payable)', type: 'Liability', isSystem: true },
  { id: 'acc_2002', code: '2002', name: 'ภาษีขาย (Output VAT)', type: 'Liability', isSystem: true },
  { id: 'acc_2003', code: '2003', name: 'ภาษีซื้อ (Input VAT)', type: 'Asset', isSystem: true }, // Usually Asset/Contra-Liability
  { id: 'acc_2004', code: '2004', name: 'เงินรับล่วงหน้า (Unearned Revenue)', type: 'Liability', isSystem: true },

  // Equity (3000-3999)
  { id: 'acc_3001', code: '3001', name: 'ทุน (Capital)', type: 'Equity', isSystem: true },
  { id: 'acc_3002', code: '3002', name: 'กำไรสะสม (Retained Earnings)', type: 'Equity', isSystem: true },

  // Revenue (4000-4999)
  { id: 'acc_4001', code: '4001', name: 'รายได้จากการขาย (Sales Revenue)', type: 'Revenue', isSystem: true },
  { id: 'acc_4002', code: '4002', name: 'รายได้ค่าบริการ (Service Revenue)', type: 'Revenue', isSystem: true },
  { id: 'acc_4003', code: '4003', name: 'ส่วนลดจ่าย (Sales Discount)', type: 'Revenue', isSystem: true }, // Contra-Revenue

  // Expense (5000-5999)
  { id: 'acc_5001', code: '5001', name: 'ต้นทุนขาย (Cost of Goods Sold)', type: 'Expense', isSystem: true },
  { id: 'acc_5002', code: '5002', name: 'เงินเดือนพนักงาน (Salary Expense)', type: 'Expense', isSystem: true },
  { id: 'acc_5003', code: '5003', name: 'ค่าเช่า (Rent Expense)', type: 'Expense', isSystem: true },
  { id: 'acc_5004', code: '5004', name: 'ค่าสาธารณูปโภค (Utilities)', type: 'Expense', isSystem: true },
];
