
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { 
  TrendingUp, TrendingDown, DollarSign, Wallet,
  Calendar, Clock, Save, History, FileText, ArrowUpRight, ArrowDownLeft, Filter, PieChart, CreditCard, Tag, AlignLeft,
  Pencil, Trash2, X, Download, Printer, Search, ChevronLeft, ChevronRight, User
} from 'lucide-react';
import { JournalLine, JournalEntry } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';

// --- Predefined Options ---
const OPTICAL_EXPENSES = [
    'ต้นทุนกรอบแว่น (Frame Cost)',
    'ต้นทุนเลนส์ (Lens Cost)',
    'ต้นทุนคอนแทคเลนส์',
    'วัสดุสิ้นเปลือง/อะไหล่',
    'ค่าเช่าร้าน (Rent)',
    'ค่าน้ำ/ค่าไฟ (Utilities)',
    'เงินเดือนพนักงาน (Salary)',
    'ค่าการตลาด/โฆษณา',
    'ซ่อมบำรุงอุปกรณ์',
    'เบ็ดเตล็ดทั่วไป'
];

const OPTICAL_REVENUES = [
    'ขายสินค้าหน้าร้าน',
    'ค่าบริการซ่อม/ดัดแว่น',
    'ค่าตรวจวัดสายตา',
    'ดอกเบี้ยรับ',
    'เงินคืน/ส่วนลดรับ',
    'รายได้อื่นๆ'
];

const PAYMENT_CHANNELS = [
    'เงินสด (Cash)',
    'โอนเงิน (Transfer)',
    'บัตรเครดิต (Credit Card)',
    'สแกนจ่าย (PromptPay)',
];

const Cashflow = () => {
  const { journalEntries, accounts, addJournalEntry, updateJournalEntry, deleteJournalEntry, settings } = useData();
  const { addToast } = useToast();

  // Navigation State
  const [activeView, setActiveView] = useState<'record' | 'history'>('record');

  // Input Form State
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [txForm, setTxForm] = useState({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0,5),
      title: '',
      amount: '',
      categoryId: '',
      categoryText: '',
      paymentMethod: 'เงินสด (Cash)',
      paymentText: '',
      note: ''
  });
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isCustomPayment, setIsCustomPayment] = useState(false);

  // History Filter State
  const [historySearch, setHistorySearch] = useState('');
  const [dateRange, setDateRange] = useState({
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // First day of month
      end: new Date().toISOString().split('T')[0]
  });
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // --- Accounts Mapping ---
  const expenseAcc = accounts.find(a => a.type === 'Expense') || accounts[0];
  const revenueAcc = accounts.find(a => a.type === 'Revenue') || accounts[0];
  const cashAcc = accounts.find(a => a.code === '1001') || accounts.find(a => a.name.includes('Cash')) || accounts[0];
  const bankAcc = accounts.find(a => a.code === '1002') || accounts.find(a => a.name.includes('Bank')) || accounts[0];

  // --- Processed Data for History View ---
  const processedHistoryData = useMemo(() => {
      // 1. Map entries to a flat structure
      let data = journalEntries
          .filter(e => e.moduleSource === 'manual' && e.status === 'posted')
          .map(entry => {
              let type: 'income' | 'expense' = 'expense';
              let amount = 0;
              let category = '';
              let payment = '';
              
              // Analyze lines
              for (const line of entry.lines) {
                  const acc = accounts.find(a => a.id === line.accountId);
                  if (acc?.type === 'Expense' && line.debit > 0) {
                      type = 'expense';
                      amount = line.debit;
                      category = line.accountName;
                  } else if (acc?.type === 'Revenue' && line.credit > 0) {
                      type = 'income';
                      amount = line.credit;
                      category = line.accountName;
                  } else if (acc?.type === 'Asset') {
                      const match = line.accountName.match(/\(([^)]+)\)/);
                      payment = match ? match[1] : 'เงินสด (Cash)';
                  }
              }

              return {
                  id: entry.id,
                  reference: entry.reference,
                  date: entry.date,
                  title: entry.description,
                  type,
                  amount,
                  category,
                  payment,
                  createdBy: entry.createdBy,
                  rawData: entry
              };
          });

      // 2. Apply Filters
      // Date Range
      if (dateRange.start) {
          data = data.filter(d => d.date >= dateRange.start);
      }
      if (dateRange.end) {
          data = data.filter(d => d.date <= dateRange.end);
      }

      // Type Filter
      if (filterType !== 'all') {
          data = data.filter(d => (d.type as string) === filterType);
      }

      // Search Filter
      if ((historySearch || '').trim()) {
          const lowerSearch = (historySearch || '').toLowerCase();
          data = data.filter(d => 
              (d.reference || '').toLowerCase().includes(lowerSearch) ||
              (d.title || '').toLowerCase().includes(lowerSearch) ||
              (d.category || '').toLowerCase().includes(lowerSearch) ||
              (d.createdBy || '').toLowerCase().includes(lowerSearch)
          );
      }

      // Sort by Date Desc
      return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [journalEntries, accounts, dateRange, filterType, historySearch]);

  // --- History Stats Calculation ---
  const historyStats = useMemo(() => {
      const income = processedHistoryData.filter(d => d.type === 'income').reduce((sum, d) => sum + d.amount, 0);
      const expense = processedHistoryData.filter(d => d.type === 'expense').reduce((sum, d) => sum + d.amount, 0);
      return { income, expense, balance: income - expense };
  }, [processedHistoryData]);

  // --- Recent Manual Transactions (For Record View) ---
  const groupedTransactions = useMemo(() => {
      const filtered = journalEntries
          .filter(entry => entry.moduleSource === 'manual')
          .sort((a,b) => new Date(b.date + 'T' + (b.createdAt || '00:00')).getTime() - new Date(a.date + 'T' + (a.createdAt || '00:00')).getTime())
          .slice(0, 20); // Last 20 items

      const groups: Record<string, JournalEntry[]> = {};
      
      filtered.forEach(tx => {
          const dateKey = tx.date;
          if (!groups[dateKey]) groups[dateKey] = [];
          groups[dateKey].push(tx);
      });

      return groups;
  }, [journalEntries]);

  // --- Monthly Stats (For Header) ---
  const monthlyStats = useMemo(() => {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      let income = 0;
      let expense = 0;

      journalEntries.forEach(entry => {
          const entryDate = new Date(entry.date);
          if (entryDate.getMonth() + 1 === currentMonth && entryDate.getFullYear() === currentYear && entry.status === 'posted') {
              entry.lines.forEach(line => {
                  const acc = accounts.find(a => a.id === line.accountId);
                  if (acc?.type === 'Revenue') income += line.credit - line.debit;
                  if (acc?.type === 'Expense') expense += line.debit - line.credit;
              });
          }
      });

      return { income, expense, balance: income - expense };
  }, [journalEntries, accounts]);

  // --- Handlers ---
  const handleTxSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const amount = Number(txForm.amount);
      if (amount <= 0) {
          addToast('ข้อมูลไม่ถูกต้อง', 'กรุณาระบุจำนวนเงิน', 'error');
          return;
      }

      // GL Account Selection Logic
      let assetAccount = cashAcc;
      const pMethod = isCustomPayment ? txForm.paymentText : txForm.paymentMethod;
      if (pMethod.includes('โอน') || pMethod.includes('Transfer') || pMethod.includes('บัตร') || pMethod.includes('Credit') || pMethod.includes('PromptPay')) {
          assetAccount = bankAcc;
      }

      const targetAccount = (txType as string) === 'expense' ? expenseAcc : revenueAcc;
      const categoryName = isCustomCategory ? txForm.categoryText : txForm.categoryText || ((txType as string) === 'expense' ? OPTICAL_EXPENSES[0] : OPTICAL_REVENUES[0]);

      if (!targetAccount || !assetAccount) {
          addToast('ผิดพลาด', 'ไม่พบบัญชีอ้างอิงในระบบ', 'error');
          return;
      }

      const lines: JournalLine[] = [];
      if (txType === 'expense') {
          lines.push({ accountId: targetAccount.id, accountName: categoryName, debit: amount, credit: 0 });
          lines.push({ accountId: assetAccount.id, accountName: `${assetAccount.name} (${pMethod})`, debit: 0, credit: amount });
      } else {
          lines.push({ accountId: assetAccount.id, accountName: `${assetAccount.name} (${pMethod})`, debit: amount, credit: 0 });
          lines.push({ accountId: targetAccount.id, accountName: categoryName, debit: 0, credit: amount });
      }

      const payload = {
          date: txForm.date,
          reference: editingId ? undefined : `${txType === 'expense' ? 'EXP' : 'INC'}-${new Date().getTime().toString().substr(-6)}`,
          description: txForm.title || categoryName,
          totalAmount: amount,
          status: 'posted' as const,
          moduleSource: 'manual' as const,
          lines: lines
      };

      try {
          if (editingId) {
              updateJournalEntry(editingId, payload);
              addToast('แก้ไขสำเร็จ', 'อัปเดตรายการเรียบร้อยแล้ว');
              setEditingId(null);
          } else {
              addJournalEntry(payload as any);
              addToast('บันทึกสำเร็จ', 'บันทึกรายการเรียบร้อยแล้ว');
          }
          resetForm();
      } catch (error: any) {
          addToast('บันทึกไม่สำเร็จ', error.message || 'เกิดข้อผิดพลาด', 'error');
      }
  };

  const handleEdit = (tx: any) => {
      let type: 'income' | 'expense' = 'expense';
      let amount = 0;
      let categoryName = '';
      let paymentName = '';

      for (const line of tx.lines) {
          const acc = accounts.find(a => a.id === line.accountId);
          if (acc?.type === 'Expense' && line.debit > 0) {
              type = 'expense';
              amount = line.debit;
              categoryName = line.accountName;
          } else if (acc?.type === 'Revenue' && line.credit > 0) {
              type = 'income';
              amount = line.credit;
              categoryName = line.accountName;
          } else if (acc?.type === 'Asset') {
              const match = line.accountName.match(/\(([^)]+)\)/);
              paymentName = match ? match[1] : 'เงินสด (Cash)';
          }
      }

      setTxType(type);
      setEditingId(tx.id);
      setIsCustomCategory(!((type === 'expense' ? OPTICAL_EXPENSES : OPTICAL_REVENUES).includes(categoryName)));
      setIsCustomPayment(!PAYMENT_CHANNELS.some(p => p.includes(paymentName)));

      setTxForm({
          date: tx.date,
          time: new Date().toTimeString().slice(0,5),
          title: tx.description,
          amount: amount.toString(),
          categoryId: '',
          categoryText: categoryName,
          paymentMethod: PAYMENT_CHANNELS.find(p => p.includes(paymentName)) || PAYMENT_CHANNELS[0],
          paymentText: paymentName,
          note: ''
      });
      
      setActiveView('record'); // Switch to record view to edit
  };

  const resetForm = () => {
      setEditingId(null);
      setTxForm(prev => ({ 
          ...prev, amount: '', title: '', note: '', categoryText: '', paymentText: ''
      }));
      setIsCustomCategory(false);
      setIsCustomPayment(false);
  };

  const confirmDelete = () => {
      if (deleteId) {
          deleteJournalEntry(deleteId);
          addToast('ลบสำเร็จ', 'ลบรายการเรียบร้อยแล้ว');
          setDeleteId(null);
          if (editingId === deleteId) resetForm();
      }
  };

  const setPresetDate = (type: 'today' | 'week' | 'month' | 'year') => {
      const now = new Date();
      const end = now.toISOString().split('T')[0];
      let start = end;

      if (type === 'week') {
          const d = new Date(now);
          const day = d.getDay();
          const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
          d.setDate(diff);
          start = d.toISOString().split('T')[0];
      } else if (type === 'month') {
          start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      } else if (type === 'year') {
          start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      }
      
      setDateRange({ start, end });
      setCurrentPage(1);
  };

  const handleExportCSV = () => {
      const csvContent = "data:text/csv;charset=utf-8," 
          + "Date,Reference,Description,Type,Category,Amount,Payment,Recorder\n"
          + processedHistoryData.map(e => 
              `${e.date},${e.reference},"${e.title}",${e.type},"${e.category}",${e.amount},"${e.payment}",${e.createdBy}`
          ).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `cashflow_history_${dateRange.start}_${dateRange.end}.csv`);
      document.body.appendChild(link);
      link.click();
  };

  const handlePrint = () => {
      const w = window.open('', '_blank', 'width=1000,height=800');
      if (w) {
          const html = `
            <html>
                <head>
                    <title>รายงานรับ-จ่าย</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        h2, p { text-align: center; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
                        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                        th { background: #f0f0f0; }
                        .amount { text-align: right; }
                        .inc { color: green; }
                        .exp { color: red; }
                        .summary { display: flex; justify-content: space-between; margin-bottom: 20px; border: 1px solid #ddd; padding: 10px; }
                    </style>
                </head>
                <body>
                    <h2>รายงานสรุปรายรับ-รายจ่าย</h2>
                    <p>ร้าน ${settings.shopName} | วันที่ ${new Date(dateRange.start).toLocaleDateString('th-TH')} - ${new Date(dateRange.end).toLocaleDateString('th-TH')}</p>
                    
                    <div class="summary">
                        <div><strong>รายรับรวม:</strong> ${historyStats.income.toLocaleString()}</div>
                        <div><strong>รายจ่ายรวม:</strong> ${historyStats.expense.toLocaleString()}</div>
                        <div><strong>คงเหลือสุทธิ:</strong> ${historyStats.balance.toLocaleString()}</div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>วันที่</th>
                                <th>เลขที่</th>
                                <th>รายการ</th>
                                <th>หมวดหมู่</th>
                                <th>ผู้บันทึก</th>
                                <th class="amount">จำนวนเงิน</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${processedHistoryData.map(d => `
                                <tr>
                                    <td>${new Date(d.date).toLocaleDateString('th-TH')}</td>
                                    <td>${d.reference}</td>
                                    <td>${d.title}</td>
                                    <td>${d.category}</td>
                                    <td>${d.createdBy}</td>
                                    <td class="amount ${d.type === 'income' ? 'inc' : 'exp'}">
                                        ${d.type === 'income' ? '+' : '-'}${d.amount.toLocaleString()}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
            </html>
          `;
          w.document.write(html);
          w.document.close();
          setTimeout(() => w.print(), 500);
      }
  };

  const getDayLabel = (dateStr: string) => {
      const date = new Date(dateStr);
      const today = new Date();
      if (date.toDateString() === today.toDateString()) return 'วันนี้ (Today)';
      return date.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  // Pagination Logic
  const totalPages = Math.ceil(processedHistoryData.length / itemsPerPage);
  const paginatedData = processedHistoryData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 h-full flex flex-col w-full mx-auto">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
              <div className="p-2 bg-slate-900 rounded-xl text-white shadow-lg shadow-slate-200">
                  <Wallet className="w-6 h-6" />
              </div>
              <div>
                  <h1 className="text-2xl font-bold text-slate-800">Cashflow</h1>
                  <div className="flex gap-4 text-sm mt-1">
                      <button 
                          onClick={() => setActiveView('record')}
                          className={`font-medium transition-colors ${activeView === 'record' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                          บันทึกรายการ (Entry)
                      </button>
                      <button 
                          onClick={() => setActiveView('history')}
                          className={`font-medium transition-colors ${activeView === 'history' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                          ประวัติย้อนหลัง (History)
                      </button>
                  </div>
              </div>
          </div>
          
          {/* Quick Stats Cards (Visible on both views) */}
          <div className="flex gap-4">
              <div className="px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-100 text-right">
                  <p className="text-[10px] text-emerald-600 uppercase font-bold">รายรับเดือนนี้</p>
                  <p className="text-lg font-bold text-emerald-700">฿{monthlyStats.income.toLocaleString()}</p>
              </div>
              <div className="px-4 py-2 bg-rose-50 rounded-lg border border-rose-100 text-right">
                  <p className="text-[10px] text-rose-600 uppercase font-bold">รายจ่ายเดือนนี้</p>
                  <p className="text-lg font-bold text-rose-700">฿{monthlyStats.expense.toLocaleString()}</p>
              </div>
          </div>
      </div>

      {activeView === 'record' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start animate-in fade-in slide-in-from-left-4 duration-300">
              {/* LEFT: Input Form (5 Cols) */}
              <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-slate-800">{editingId ? 'แก้ไขรายการ' : 'บันทึกรายการใหม่'}</h3>
                      {editingId && (
                          <button onClick={resetForm} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                              <X className="w-3 h-3" /> ยกเลิกแก้ไข
                          </button>
                      )}
                  </div>
                  
                  <div className="px-6 pt-4">
                      {/* Segmented Control */}
                      <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                          <button 
                              onClick={() => setTxType('expense')}
                              className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                                  txType === 'expense' 
                                  ? 'bg-white text-rose-600 shadow-sm ring-1 ring-black/5' 
                                  : 'text-slate-500 hover:text-slate-700'
                              }`}
                          >
                              <ArrowUpRight className="w-4 h-4"/> รายจ่าย (Expense)
                          </button>
                          <button 
                              onClick={() => setTxType('income')}
                              className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                                  txType === 'income' 
                                  ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5' 
                                  : 'text-slate-500 hover:text-slate-700'
                              }`}
                          >
                              <ArrowDownLeft className="w-4 h-4"/> รายรับ (Income)
                          </button>
                      </div>
                  </div>

                  <form onSubmit={handleTxSubmit} className="p-6 space-y-6">
                      {/* Amount Input */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">จำนวนเงิน (Amount)</label>
                          <div className="relative group">
                              <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors ${txType === 'expense' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                  <DollarSign className="w-8 h-8" />
                              </div>
                              <input 
                                  type="number" min="0" step="0.01" required
                                  autoFocus={!editingId}
                                  className={`w-full pl-14 pr-4 py-4 text-4xl font-bold bg-slate-50 border rounded-2xl focus:outline-none focus:ring-4 transition-all focus:bg-white ${
                                      txType === 'expense' 
                                      ? 'border-slate-200 text-rose-600 focus:ring-rose-100 focus:border-rose-300 placeholder:text-rose-200' 
                                      : 'border-slate-200 text-emerald-600 focus:ring-emerald-100 focus:border-emerald-300 placeholder:text-emerald-200'
                                  }`}
                                  placeholder="0.00"
                                  value={txForm.amount}
                                  onChange={e => setTxForm({...txForm, amount: e.target.value})}
                              />
                          </div>
                      </div>

                      {/* Title */}
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">หัวข้อรายการ</label>
                          <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                  <FileText className="w-4 h-4" />
                              </div>
                              <input 
                                  type="text" required
                                  className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors"
                                  placeholder={txType === 'expense' ? 'เช่น จ่ายค่าไฟฟ้า, ซื้ออุปกรณ์' : 'เช่น ขายเศษวัสดุ, ดอกเบี้ยรับ'}
                                  value={txForm.title}
                                  onChange={e => setTxForm({...txForm, title: e.target.value})}
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1.5">หมวดหมู่</label>
                              <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                      <Tag className="w-4 h-4" />
                                  </div>
                                  <select 
                                      className="w-full pl-10 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors appearance-none cursor-pointer"
                                      value={isCustomCategory ? '__other__' : txForm.categoryText}
                                      onChange={e => {
                                          if (e.target.value === '__other__') {
                                              setIsCustomCategory(true);
                                              setTxForm({...txForm, categoryText: ''});
                                          } else {
                                              setIsCustomCategory(false);
                                              setTxForm({...txForm, categoryText: e.target.value});
                                          }
                                      }}
                                  >
                                      <option value="" disabled>-- เลือกหมวดหมู่ --</option>
                                      {(txType === 'expense' ? OPTICAL_EXPENSES : OPTICAL_REVENUES).map(c => (
                                          <option key={c} value={c}>{c}</option>
                                      ))}
                                      <option value="__other__">อื่นๆ (ระบุเอง)</option>
                                  </select>
                                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                                      <Filter className="w-3 h-3 fill-current" />
                                  </div>
                              </div>
                              {isCustomCategory && (
                                  <input 
                                      type="text" 
                                      placeholder="ระบุหมวดหมู่..." 
                                      className="mt-2 w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                                      value={txForm.categoryText}
                                      onChange={e => setTxForm({...txForm, categoryText: e.target.value})}
                                      autoFocus
                                  />
                              )}
                          </div>
                          
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1.5">ช่องทางชำระเงิน</label>
                              <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                      <CreditCard className="w-4 h-4" />
                                  </div>
                                  <select 
                                      className="w-full pl-10 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors appearance-none cursor-pointer"
                                      value={isCustomPayment ? '__other__' : txForm.paymentMethod}
                                      onChange={e => {
                                          if (e.target.value === '__other__') {
                                              setIsCustomPayment(true);
                                              setTxForm({...txForm, paymentText: ''});
                                          } else {
                                              setIsCustomPayment(false);
                                              setTxForm({...txForm, paymentMethod: e.target.value, paymentText: e.target.value});
                                          }
                                      }}
                                  >
                                      {PAYMENT_CHANNELS.map(p => (
                                          <option key={p} value={p}>{p}</option>
                                      ))}
                                      <option value="__other__">อื่นๆ (ระบุเอง)</option>
                                  </select>
                                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                                      <Filter className="w-3 h-3 fill-current" />
                                  </div>
                              </div>
                              {isCustomPayment && (
                                  <input 
                                      type="text" 
                                      placeholder="ระบุช่องทาง..." 
                                      className="mt-2 w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                                      value={txForm.paymentText}
                                      onChange={e => setTxForm({...txForm, paymentText: e.target.value})}
                                      autoFocus
                                  />
                              )}
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-5">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1.5">วันที่</label>
                              <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                      <Calendar className="w-4 h-4" />
                                  </div>
                                  <input type="date" required 
                                      className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors" 
                                      value={txForm.date} onChange={e => setTxForm({...txForm, date: e.target.value})} />
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1.5">เวลา</label>
                              <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                      <Clock className="w-4 h-4" />
                                  </div>
                                  <input type="time" required 
                                      className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors" 
                                      value={txForm.time} onChange={e => setTxForm({...txForm, time: e.target.value})} />
                              </div>
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">หมายเหตุ (Optional)</label>
                          <div className="relative">
                              <div className="absolute top-3 left-3 flex items-start pointer-events-none text-slate-400">
                                  <AlignLeft className="w-4 h-4" />
                              </div>
                              <textarea 
                                  rows={2}
                                  className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors resize-none"
                                  placeholder="รายละเอียดเพิ่มเติม..."
                                  value={txForm.note}
                                  onChange={e => setTxForm({...txForm, note: e.target.value})}
                              />
                          </div>
                      </div>

                      <div className="pt-2">
                          <button 
                              type="submit" 
                              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 ${
                                  txType === 'expense' 
                                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' 
                                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                              }`}
                          >
                              <Save className="w-5 h-5"/> {editingId ? 'บันทึกการแก้ไข' : `บันทึก${txType === 'expense' ? 'รายจ่าย' : 'รายรับ'}`}
                          </button>
                      </div>
                  </form>
              </div>

              {/* RIGHT: History List (7 Cols) */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden h-[calc(100vh-200px)] lg:h-auto lg:min-h-[700px]">
                  <div className="p-5 border-b border-slate-100 bg-white flex items-center gap-2 sticky top-0 z-10">
                      <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><History className="w-5 h-5" /></div>
                      <div>
                          <h3 className="font-bold text-slate-800">ประวัติรายการล่าสุด</h3>
                          <p className="text-xs text-slate-500">แสดงรายการล่าสุด 20 รายการ</p>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-0 custom-scrollbar bg-slate-50">
                      {Object.entries(groupedTransactions).map(([date, transactions]) => (
                          <div key={date} className="mb-6 last:mb-0">
                              <div className="sticky top-0 z-0 bg-slate-50/95 backdrop-blur px-5 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100/50">
                                  <Calendar className="w-3 h-3"/> {getDayLabel(date)}
                              </div>
                              <div className="bg-white border-y border-slate-100 divide-y divide-slate-50">
                                  {transactions.map(tx => {
                                      let type: 'income' | 'expense' = 'expense';
                                      let amount = 0;
                                      let accName = '';
                                      let paymentMethod = '';

                                      tx.lines.forEach(line => {
                                          const acc = accounts.find(a => a.id === line.accountId);
                                          if (acc?.type === 'Expense' && line.debit > 0) {
                                              type = 'expense';
                                              amount = line.debit;
                                              accName = line.accountName;
                                          } else if (acc?.type === 'Revenue' && line.credit > 0) {
                                              type = 'income';
                                              amount = line.credit;
                                              accName = line.accountName;
                                          } else if (acc?.type === 'Asset') {
                                              paymentMethod = line.accountName;
                                          }
                                      });

                                      return (
                                          <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group relative">
                                              <div className="flex items-center gap-4">
                                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${type === 'expense' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                      {type === 'expense' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                                                  </div>
                                                  <div>
                                                      <div className="font-bold text-slate-800 text-sm">{tx.description}</div>
                                                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium border border-slate-200">{accName}</span>
                                                          <span className="text-slate-300">•</span>
                                                          <span>{new Date(tx.date).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</span>
                                                          <span className="text-slate-300">•</span>
                                                          <span>{paymentMethod}</span>
                                                      </div>
                                                      {tx.createdAt && <div className="text-[10px] text-slate-400 mt-0.5 hidden group-hover:block">Ref: {tx.reference}</div>}
                                                  </div>
                                              </div>
                                              <div className="text-right">
                                                  <div className={`font-bold text-base ${type === 'expense' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                      {type === 'expense' ? '-' : '+'}฿{amount.toLocaleString()}
                                                  </div>
                                                  
                                                  <div className="flex gap-2 justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                      <button 
                                                          onClick={() => handleEdit(tx)}
                                                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                          title="แก้ไข"
                                                      >
                                                          <Pencil className="w-3.5 h-3.5" />
                                                      </button>
                                                      <button 
                                                          onClick={() => setDeleteId(tx.id)}
                                                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                          title="ลบ"
                                                      >
                                                          <Trash2 className="w-3.5 h-3.5" />
                                                      </button>
                                                  </div>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      ))}
                      
                      {Object.keys(groupedTransactions).length === 0 && (
                          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                                  <History className="w-8 h-8 opacity-20" />
                              </div>
                              <p className="text-sm font-medium">ยังไม่มีรายการบันทึก</p>
                              <p className="text-xs mt-1">เริ่มบันทึกรายการแรกของคุณที่ฝั่งซ้าย</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      ) : (
          <div className="flex-1 flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* History View */}
              
              {/* Filters */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col lg:flex-row gap-4">
                  <div className="flex flex-col sm:flex-row gap-2 flex-1">
                      <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                              type="text" 
                              className="w-full pl-9 p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder="ค้นหาเลขที่, รายการ..."
                              value={historySearch}
                              onChange={e => setHistorySearch(e.target.value)}
                          />
                      </div>
                      <select 
                          className="p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                          value={filterType}
                          onChange={e => setFilterType(e.target.value as any)}
                      >
                          <option value="all">ทั้งหมด (All Types)</option>
                          <option value="income">รายรับ (Income)</option>
                          <option value="expense">รายจ่าย (Expense)</option>
                      </select>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 items-center">
                      <div className="flex bg-slate-100 p-1 rounded-lg">
                          {['today', 'week', 'month', 'year'].map((t) => (
                              <button
                                  key={t}
                                  onClick={() => setPresetDate(t as any)}
                                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm rounded-md transition-all"
                              >
                                  {t === 'today' ? 'วันนี้' : t === 'week' ? 'สัปดาห์นี้' : t === 'month' ? 'เดือนนี้' : 'ปีนี้'}
                              </button>
                          ))}
                      </div>
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
                          <input 
                              type="date" 
                              className="bg-transparent text-sm text-slate-700 outline-none"
                              value={dateRange.start}
                              onChange={e => setDateRange({...dateRange, start: e.target.value})}
                          />
                          <span className="text-slate-400">-</span>
                          <input 
                              type="date" 
                              className="bg-transparent text-sm text-slate-700 outline-none"
                              value={dateRange.end}
                              onChange={e => setDateRange({...dateRange, end: e.target.value})}
                          />
                      </div>
                  </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm flex justify-between items-center">
                      <div>
                          <p className="text-xs text-emerald-600 font-bold uppercase mb-1">รายรับรวม (Total Income)</p>
                          <h3 className="text-2xl font-bold text-emerald-700">฿{historyStats.income.toLocaleString()}</h3>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-full"><TrendingUp className="w-6 h-6 text-emerald-600"/></div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-rose-100 shadow-sm flex justify-between items-center">
                      <div>
                          <p className="text-xs text-rose-600 font-bold uppercase mb-1">รายจ่ายรวม (Total Expense)</p>
                          <h3 className="text-2xl font-bold text-rose-700">฿{historyStats.expense.toLocaleString()}</h3>
                      </div>
                      <div className="p-3 bg-rose-50 rounded-full"><TrendingDown className="w-6 h-6 text-rose-600"/></div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm flex justify-between items-center">
                      <div>
                          <p className="text-xs text-blue-600 font-bold uppercase mb-1">คงเหลือสุทธิ (Net Balance)</p>
                          <h3 className={`text-2xl font-bold ${historyStats.balance >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                              {historyStats.balance >= 0 ? '+' : ''}฿{historyStats.balance.toLocaleString()}
                          </h3>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-full"><Wallet className="w-6 h-6 text-blue-600"/></div>
                  </div>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                          <h3 className="font-bold text-slate-800">รายการเคลื่อนไหว (Transactions)</h3>
                          <p className="text-xs text-slate-500">ทั้งหมด {processedHistoryData.length} รายการ</p>
                      </div>
                      <div className="flex gap-2">
                          <button onClick={handlePrint} className="p-2 text-slate-600 hover:text-primary-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all" title="พิมพ์รายงาน">
                              <Printer className="w-4 h-4"/>
                          </button>
                          <button onClick={handleExportCSV} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all">
                              <Download className="w-4 h-4"/> Export CSV
                          </button>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-50 sticky top-0 z-10 text-xs font-bold text-slate-500 uppercase tracking-wider">
                              <tr>
                                  <th className="px-6 py-4 border-b border-slate-200">วันที่</th>
                                  <th className="px-6 py-4 border-b border-slate-200">เลขที่</th>
                                  <th className="px-6 py-4 border-b border-slate-200">รายการ</th>
                                  <th className="px-6 py-4 border-b border-slate-200">หมวดหมู่</th>
                                  <th className="px-6 py-4 border-b border-slate-200 text-right">จำนวนเงิน</th>
                                  <th className="px-6 py-4 border-b border-slate-200 text-center">ผู้บันทึก</th>
                                  <th className="px-6 py-4 border-b border-slate-200 text-right">จัดการ</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                              {paginatedData.length > 0 ? paginatedData.map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                      <td className="px-6 py-4 text-slate-600">
                                          {new Date(item.date).toLocaleDateString('th-TH', {day: '2-digit', month: 'short', year: '2-digit'})}
                                      </td>
                                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{item.reference}</td>
                                      <td className="px-6 py-4 font-medium text-slate-800">{item.title}</td>
                                      <td className="px-6 py-4">
                                          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs border border-slate-200">
                                              {item.category}
                                          </span>
                                      </td>
                                      <td className={`px-6 py-4 text-right font-bold ${(item.type as string) === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                          {(item.type as string) === 'income' ? '+' : '-'}฿{item.amount.toLocaleString()}
                                      </td>
                                      <td className="px-6 py-4 text-center text-xs text-slate-500">
                                          {item.createdBy || '-'}
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button 
                                                  onClick={() => {
                                                      handleEdit(item.rawData);
                                                      setActiveView('record');
                                                  }}
                                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                              >
                                                  <Pencil className="w-3.5 h-3.5"/>
                                              </button>
                                              <button 
                                                  onClick={() => setDeleteId(item.id)}
                                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                              >
                                                  <Trash2 className="w-3.5 h-3.5"/>
                                              </button>
                                          </div>
                                      </td>
                                  </tr>
                              )) : (
                                  <tr>
                                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                          ไม่พบข้อมูลตามเงื่อนไขที่ระบุ
                                      </td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>

                  {/* Pagination */}
                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                      <div className="text-xs text-slate-500">
                          แสดง {Math.min((currentPage - 1) * itemsPerPage + 1, processedHistoryData.length)} - {Math.min(currentPage * itemsPerPage, processedHistoryData.length)} จาก {processedHistoryData.length} รายการ
                      </div>
                      <div className="flex gap-2">
                          <button 
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                          >
                              <ChevronLeft className="w-4 h-4"/>
                          </button>
                          <div className="flex items-center px-4 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700">
                              {currentPage} / {totalPages || 1}
                          </div>
                          <button 
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              disabled={currentPage === totalPages || totalPages === 0}
                              className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                          >
                              <ChevronRight className="w-4 h-4"/>
                          </button>
                          <select 
                              className="ml-2 p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none"
                              value={itemsPerPage}
                              onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                          >
                              <option value={10}>10 / หน้า</option>
                              <option value={20}>20 / หน้า</option>
                              <option value={50}>50 / หน้า</option>
                              <option value={100}>100 / หน้า</option>
                          </select>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <ConfirmationModal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={confirmDelete}
          title="ลบรายการ"
          message="คุณต้องการลบรายการนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้"
          confirmText="ลบข้อมูล"
      />
    </div>
  );
};

export default Cashflow;
