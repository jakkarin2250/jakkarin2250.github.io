
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Customer, Product, Prescription, Appointment, Job, Purchase, PaymentHistory, AppSettings, PointTransaction, Promotion, SystemLog, InstallmentPlan, Account, JournalEntry, AccountingPeriod, JournalLine, ActivityLog, LogActionType, LogModule } from '../types';
import { db, ref, onValue, set, push, remove, update, get, auth, runTransaction } from '../services/firebase';
import { mockCustomers, mockProducts, mockPrescriptions, mockAppointments, mockJobs, mockPurchases, mockPaymentHistory, mockPromotions, mockInstallments, mockAccounts } from '../services/mockData';

interface DataContextType {
  customers: Customer[];
  products: Product[];
  prescriptions: Prescription[];
  appointments: Appointment[];
  jobs: Job[];
  purchases: Purchase[];
  paymentHistory: PaymentHistory[];
  pointTransactions: PointTransaction[];
  promotions: Promotion[];
  installments: InstallmentPlan[];
  systemLogs: SystemLog[];
  activityLogs: ActivityLog[]; // New
  settings: AppSettings;
  // Accounting State
  accounts: Account[];
  journalEntries: JournalEntry[];
  accountingPeriods: AccountingPeriod[];
  
  // Actions
  addCustomer: (data: Omit<Customer, 'id' | 'createdAt' | 'points'>) => Promise<string>;
  updateCustomer: (id: string, data: Partial<Customer>) => void;
  deleteCustomer: (id: string) => Promise<void>;
  
  addProduct: (data: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, data: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  
  addPrescription: (data: Omit<Prescription, 'id'>) => void;
  updatePrescription: (id: string, data: Partial<Prescription>) => void;
  deletePrescription: (id: string) => void;

  addAppointment: (data: Omit<Appointment, 'id'>) => void;
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;

  addJob: (data: Omit<Job, 'id'>) => void;
  updateJobStatus: (id: string, status: Job['status']) => void;
  deleteJob: (id: string) => void;

  addPurchase: (data: Omit<Purchase, 'id'>) => void;
  deletePurchase: (id: string) => void;
  
  addPayment: (data: Omit<PaymentHistory, 'id'>) => void;
  updatePayment: (id: string, data: Partial<PaymentHistory>) => void;
  deletePayment: (id: string) => void;

  // Installments
  addInstallment: (data: Omit<InstallmentPlan, 'id'>) => void;
  payInstallment: (planId: string, term: number, amount: number, method: string) => void;
  deleteInstallment: (id: string) => void;

  // Promotions
  addPromotion: (data: Omit<Promotion, 'id'>) => void;
  updatePromotion: (id: string, data: Partial<Promotion>) => void;
  deletePromotion: (id: string) => void;
  calculateAvailablePromotions: (customerId: string, framePrice: number, lensPrice: number, frameName?: string) => { promo: Promotion; discountAmount: number }[];

  // Loyalty
  adjustPoints: (customerId: string, points: number, type: 'earn' | 'redeem' | 'adjust', note?: string, relatedId?: string) => Promise<void>;
  recalculatePoints: (customerId: string) => Promise<void>;
  recalculateAllPoints: (startDate?: string, endDate?: string) => Promise<number>;

  // Documents
  getNextDocumentId: (docType: string) => string;
  incrementDocumentId: (docType: string) => void;

  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetData: () => Promise<void>;
  importData: (data: any) => Promise<void>;
  clearSystemLogs: () => Promise<void>;

  // Accounting Actions
  addJournalEntry: (data: Omit<JournalEntry, 'id' | 'createdAt' | 'createdBy'>) => void;
  updateJournalEntry: (id: string, data: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;
  closeAccountingPeriod: (year: number, month: number) => void;
  reopenAccountingPeriod: (year: number, month: number) => void;

  // Logger
  logManualActivity: (action: LogActionType, module: LogModule, description: string, refId?: string, oldData?: any, newData?: any) => void;
}

const defaultSettings: AppSettings = {
  shopName: 'J.T. Optic',
  shopAddress: '123 Optical Road, Bangkok',
  shopPhone: '02-123-4567',
  taxId: '',
  logo: '/logo.png', // Default Logo
  receiptHeader: 'ใบเสร็จรับเงิน / Receipt',
  receiptFooter: 'ขอบคุณที่ใช้บริการ / Thank you',
  defaultPd: 0,
  lowStockThreshold: 5,
  enableVat: false,
  vatRate: 7,
  enablePoints: true,
  earnRate: 25, // 25 THB = 1 Point
  redeemRate: 1, // 1 Point = 1 THB
  documentRunningNumbers: {},
  autoLogoutEnabled: true,
  autoLogoutMinutes: 10
};

// Helper to remove undefined values for Firebase
const cleanForFirebase = (data: any) => {
    return JSON.parse(JSON.stringify(data));
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children?: ReactNode }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [pointTransactions, setPointTransactions] = useState<PointTransaction[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [installments, setInstallments] = useState<InstallmentPlan[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]); // New
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  
  // Accounting State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [accountingPeriods, setAccountingPeriods] = useState<AccountingPeriod[]>([]);

  // --- CORE LOGGING FUNCTION ---
  const logActivity = (
      actionType: LogActionType, 
      module: LogModule, 
      description: string, 
      refId?: string, 
      oldData?: any, 
      newData?: any
  ) => {
      const currentUser = auth.currentUser;
      const newRef = push(ref(db, 'activity_logs'));
      const logEntry: ActivityLog = {
          id: newRef.key as string,
          timestamp: new Date().toISOString(),
          userId: currentUser?.uid || 'system',
          userName: currentUser?.displayName || 'System',
          role: 'admin', // Placeholder
          actionType,
          module,
          description,
          refId,
          oldData: oldData ? cleanForFirebase(oldData) : undefined,
          newData: newData ? cleanForFirebase(newData) : undefined,
          userAgent: navigator.userAgent
      };
      set(newRef, cleanForFirebase(logEntry));
  };

  // Helper for compatibility with legacy systemLogs
  const logAction = (action: string, details: string, relatedId?: string) => {
      const currentUser = auth.currentUser;
      const newRef = push(ref(db, 'systemLogs'));
      const log: SystemLog = {
          id: newRef.key as string,
          timestamp: new Date().toISOString(),
          action,
          details,
          userId: currentUser?.uid || 'system',
          userName: currentUser?.displayName || 'System',
          userEmail: currentUser?.email || 'System',
          userAgent: navigator.userAgent,
          relatedId
      };
      set(newRef, cleanForFirebase(log));
  };

  // Initial Data Seeding
  useEffect(() => {
    const checkAndSeedData = async () => {
        const snapshot = await get(ref(db, 'customers'));
        if (!snapshot.exists()) {
            console.log('Seeding initial data...');
            const seed = (path: string, data: any[]) => {
                const dataObj: any = {};
                data.forEach(item => {
                    dataObj[item.id] = item;
                });
                set(ref(db, path), cleanForFirebase(dataObj));
            };

            seed('customers', mockCustomers);
            seed('products', mockProducts);
            seed('prescriptions', mockPrescriptions);
            seed('appointments', mockAppointments);
            seed('jobs', mockJobs);
            seed('purchases', mockPurchases);
            seed('paymentHistory', mockPaymentHistory);
            seed('promotions', mockPromotions);
            seed('installments', mockInstallments);
            seed('accounts', mockAccounts); // Seed Accounting
            set(ref(db, 'settings'), defaultSettings);
        } else {
            // Check if accounts exist (migration for existing users)
            const accSnap = await get(ref(db, 'accounts'));
            if (!accSnap.exists()) {
                 const dataObj: any = {};
                 mockAccounts.forEach(item => { dataObj[item.id] = item; });
                 set(ref(db, 'accounts'), cleanForFirebase(dataObj));
            }
        }
    };
    checkAndSeedData();
  }, []);

  // Realtime Listeners
  useEffect(() => {
    const refs = [
      { path: 'customers', setter: setCustomers },
      { path: 'products', setter: setProducts },
      { path: 'prescriptions', setter: setPrescriptions },
      { path: 'appointments', setter: setAppointments },
      { path: 'jobs', setter: setJobs },
      { path: 'purchases', setter: setPurchases },
      { path: 'paymentHistory', setter: setPaymentHistory },
      { path: 'pointTransactions', setter: setPointTransactions },
      { path: 'promotions', setter: setPromotions },
      { path: 'installments', setter: setInstallments },
      { path: 'systemLogs', setter: setSystemLogs },
      { path: 'activity_logs', setter: setActivityLogs },
      { path: 'accounts', setter: setAccounts },
      { path: 'journalEntries', setter: setJournalEntries },
      { path: 'accountingPeriods', setter: setAccountingPeriods }
    ];

    const unsubs = refs.map(({ path, setter }) => {
      return onValue(ref(db, path), (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const items = Object.entries(data).map(([key, value]) => ({ ...(value as any), id: key }));
          (setter as any)(items);
        } else {
          (setter as any)([]);
        }
      });
    });

    const settingsUnsub = onValue(ref(db, 'settings'), (snapshot) => {
        const data = snapshot.val();
        if (data) setSettings({ ...defaultSettings, ...data });
    });

    return () => {
      unsubs.forEach(unsub => unsub());
      settingsUnsub();
    };
  }, []);

  
  // --- Accounting Logic: Auto-Journal Creation ---
  const addJournalEntry = (data: Omit<JournalEntry, 'id' | 'createdAt' | 'createdBy'>) => {
      const dateObj = new Date(data.date);
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth() + 1;

      // Check if period is closed
      const isClosed = accountingPeriods.some(p => p.year === year && p.month === month && p.isClosed);
      if (isClosed) {
          throw new Error(`งวดบัญชี ${month}/${year} ถูกปิดแล้ว ไม่สามารถบันทึกรายการได้`);
      }

      const newRef = push(ref(db, 'journalEntries'));
      const id = newRef.key as string;
      const currentUser = auth.currentUser;
      
      const payload = {
          ...data,
          id,
          createdAt: new Date().toISOString(),
          createdBy: currentUser?.displayName || 'System'
      };

      set(newRef, cleanForFirebase(payload));
      
      logActivity('CREATE', 'ACCOUNTING', `บันทึกรายการบัญชี: ${data.description}`, id, undefined, payload);
  };

  const updateJournalEntry = (id: string, data: Partial<JournalEntry>) => {
      const oldData = journalEntries.find(j => j.id === id);
      update(ref(db, `journalEntries/${id}`), cleanForFirebase(data));
      logActivity('UPDATE', 'ACCOUNTING', `แก้ไขรายการบัญชี ID: ${id}`, id, oldData, data);
  };

  const deleteJournalEntry = (id: string) => {
      const oldData = journalEntries.find(j => j.id === id);
      remove(ref(db, `journalEntries/${id}`));
      logActivity('DELETE', 'ACCOUNTING', `ลบรายการบัญชี ID: ${id}`, id, oldData, undefined);
  };

  const closeAccountingPeriod = (year: number, month: number) => {
      // Validate duplicates
      if (accountingPeriods.some(p => p.year === year && p.month === month && p.isClosed)) {
          console.warn('Period already closed');
          return;
      }

      const currentUser = auth.currentUser;
      const newRef = push(ref(db, 'accountingPeriods'));
      const id = newRef.key as string;
      const data = {
          id,
          year,
          month,
          isClosed: true,
          closedBy: currentUser?.displayName || 'Admin',
          closedAt: new Date().toISOString()
      };
      set(newRef, data);
      logActivity('UPDATE', 'ACCOUNTING', `ปิดงวดบัญชี: ${month}/${year}`, id, undefined, data);
  };

  const reopenAccountingPeriod = (year: number, month: number) => {
      const period = accountingPeriods.find(p => p.year === year && p.month === month && p.isClosed);
      if (period) {
          remove(ref(db, `accountingPeriods/${period.id}`));
          logActivity('UPDATE', 'ACCOUNTING', `เปิดงวดบัญชีใหม่ (Re-open): ${month}/${year}`, period.id);
      }
  };

  // Helper to get Account by Code (simplifies mapping)
  const getAcc = (code: string) => accounts.find(a => a.code === code);

  // Document Numbering Logic
  const getDocumentPrefix = (docType: string) => {
      const map: Record<string, string> = {
          quotation: 'QT',
          deposit: 'DP',
          po: 'PO',
          delivery: 'DL',
          invoice: 'IV',
          receipt: 'RC',
          tax_invoice: 'TIV',
          cn: 'CN',
          dn: 'DN',
          prescription: 'RX',
          lens_order: 'LO',
          warranty: 'WR'
      };
      return map[docType] || 'DOC';
  };

  const getNextDocumentId = (docType: string) => {
      const prefix = getDocumentPrefix(docType);
      const year = new Date().getFullYear();
      const key = `${prefix}-${year}`;
      const current = settings.documentRunningNumbers?.[key] || 0;
      const next = current + 1;
      return `${prefix}-${year}-${String(next).padStart(4, '0')}`;
  };

  const incrementDocumentId = (docType: string) => {
      const prefix = getDocumentPrefix(docType);
      const year = new Date().getFullYear();
      const key = `${prefix}-${year}`;
      const current = settings.documentRunningNumbers?.[key] || 0;
      
      const updatedRunningNumbers = {
          ...(settings.documentRunningNumbers || {}),
          [key]: current + 1
      };

      update(ref(db, 'settings'), { documentRunningNumbers: updatedRunningNumbers });
      logActivity('UPDATE', 'SETTINGS', `อัปเดตเลขเอกสาร ${docType} เป็น ${current + 1}`, undefined, { documentRunningNumbers: settings.documentRunningNumbers }, { documentRunningNumbers: updatedRunningNumbers });
  };

  // Promotion Logic
  const addPromotion = (data: Omit<Promotion, 'id'>) => {
    const newRef = push(ref(db, 'promotions'));
    const payload = cleanForFirebase({ ...data, id: newRef.key });
    set(newRef, payload);
    logActivity('CREATE', 'SETTINGS', `สร้างโปรโมชั่น: ${data.name}`, newRef.key as string, undefined, payload);
  };

  const updatePromotion = (id: string, data: Partial<Promotion>) => {
    const oldData = promotions.find(p => p.id === id);
    update(ref(db, `promotions/${id}`), cleanForFirebase(data));
    logActivity('UPDATE', 'SETTINGS', `แก้ไขโปรโมชั่น: ${data.name || oldData?.name}`, id, oldData, data);
  };

  const deletePromotion = (id: string) => {
    const promo = promotions.find(p => p.id === id);
    remove(ref(db, `promotions/${id}`));
    logActivity('DELETE', 'SETTINGS', `ลบโปรโมชั่น: ${promo?.name}`, id, promo, undefined);
  };

  const calculateAvailablePromotions = (customerId: string, framePrice: number, lensPrice: number, frameName: string = '') => {
    const customer = customers.find(c => c.id === customerId);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    
    const currentTime = now.toTimeString().slice(0, 5);
    const totalAmount = framePrice + lensPrice;

    const points = customer?.points || 0;
    let tier = 'bronze';
    if (points > 1000) tier = 'platinum';
    else if (points > 500) tier = 'gold';
    else if (points > 100) tier = 'silver';

    const validPromos: { promo: Promotion; discountAmount: number }[] = [];

    promotions.forEach(promo => {
      if (!promo.isActive) return;
      if (promo.startDate > today || promo.endDate < today) return;

      let discount = 0;
      let isApplicable = true;
      
      // Safety check: ensure conditions object exists
      const conditions = promo.conditions || {};

      switch (promo.type) {
        case 'bundle_frame_lens':
          if (framePrice > 0 && lensPrice > 0) {
             const maxDiscount = conditions.discountAmount || 0;
             discount = Math.min(lensPrice, maxDiscount);
          }
          break;

        case 'tier_discount':
          const rates = conditions.tierRates;
          if (rates) {
            const percent = (rates as any)[tier] || 0;
            discount = totalAmount * (percent / 100);
          }
          break;

        case 'spend_save':
          const minSpend = conditions.minSpend || 0;
          if (totalAmount >= minSpend) {
            discount = conditions.discountAmount || 0;
          }
          break;

        case 'time_based':
          if (conditions.startHour && conditions.endHour) {
            if (currentTime >= conditions.startHour && currentTime <= conditions.endHour) {
               discount = totalAmount * ((conditions.discountPercent || 0) / 100);
            } else {
               isApplicable = false;
            }
          }
          break;

        case 'brand_discount':
          if (conditions.targetBrand) {
              if (frameName && frameName.toLowerCase().includes((conditions.targetBrand || '').toLowerCase())) {
                 discount = framePrice * ((conditions.discountPercent || 0) / 100);
              } else {
                 isApplicable = false;
              }
          }
          break;
      }

      if (isApplicable) {
        validPromos.push({ promo, discountAmount: Math.floor(discount) });
      }
    });

    return validPromos.sort((a, b) => b.discountAmount - a.discountAmount);
  };

  // Loyalty System
  const adjustPoints = async (customerId: string, points: number, type: 'earn' | 'redeem' | 'adjust', note?: string, relatedId?: string) => {
      let oldPoints = 0;
      const customerRef = ref(db, `customers/${customerId}`);
      await runTransaction(customerRef, (customer) => {
          if (customer) {
              oldPoints = Number(customer.points || 0);
              customer.points = oldPoints + points;
          }
          return customer;
      });

      const newTxRef = push(ref(db, 'pointTransactions'));
      const tx: Omit<PointTransaction, 'id'> = {
          customerId,
          date: new Date().toISOString(),
          type,
          points,
          note: note || '',
          relatedId
      };
      await set(newTxRef, cleanForFirebase({ ...tx, id: newTxRef.key }));
      logActivity('UPDATE', 'CUSTOMER', `ปรับแต้มสะสม: ${type} ${points} แต้ม`, customerId, { points: oldPoints }, { points: oldPoints + points });
  };

  const recalculatePoints = async (customerId: string) => {
     try {
         // This is a placeholder for single user recalc if needed, 
         // but we are using batch recalc primarily.
     } catch (err) {
         console.error(err);
     }
  };

  const recalculateAllPoints = async (startDate?: string, endDate?: string) => {
    const rate = settings.earnRate || 100;
    const updates: any = {};
    let count = 0;

    // Snapshot existing data
    const allPurchases = purchases;
    const allPrescriptions = prescriptions;
    const allTx = pointTransactions;

    customers.forEach(customer => {
        // 1. Calculate Total Spend in range
        let totalSpend = 0;

        // Filter Sales
        const custPurchases = allPurchases.filter(p => String(p.customerId) === String(customer.id));
        custPurchases.forEach(p => {
            if ((!startDate || p.date >= startDate) && (!endDate || p.date <= endDate)) {
                totalSpend += p.total;
            }
        });

        // Filter Prescriptions (Based on Total amount)
        const custRx = allPrescriptions.filter(p => String(p.customerId) === String(customer.id));
        custRx.forEach(p => {
             if ((!startDate || p.date >= startDate) && (!endDate || p.date <= endDate)) {
                 const total = p.payment.framePrice + p.payment.lensPrice - p.payment.discount;
                 totalSpend += total;
             }
        });

        // 2. Target Earned Points based on spend
        const targetEarned = Math.floor(totalSpend / rate);

        // 3. Calculate Non-Sales Balance impact (Redemptions and Manual Adjustments)
        // We sum up all redemptions and manual adjustments to preserve history integrity
        // Logic: New Balance = (Total Spend / Rate) + (Sum of all Adjust/Redeem transactions)
        let nonSalesBalance = 0;
        const custTx = allTx.filter(t => String(t.customerId) === String(customer.id));
        
        custTx.forEach(t => {
            // 'earn' type is what we are replacing with calculation.
            // So we only keep 'redeem' and 'adjust'.
            if (t.type !== 'earn') {
                // 'redeem' is stored as negative in DB (usually) or positive?
                // Based on adjustPoints usage: adjustPoints(..., -points, 'redeem')
                // It seems 'redeem' transactions store NEGATIVE values in DB.
                nonSalesBalance += t.points;
            }
        });

        const newBalance = Math.max(0, targetEarned + nonSalesBalance);
        const currentBalance = customer.points || 0;

        if (newBalance !== currentBalance) {
            // Update Customer Balance
            updates[`customers/${customer.id}/points`] = newBalance;
            
            // Add Adjustment Log Transaction to bridge the gap
            const diff = newBalance - currentBalance;
            const newTxKey = push(ref(db, 'pointTransactions')).key;
            updates[`pointTransactions/${newTxKey}`] = {
                id: newTxKey,
                customerId: customer.id,
                date: new Date().toISOString(),
                type: 'adjust',
                points: diff,
                note: `System Recalculation (Rate 1:${rate})`
            };
            
            count++;
        }
    });

    if (Object.keys(updates).length > 0) {
        await update(ref(db), updates);
        logActivity('UPDATE', 'SETTINGS', `คำนวณแต้มย้อนหลัง: อัปเดตลูกค้า ${count} ราย (Rate 1:${rate})`, undefined, undefined, { updatedCount: count });
    }
    
    return count;
  };

  // Customers
  const addCustomer = async (data: Omit<Customer, 'id' | 'createdAt' | 'points'>): Promise<string> => {
    const newRef = push(ref(db, 'customers'));
    const id = newRef.key as string;
    const createdAt = new Date().toISOString().split('T')[0];
    const payload = cleanForFirebase({ ...data, id, createdAt, points: 0 });
    await set(newRef, payload);
    logActivity('CREATE', 'CUSTOMER', `เพิ่มลูกค้าใหม่: ${data.name}`, id, undefined, payload);
    return id;
  };
  const updateCustomer = (id: string, data: Partial<Customer>) => {
    const oldData = customers.find(c => c.id === id);
    update(ref(db, `customers/${id}`), cleanForFirebase(data));
    logActivity('UPDATE', 'CUSTOMER', `แก้ไขข้อมูลลูกค้า: ${data.name || oldData?.name}`, id, oldData, data);
  };
  const deleteCustomer = async (id: string) => {
    const oldData = customers.find(c => c.id === id);
    
    const promises: Promise<void>[] = [];

    // 1. Delete Customer Profile
    promises.push(remove(ref(db, `customers/${id}`)));

    // 2. Cascade Delete Related Data
    // Prescriptions
    prescriptions.filter(p => String(p.customerId) === String(id)).forEach(p => promises.push(remove(ref(db, `prescriptions/${p.id}`))));
    
    // Appointments
    appointments.filter(a => String(a.customerId) === String(id)).forEach(a => promises.push(remove(ref(db, `appointments/${a.id}`))));
    
    // Jobs
    jobs.filter(j => String(j.customerId) === String(id)).forEach(j => promises.push(remove(ref(db, `jobs/${j.id}`))));
    
    // Purchases
    purchases.filter(p => String(p.customerId) === String(id)).forEach(p => promises.push(remove(ref(db, `purchases/${p.id}`))));
    
    // Payment History
    paymentHistory.filter(p => String(p.customerId) === String(id)).forEach(p => promises.push(remove(ref(db, `paymentHistory/${p.id}`))));
    
    // Point Transactions
    pointTransactions.filter(p => String(p.customerId) === String(id)).forEach(p => promises.push(remove(ref(db, `pointTransactions/${p.id}`))));

    // Installments
    installments.filter(i => String(i.customerId) === String(id)).forEach(i => promises.push(remove(ref(db, `installments/${i.id}`))));

    await Promise.all(promises);

    logActivity('DELETE', 'CUSTOMER', `ลบข้อมูลลูกค้า: ${oldData?.name} และข้อมูลที่เกี่ยวข้องทั้งหมด`, id, oldData, undefined);
  };

  // Products
  const addProduct = (data: Omit<Product, 'id'>) => {
    const newRef = push(ref(db, 'products'));
    const payload = cleanForFirebase({ ...data, id: newRef.key });
    set(newRef, payload);
    logActivity('CREATE', 'PRODUCT', `เพิ่มสินค้า: ${data.name}`, newRef.key as string, undefined, payload);
    
    // Auto Journal
    if (data.stock > 0 && data.cost) {
        const totalCost = data.stock * data.cost;
        const invAcc = getAcc('1300'); 
        const apAcc = getAcc('2001'); 
        if (invAcc && apAcc) {
            addJournalEntry({
                date: new Date().toISOString().split('T')[0],
                reference: `IN-${newRef.key?.substring(0,6)}`,
                description: `รับสินค้าเข้าใหม่: ${data.name}`,
                totalAmount: totalCost,
                status: 'posted',
                moduleSource: 'inventory',
                lines: [
                    { accountId: invAcc.id, accountName: invAcc.name, debit: totalCost, credit: 0 },
                    { accountId: apAcc.id, accountName: apAcc.name, debit: 0, credit: totalCost }
                ]
            });
        }
    }
  };
  const updateProduct = (id: string, data: Partial<Product>) => {
    const oldData = products.find(p => p.id === id);
    update(ref(db, `products/${id}`), cleanForFirebase(data));
    
    // Check if stock changed
    if (data.stock !== undefined && oldData && data.stock !== oldData.stock) {
        logActivity('UPDATE', 'STOCK', `ปรับสต็อกสินค้า: ${oldData.name} (${oldData.stock} -> ${data.stock})`, id, oldData, data);
    } else {
        logActivity('UPDATE', 'PRODUCT', `แก้ไขสินค้า: ${data.name || oldData?.name}`, id, oldData, data);
    }
  };
  const deleteProduct = (id: string) => {
    const oldData = products.find(p => p.id === id);
    remove(ref(db, `products/${id}`));
    logActivity('DELETE', 'PRODUCT', `ลบสินค้า: ${oldData?.name}`, id, oldData, undefined);
  };

  // Prescriptions
  const addPrescription = (data: Omit<Prescription, 'id'>) => {
    const newRef = push(ref(db, 'prescriptions'));
    const id = newRef.key as string;
    const payload = cleanForFirebase({ ...data, id });
    set(newRef, payload);
    logActivity('CREATE', 'ORDER', `สร้างใบวัดสายตา (ลูกค้า ID: ${data.customerId})`, id, undefined, payload);

    // Auto Journal Logic ...
    const totalAmount = data.payment.framePrice + data.payment.lensPrice - data.payment.discount;
    const vatAmount = settings.enableVat ? (totalAmount * 7 / 107) : 0;
    const revenueAmount = totalAmount - vatAmount;

    const arAcc = getAcc('1200'); 
    const revAcc = getAcc('4002'); 
    const vatAcc = getAcc('2002'); 

    if (arAcc && revAcc) {
        const lines: JournalLine[] = [
            { accountId: arAcc.id, accountName: arAcc.name, debit: totalAmount, credit: 0 },
            { accountId: revAcc.id, accountName: revAcc.name, debit: 0, credit: revenueAmount }
        ];
        if (vatAcc && vatAmount > 0) {
            lines.push({ accountId: vatAcc.id, accountName: vatAcc.name, debit: 0, credit: vatAmount });
        }

        addJournalEntry({
            date: data.date,
            reference: `RX-${String(id || '').substring(0,6)}`,
            description: `รายได้จากการตัดแว่น (RX)`,
            totalAmount: totalAmount,
            status: 'posted',
            moduleSource: 'sales',
            lines
        });
    }

    // Points logic ...
    if (settings.enablePoints && settings.earnRate > 0 && data.payment.deposit > 0) {
        const pointsEarned = Math.floor(data.payment.deposit / settings.earnRate);
        if (pointsEarned > 0) {
            adjustPoints(data.customerId, pointsEarned, 'earn', 'สะสมแต้มจากยอดมัดจำ/ชำระ', id);
        }
    }
  };
  const updatePrescription = (id: string, data: Partial<Prescription>) => {
    const oldData = prescriptions.find(p => p.id === id);
    update(ref(db, `prescriptions/${id}`), cleanForFirebase(data));
    logActivity('UPDATE', 'ORDER', `แก้ไขใบวัดสายตา ID: ${id}`, id, oldData, data);
  };
  const deletePrescription = (id: string) => {
    const oldData = prescriptions.find(p => p.id === id);
    if (oldData) {
        if (oldData.payment.pointsUsed && oldData.payment.pointsUsed > 0) {
            adjustPoints(oldData.customerId, oldData.payment.pointsUsed, 'adjust', 'คืนแต้มจากการลบรายการ', id);
        }
        if (settings.enablePoints && settings.earnRate > 0 && oldData.payment.deposit > 0) {
             const pointsEarned = Math.floor(oldData.payment.deposit / settings.earnRate);
             if (pointsEarned > 0) {
                 adjustPoints(oldData.customerId, -pointsEarned, 'adjust', 'หักแต้มคืนจากการลบรายการ', id);
             }
        }
    }
    remove(ref(db, `prescriptions/${id}`));
    logActivity('DELETE', 'ORDER', `ลบใบวัดสายตา ID: ${id}`, id, oldData, undefined);
  };

  // Appointments
  const addAppointment = (data: Omit<Appointment, 'id'>) => {
    const newRef = push(ref(db, 'appointments'));
    const payload = cleanForFirebase({ ...data, id: newRef.key });
    set(newRef, payload);
    logActivity('CREATE', 'CUSTOMER', `นัดหมายลูกค้า: ${data.date} ${data.time}`, newRef.key as string, undefined, payload);
  };
  const updateAppointment = (id: string, data: Partial<Appointment>) => {
    const oldData = appointments.find(a => a.id === id);
    update(ref(db, `appointments/${id}`), cleanForFirebase(data));
    logActivity('UPDATE', 'CUSTOMER', `แก้ไขนัดหมาย ID: ${id}`, id, oldData, data);
  };
  const deleteAppointment = (id: string) => {
    const oldData = appointments.find(a => a.id === id);
    remove(ref(db, `appointments/${id}`));
    logActivity('DELETE', 'CUSTOMER', `ลบนัดหมาย ID: ${id}`, id, oldData, undefined);
  };

  // Jobs
  const addJob = (data: Omit<Job, 'id'>) => {
    const newRef = push(ref(db, 'jobs'));
    const payload = cleanForFirebase({ ...data, id: newRef.key });
    set(newRef, payload);
    logActivity('CREATE', 'ORDER', `สร้างงานติดตาม (Job) ใหม่`, newRef.key as string, undefined, payload);
  };
  const updateJobStatus = (id: string, status: Job['status']) => {
    const oldData = jobs.find(j => j.id === id);
    update(ref(db, `jobs/${id}`), { status });
    logActivity('UPDATE', 'ORDER', `อัปเดตสถานะงาน: ${oldData?.status} -> ${status}`, id, { status: oldData?.status }, { status });
  };
  const deleteJob = (id: string) => {
    const oldData = jobs.find(j => j.id === id);
    remove(ref(db, `jobs/${id}`));
    logActivity('DELETE', 'ORDER', `ลบงานติดตาม ID: ${id}`, id, oldData, undefined);
  };

  // Sales
  const addPurchase = (data: Omit<Purchase, 'id'>) => {
    const newRef = push(ref(db, 'purchases'));
    const payload = cleanForFirebase({ ...data, id: newRef.key });
    set(newRef, payload);
    
    data.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
            const oldStock = product.stock;
            const newStock = Math.max(0, product.stock - item.quantity);
            update(ref(db, `products/${product.id}`), { stock: newStock });
            logActivity('UPDATE', 'STOCK', `ตัดสต็อกขาย: ${product.name}`, product.id, { stock: oldStock }, { stock: newStock });
        }
    });

    // Auto Journal Logic ...
    const totalAmount = data.total;
    const vatAmount = settings.enableVat ? (totalAmount * 7 / 107) : 0;
    const revenueAmount = totalAmount - vatAmount;

    const cashAcc = getAcc('1001'); 
    const revAcc = getAcc('4001'); 
    const vatAcc = getAcc('2002'); 

    if (cashAcc && revAcc) {
        const lines: JournalLine[] = [
            { accountId: cashAcc.id, accountName: cashAcc.name, debit: totalAmount, credit: 0 },
            { accountId: revAcc.id, accountName: revAcc.name, debit: 0, credit: revenueAmount }
        ];
        if (vatAcc && vatAmount > 0) {
            lines.push({ accountId: vatAcc.id, accountName: vatAcc.name, debit: 0, credit: vatAmount });
        }

        addJournalEntry({
            date: data.date,
            reference: `POS-${newRef.key?.substring(0,6)}`,
            description: `ยอดขายหน้าร้าน`,
            totalAmount: totalAmount,
            status: 'posted',
            moduleSource: 'sales',
            lines
        });
    }

    if (settings.enablePoints && settings.earnRate > 0) {
        const pointsEarned = Math.floor(data.total / settings.earnRate);
        if (pointsEarned > 0) {
            adjustPoints(data.customerId, pointsEarned, 'earn', `ซื้อสินค้าหน้าร้าน`, newRef.key as string);
        }
    }
    logActivity('CREATE', 'INVOICE', `ขายสินค้าหน้าร้าน Total: ${data.total}`, newRef.key as string, undefined, payload);
  };

  const deletePurchase = (id: string) => {
      const purchase = purchases.find(p => p.id === id);
      if (purchase) {
          purchase.items.forEach(item => {
              const product = products.find(p => p.id === item.productId);
              if (product) {
                  update(ref(db, `products/${product.id}`), { stock: product.stock + item.quantity });
                  logActivity('UPDATE', 'STOCK', `คืนสต็อก (ลบรายการขาย): ${product.name}`, product.id, { stock: product.stock }, { stock: product.stock + item.quantity });
              }
          });

          if (settings.enablePoints && settings.earnRate > 0) {
            const pointsEarned = Math.floor(purchase.total / settings.earnRate);
            if (pointsEarned > 0) {
                adjustPoints(purchase.customerId, -pointsEarned, 'adjust', 'หักแต้มคืนจากการลบรายการขาย', id);
            }
        }
      }
      remove(ref(db, `purchases/${id}`));
      logActivity('DELETE', 'INVOICE', `ลบรายการขาย ID: ${id}`, id, purchase, undefined);
  };

  // Payments
  const addPayment = (data: Omit<PaymentHistory, 'id'>) => {
      const newRef = push(ref(db, 'paymentHistory'));
      const payload = cleanForFirebase({ ...data, id: newRef.key });
      set(newRef, payload);
      
      const prescription = prescriptions.find(p => p.id === data.prescriptionId);
      if (prescription) {
          const newDeposit = prescription.payment.deposit + data.amount;
          const newRemaining = prescription.payment.remaining - data.amount;
          update(ref(db, `prescriptions/${prescription.id}/payment`), {
              deposit: newDeposit,
              remaining: newRemaining
          });
      }

      // Auto Journal Logic ...
      const cashAcc = data.method === 'โอนเงิน' || data.method === 'บัตรเครดิต' ? getAcc('1002') : getAcc('1001');
      const arAcc = getAcc('1200');

      if (cashAcc && arAcc) {
          addJournalEntry({
              date: data.date,
              reference: `RC-${newRef.key?.substring(0,6)}`,
              description: `รับชำระเงินจากลูกค้า: ${data.method}`,
              totalAmount: data.amount,
              status: 'posted',
              moduleSource: 'sales',
              lines: [
                  { accountId: cashAcc.id, accountName: cashAcc.name, debit: data.amount, credit: 0 },
                  { accountId: arAcc.id, accountName: arAcc.name, debit: 0, credit: data.amount }
              ]
          });
      }

      if (settings.enablePoints && settings.earnRate > 0) {
          const pointsEarned = Math.floor(data.amount / settings.earnRate);
          if (pointsEarned > 0) {
              adjustPoints(data.customerId, pointsEarned, 'earn', `ชำระค่าบริการ`, newRef.key as string);
          }
      }
      logActivity('CREATE', 'INVOICE', `รับชำระเงิน: ${data.amount}`, newRef.key as string, undefined, payload);
  };

  const updatePayment = (id: string, data: Partial<PaymentHistory>) => {
      const oldPayment = paymentHistory.find(p => p.id === id);
      if (!oldPayment) return;
      
      update(ref(db, `paymentHistory/${id}`), cleanForFirebase(data));

      if (data.amount !== undefined && data.amount !== oldPayment.amount) {
          const prescription = prescriptions.find(p => p.id === oldPayment.prescriptionId);
          if (prescription) {
              const diff = data.amount - oldPayment.amount;
              update(ref(db, `prescriptions/${prescription.id}/payment`), {
                  deposit: prescription.payment.deposit + diff,
                  remaining: prescription.payment.remaining - diff
              });
          }
      }
      logActivity('UPDATE', 'INVOICE', `แก้ไขการชำระเงิน ID: ${id}`, id, oldPayment, data);
  };

  const deletePayment = (id: string) => {
      const payment = paymentHistory.find(p => p.id === id);
      if (payment) {
          const prescription = prescriptions.find(p => p.id === payment.prescriptionId);
          if (prescription) {
              update(ref(db, `prescriptions/${prescription.id}/payment`), {
                  deposit: prescription.payment.deposit - payment.amount,
                  remaining: prescription.payment.remaining + payment.amount
              });
          }

          if (settings.enablePoints && settings.earnRate > 0) {
              const pointsEarned = Math.floor(payment.amount / settings.earnRate);
              if (pointsEarned > 0) {
                  adjustPoints(payment.customerId, -pointsEarned, 'adjust', 'หักแต้มคืนจากการลบการชำระเงิน', id);
              }
          }
      }
      remove(ref(db, `paymentHistory/${id}`));
      logActivity('DELETE', 'INVOICE', `ลบการชำระเงิน ID: ${id}`, id, payment, undefined);
  };

  // Installments
  const addInstallment = (data: Omit<InstallmentPlan, 'id'>) => {
      const newRef = push(ref(db, 'installments'));
      const payload = cleanForFirebase({ ...data, id: newRef.key });
      set(newRef, payload);
      logActivity('CREATE', 'ORDER', `สร้างแผนผ่อนชำระใหม่`, newRef.key as string, undefined, payload);
      
      if (data.downPayment > 0) {
          const paymentRef = push(ref(db, 'paymentHistory'));
          set(paymentRef, cleanForFirebase({
              id: paymentRef.key,
              installmentId: newRef.key,
              customerId: data.customerId,
              date: new Date().toISOString().split('T')[0],
              time: new Date().toTimeString().slice(0,5),
              amount: data.downPayment,
              method: 'เงินสด', 
              type: 'deposit',
              note: 'เงินดาวน์ผ่อนชำระ',
              recordedBy: auth.currentUser?.displayName || 'system'
          }));
      }
  };

  const payInstallment = (planId: string, term: number, amount: number, method: string) => {
      const plan = installments.find(p => p.id === planId);
      if (!plan) return;

      const newSchedules = plan.schedules.map(s => {
          if (s.term === term) {
              return { ...s, status: 'paid' as const, paidDate: new Date().toISOString() };
          }
          return s;
      });

      const allPaid = newSchedules.every(s => s.status === 'paid');
      const newStatus = allPaid ? 'completed' : 'active';

      update(ref(db, `installments/${planId}`), cleanForFirebase({
          schedules: newSchedules,
          status: newStatus
      }));

      const paymentRef = push(ref(db, 'paymentHistory'));
      set(paymentRef, cleanForFirebase({
          id: paymentRef.key,
          installmentId: planId,
          customerId: plan.customerId,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().slice(0,5),
          amount: amount,
          method: method,
          type: 'installment',
          note: `ชำระงวดที่ ${term}/${plan.months}`,
          recordedBy: auth.currentUser?.displayName || 'system'
      }));

      // Auto Journal Logic ...
      const cashAcc = method === 'โอนเงิน' || method === 'บัตรเครดิต' ? getAcc('1002') : getAcc('1001');
      const arAcc = getAcc('1200'); 
      
      if (cashAcc && arAcc) {
          addJournalEntry({
              date: new Date().toISOString().split('T')[0],
              reference: `INST-${String(planId || '').substring(0,4)}-${term}`,
              description: `ชำระค่างวดที่ ${term}`,
              totalAmount: amount,
              status: 'posted',
              moduleSource: 'sales',
              lines: [
                  { accountId: cashAcc.id, accountName: cashAcc.name, debit: amount, credit: 0 },
                  { accountId: arAcc.id, accountName: arAcc.name, debit: 0, credit: amount }
              ]
          });
      }

      if (settings.enablePoints && settings.earnRate > 0) {
          const pointsEarned = Math.floor(amount / settings.earnRate);
          if (pointsEarned > 0) {
              adjustPoints(plan.customerId, pointsEarned, 'earn', `ผ่อนชำระงวดที่ ${term}`, paymentRef.key as string);
          }
      }

      logActivity('UPDATE', 'INVOICE', `ชำระค่างวดผ่อนชำระ งวดที่ ${term}`, planId, undefined, { term, amount, method });
  };

  const deleteInstallment = (id: string) => {
      const oldData = installments.find(p => p.id === id);
      remove(ref(db, `installments/${id}`));
      logActivity('DELETE', 'ORDER', `ลบแผนผ่อนชำระ ID: ${id}`, id, oldData, undefined);
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
      update(ref(db, 'settings'), cleanForFirebase(newSettings));
      logActivity('UPDATE', 'SETTINGS', 'อัปเดตการตั้งค่าระบบ', undefined, settings, newSettings);
  };

  const resetData = async () => {
      await remove(ref(db, 'customers'));
      await remove(ref(db, 'products'));
      await remove(ref(db, 'prescriptions'));
      await remove(ref(db, 'appointments'));
      await remove(ref(db, 'jobs'));
      await remove(ref(db, 'purchases'));
      await remove(ref(db, 'paymentHistory'));
      await remove(ref(db, 'pointTransactions'));
      await remove(ref(db, 'promotions'));
      await remove(ref(db, 'installments'));
      // Accounting Clear
      await remove(ref(db, 'journalEntries'));
      await remove(ref(db, 'accountingPeriods'));
      // Keep logs if possible or clear depending on requirement. Here we log the reset action.
      logActivity('DELETE', 'SETTINGS', 'Factory Reset Performed (All data cleared)', undefined, undefined, undefined);
  };

  const clearSystemLogs = async () => {
      await remove(ref(db, 'systemLogs'));
      await remove(ref(db, 'activity_logs')); // Clear new logs too
      logAction('CLEAR_LOGS', 'System logs cleared');
  };

  const importData = async (backupData: any) => {
    if (!backupData || typeof backupData !== 'object') {
        throw new Error('รูปแบบไฟล์ไม่ถูกต้อง (Invalid JSON format)');
    }

    const collections = ['customers', 'products', 'prescriptions', 'appointments', 'jobs', 'purchases', 'paymentHistory', 'pointTransactions', 'settings', 'promotions', 'installments', 'accounts', 'journalEntries', 'accountingPeriods'];
    const updates: any = {};
    let hasData = false;

    collections.forEach(key => {
        if (backupData[key] !== undefined) {
            updates[key] = cleanForFirebase(backupData[key]);
            hasData = true;
        } else {
            updates[key] = null; 
        }
    });

    if (!hasData) throw new Error('ไม่พบข้อมูลที่สามารถกู้คืนได้ในไฟล์นี้');

    await update(ref(db), updates);
    logActivity('UPDATE', 'SETTINGS', 'กู้คืนข้อมูลจากไฟล์ Backup', undefined, undefined, { importDate: new Date().toISOString() });
  };

  // Expose manual logging for UI components (e.g., View, Print)
  const logManualActivity = (action: LogActionType, module: LogModule, description: string, refId?: string, oldData?: any, newData?: any) => {
      logActivity(action, module, description, refId, oldData, newData);
  }

  return (
    <DataContext.Provider value={{
      customers, products, prescriptions, appointments, jobs, purchases, paymentHistory, pointTransactions, systemLogs, activityLogs, settings, promotions, installments,
      accounts, journalEntries, accountingPeriods,
      addCustomer, updateCustomer, deleteCustomer,
      addProduct, updateProduct, deleteProduct,
      addPrescription, updatePrescription, deletePrescription,
      addAppointment, updateAppointment, deleteAppointment,
      addJob, updateJobStatus, deleteJob,
      addPurchase, deletePurchase, addPayment, updatePayment, deletePayment,
      addInstallment, payInstallment, deleteInstallment,
      addPromotion, updatePromotion, deletePromotion, calculateAvailablePromotions,
      adjustPoints, recalculatePoints, recalculateAllPoints,
      updateSettings, resetData, importData, clearSystemLogs,
      getNextDocumentId, incrementDocumentId,
      addJournalEntry, updateJournalEntry, deleteJournalEntry, closeAccountingPeriod, reopenAccountingPeriod,
      logManualActivity
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
