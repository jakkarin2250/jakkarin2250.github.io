
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Customer, AppSettings } from '../types';
import { 
  FileText, Printer, Search, ChevronLeft, ChevronRight, Calendar, 
  CreditCard, FilePlus, FileMinus, FileCheck, ShoppingCart, Truck, Receipt, ShieldCheck, Glasses, Layers,
  Banknote, ArrowLeft, ArrowRight, User, LayoutGrid, CheckCircle2, SlidersHorizontal,
  Award, Star, Crown, Sparkles, Files, File, Filter, RotateCcw, X, Check
} from 'lucide-react';

interface DocumentsProps {
  initialCustomerId?: string | null;
  onBack?: () => void;
}

// Document Types Configuration
const DOC_TYPES = [
  { id: 'quotation', label: 'ใบเสนอราคา', sub: 'QUOTATION', icon: FileText },
  { id: 'deposit_receipt', label: 'ใบรับมัดจำ', sub: 'DEPOSIT RECEIPT', icon: Banknote },
  { id: 'purchase_order', label: 'ใบสั่งซื้อ', sub: 'PURCHASE ORDER', icon: ShoppingCart },
  { id: 'delivery_note', label: 'ใบส่งของ', sub: 'DELIVERY NOTE', icon: Truck },
  { id: 'invoice', label: 'ใบแจ้งหนี้', sub: 'INVOICE', icon: FileText },
  { id: 'receipt', label: 'ใบเสร็จรับเงิน', sub: 'RECEIPT', icon: Receipt },
  { id: 'tax_invoice', label: 'ใบกำกับภาษี', sub: 'TAX INVOICE', icon: FileCheck },
  { id: 'credit_note', label: 'ใบลดหนี้', sub: 'CREDIT NOTE', icon: FileMinus },
  { id: 'debit_note', label: 'ใบเพิ่มหนี้', sub: 'DEBIT NOTE', icon: FilePlus },
  // Optical Special
  { id: 'prescription', label: 'ใบตรวจวัดสายตา', sub: 'PRESCRIPTION', icon: Glasses, special: 'blue' },
  { id: 'lens_order', label: 'ใบสั่งตัดเลนส์', sub: 'LENS ORDER', icon: Layers, special: 'blue' },
  { id: 'warranty', label: 'ใบรับประกัน', sub: 'WARRANTY', icon: ShieldCheck, special: 'orange' },
];

const Documents = ({ initialCustomerId, onBack }: DocumentsProps) => {
  const { 
    customers, prescriptions, purchases, settings, 
    getNextDocumentId, incrementDocumentId 
  } = useData();
  const { addToast } = useToast();

  const [view, setView] = useState<'selection' | 'preview'>('selection');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  
  // Advanced Search
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
      dateFrom: '',
      dateTo: '',
      type: 'all',
      minAmount: '',
      maxAmount: ''
  });
  
  const [enableVat, setEnableVat] = useState(settings.enableVat || false);
  const [vatRate, setVatRate] = useState(settings.vatRate || 7);

  const [docType, setDocType] = useState<string>('');
  const [docDate, setDocDate] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [note, setNote] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');

  // Handle Initial Customer
  const currentCustomer = useMemo(() => {
      return initialCustomerId ? customers.find(c => c.id === initialCustomerId) : null;
  }, [initialCustomerId, customers]);

  useEffect(() => {
      if (currentCustomer) {
          setSearchTerm(currentCustomer.name || '');
      }
  }, [currentCustomer]);

  // Combine Transactions
  const allTransactions = useMemo(() => {
      const list: any[] = [];
      purchases.forEach(p => {
          list.push({
              id: p.id,
              originalId: p.id,
              type: 'purchase',
              date: p.date,
              customer: customers.find(c => String(c.id) === String(p.customerId)),
              detail: `สินค้าทั่วไป ${p.items.length} รายการ`,
              amount: p.total,
              status: 'ชำระครบ',
              items: p.items,
              rawData: p
          });
      });
      prescriptions.forEach(p => {
          const total = p.payment.framePrice + p.payment.lensPrice - p.payment.discount;
          const items = [];
          if (p.payment.framePrice > 0) items.push({ name: `กรอบแว่น ${p.frame.brand || ''} ${p.frame.style || ''}`, quantity: 1, price: p.payment.framePrice, total: p.payment.framePrice });
          if (p.payment.lensPrice > 0) items.push({ name: `เลนส์ ${p.lens.type} ${p.lens.features} (Index ${p.lens.index})`, quantity: 1, price: p.payment.lensPrice, total: p.payment.lensPrice });

          list.push({
              id: p.id,
              originalId: p.id,
              type: 'prescription',
              date: p.date,
              customer: customers.find(c => String(c.id) === String(p.customerId)),
              detail: `${p.frame.style || 'กรอบแว่น'} / ${p.lens.type || 'เลนส์'}`,
              amount: total,
              discount: p.payment.discount,
              deposit: p.payment.deposit,
              remaining: p.payment.remaining,
              status: p.payment.remaining === 0 ? 'ชำระครบ' : 'ค้างชำระ',
              items: items,
              rawData: p
          });
      });
      return list.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [purchases, prescriptions, customers]);

  // Filter Transactions
  const filteredTransactions = useMemo(() => {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');

      return allTransactions.filter(tx => {
          // 1. Date Filter
          let dateMatch = true;
          if (showAdvancedSearch && (advancedFilters.dateFrom || advancedFilters.dateTo)) {
              if (advancedFilters.dateFrom && tx.date < advancedFilters.dateFrom) dateMatch = false;
              if (advancedFilters.dateTo && tx.date > advancedFilters.dateTo) dateMatch = false;
          } else {
              // If searching by customer name from initial ID, we might want to ignore date filter initially?
              // But let's keep it consistent.
              if (filterPeriod === 'daily') dateMatch = tx.date === `${year}-${month}-${day}`;
              else if (filterPeriod === 'monthly') dateMatch = tx.date.startsWith(`${year}-${month}`);
              else if (filterPeriod === 'yearly') dateMatch = tx.date.startsWith(`${year}`);
          }
          if (!dateMatch && !initialCustomerId) return false; // If initial customer, maybe relax date? 
          // Actually, let's just stick to logic. If initial ID, search term is preset.

          // 2. Search Term
          const term = (searchTerm || '').toLowerCase();
          const customerName = (tx.customer?.name || '').toLowerCase() || 'ไม่ระบุ';
          const searchMatch = customerName.includes(term) || String(tx.id).toLowerCase().includes(term);
          if (!searchMatch) return false;

          // 3. Advanced Filters
          if (showAdvancedSearch) {
              if (advancedFilters.type !== 'all' && tx.type !== advancedFilters.type) return false;
              if (advancedFilters.minAmount && tx.amount < Number(advancedFilters.minAmount)) return false;
              if (advancedFilters.maxAmount && tx.amount > Number(advancedFilters.maxAmount)) return false;
          }

          return true;
      });
  }, [allTransactions, filterPeriod, currentDate, searchTerm, showAdvancedSearch, advancedFilters, initialCustomerId]);

  // --- Handlers ---
  const handleDateShift = (amount: number) => {
      const newDate = new Date(currentDate);
      if (filterPeriod === 'daily') newDate.setDate(newDate.getDate() + amount);
      if (filterPeriod === 'monthly') newDate.setMonth(newDate.getMonth() + amount);
      if (filterPeriod === 'yearly') newDate.setFullYear(newDate.getFullYear() + amount);
      setCurrentDate(newDate);
  };

  const getPeriodLabel = () => {
      if (filterPeriod === 'daily') return currentDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
      if (filterPeriod === 'monthly') return currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
      return currentDate.toLocaleDateString('th-TH', { year: 'numeric' });
  };

  const clearAdvancedFilters = () => {
      setAdvancedFilters({
          dateFrom: '',
          dateTo: '',
          type: 'all',
          minAmount: '',
          maxAmount: ''
      });
      // Do not clear search term if initial customer is set
      if (!initialCustomerId) setSearchTerm('');
  };

  const handleDocTypeSelect = (typeId: string) => {
      if (!selectedTxId) {
          addToast('กรุณาเลือกรายการ', 'โปรดเลือกรายการจากตารางด้านล่างเพื่อนำข้อมูลไปออกเอกสาร', 'error');
          return;
      }
      
      setDocType(typeId);
      setDocDate(new Date().toISOString().split('T')[0]);
      const nextId = getNextDocumentId(typeId);
      setDocNumber(nextId);
      setNote('');
      setView('preview');
  };

  useEffect(() => {
      if (view === 'preview' && selectedTxId && docType) {
          const tx = allTransactions.find(t => t.id === selectedTxId);
          const targetTx = tx;

          if (targetTx) {
              const html = generateHtml(docType, targetTx, docNumber, docDate, note, settings, enableVat, vatRate);
              setPreviewHtml(html);
          }
      }
  }, [view, selectedTxId, docType, docNumber, docDate, note, settings, enableVat, vatRate]);

  const handlePrint = () => {
      incrementDocumentId(docType);
      const w = window.open('', '_blank', 'width=1000,height=800');
      if (w) {
          w.document.write(previewHtml);
          w.document.close();
          setTimeout(() => { w.focus(); w.print(); }, 500);
      }
  };

  // ----------------------------------------------------------------------
  // VIEW: PREVIEW MODE
  // ----------------------------------------------------------------------
  if (view === 'preview') {
      return (
          <div className="h-full flex flex-col w-full mx-auto p-4 md:p-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-6">
                  <div className="flex gap-2">
                      <button onClick={() => setView('selection')} className="flex items-center gap-2 text-slate-500 hover:text-primary-600 bg-white border border-slate-200 hover:border-primary-200 px-4 py-2 rounded-xl transition-all shadow-sm">
                          <ArrowLeft className="w-5 h-5" /> ย้อนกลับ
                      </button>
                      {currentCustomer && onBack && (
                          <button onClick={onBack} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 px-4 py-2 rounded-xl transition-all shadow-sm">
                              <User className="w-5 h-5" /> กลับไปที่ข้อมูล {currentCustomer.name}
                          </button>
                      )}
                  </div>
                  <div className="flex items-center gap-3">
                      <div className="text-right">
                          <h2 className="font-bold text-lg text-slate-800">ตัวอย่างเอกสาร</h2>
                          <div className="text-xs text-slate-500">Preview Mode</div>
                      </div>
                      <div className="h-10 w-10 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center">
                          <FileCheck className="w-6 h-6"/>
                      </div>
                  </div>
              </div>

              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
                  {/* Settings Panel */}
                  <div className="lg:col-span-4 xl:col-span-3 bg-white p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 h-full overflow-y-auto flex flex-col">
                      <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg border-b border-slate-100 pb-3">
                          <SlidersHorizontal className="w-5 h-5 text-primary-600"/> ตั้งค่าเอกสาร
                      </h3>
                      <div className="space-y-6 flex-1">
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">เลขที่เอกสาร</label>
                              <div className="relative">
                                <input type="text" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 font-mono text-slate-600 focus:outline-none" value={docNumber} readOnly />
                                <div className="absolute right-3 top-3 text-xs text-slate-400 bg-slate-100 px-2 rounded-full border border-slate-200">Auto</div>
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">วันที่ออกเอกสาร</label>
                              <input type="date" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" value={docDate} onChange={e => setDocDate(e.target.value)} />
                          </div>
                          {enableVat && (
                              <div className="bg-primary-50 p-4 rounded-xl border border-primary-100">
                                  <label className="block text-sm font-bold text-primary-800 mb-2">อัตราภาษี (VAT)</label>
                                  <div className="flex items-center gap-2">
                                      <input 
                                          type="number" min="0" max="100"
                                          className="w-full p-2 border border-primary-200 rounded-lg text-center font-bold text-primary-700 focus:ring-2 focus:ring-primary-500 outline-none bg-white" 
                                          value={vatRate} onChange={e => setVatRate(Number(e.target.value))} 
                                      />
                                      <span className="text-primary-700 font-bold">%</span>
                                  </div>
                              </div>
                          )}
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">หมายเหตุท้ายเอกสาร</label>
                              <textarea rows={5} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none resize-none transition-all" 
                                  value={note} onChange={e => setNote(e.target.value)} placeholder="เช่น กำหนดชำระเงิน, รายละเอียดการรับประกัน..." />
                          </div>
                      </div>
                      <div className="pt-4 mt-6 border-t border-slate-100 flex flex-col gap-3">
                          <button onClick={handlePrint} className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-primary-200/50 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3">
                              <Printer className="w-5 h-5"/> พิมพ์เอกสาร
                          </button>
                          {onBack && (
                              <button 
                                  onClick={onBack}
                                  className="w-full bg-slate-100 text-slate-700 hover:bg-slate-200 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                              >
                                  <Check className="w-5 h-5"/> เสร็จสิ้น (กลับหน้าลูกค้า)
                              </button>
                          )}
                      </div>
                  </div>

                  {/* Preview Area */}
                  <div className="lg:col-span-8 xl:col-span-9 bg-slate-100/50 rounded-2xl border border-slate-200 flex justify-center p-8 overflow-y-auto relative scrollbar-hide">
                      <div className="absolute top-4 right-4 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-xs font-medium text-slate-400 border border-slate-200 shadow-sm flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> A4 Preview
                      </div>
                      <iframe 
                          srcDoc={previewHtml}
                          title="Document Preview"
                          className="bg-white shadow-2xl transition-transform origin-top border-none rounded-sm"
                          style={{ width: '210mm', height: '297mm', minWidth: '210mm', minHeight: '297mm', transform: 'scale(0.85)', transformOrigin: 'top center' }}
                      />
                  </div>
              </div>
          </div>
      );
  }

  // ----------------------------------------------------------------------
  // VIEW: SELECTION MODE (MAIN)
  // ----------------------------------------------------------------------
  return (
    <div className="flex flex-col min-h-screen w-full mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-300">
      
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
             <div className="p-2 bg-primary-100 rounded-xl text-primary-600"><FileText className="w-8 h-8" /></div>
             ออกเอกสาร
          </h1>
          <p className="text-slate-500 text-base mt-2 ml-1">สร้างเอกสารทางธุรกิจ ใบเสร็จ และใบรับรองต่างๆ</p>
        </div>
        
        {/* Global Controls */}
        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto items-start xl:items-center">
            {currentCustomer && onBack && (
                <button 
                    onClick={onBack}
                    className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:text-primary-600 hover:border-primary-200 px-4 py-3 rounded-xl shadow-sm transition-all whitespace-nowrap h-[50px]"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>กลับไปที่ข้อมูลลูกค้า</span>
                </button>
            )}

            <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                {/* Search */}
                <div className="relative flex-1 md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="ค้นหาลูกค้า..." 
                        className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-slate-50 focus:bg-white"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <button 
                    onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                    className={`p-3 rounded-xl border flex items-center gap-2 transition-colors ${showAdvancedSearch ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                    <Filter className="w-5 h-5" />
                </button>

                <div className="h-auto w-px bg-slate-200 hidden md:block mx-1"></div>

                {/* Date Filter */}
                <div className={`flex items-center gap-2 transition-opacity duration-300 ${showAdvancedSearch ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        {(['daily', 'monthly', 'yearly'] as const).map(p => (
                            <button
                                key={p}
                                onClick={() => setFilterPeriod(p)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterPeriod === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {p === 'daily' ? 'รายวัน' : p === 'monthly' ? 'รายเดือน' : 'รายปี'}
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2">
                        <button onClick={() => handleDateShift(-1)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 transition-all"><ChevronLeft className="w-5 h-5"/></button>
                        
                        <div className="relative min-w-[140px] flex items-center justify-center px-2 group cursor-pointer">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 pointer-events-none">
                                <Calendar className="w-4 h-4 text-primary-500" />
                                {getPeriodLabel()}
                            </div>
                            
                            {/* Hidden Inputs for Date Selection */}
                            {filterPeriod === 'daily' && (
                                <input 
                                    type="date" 
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                    value={`${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(currentDate.getDate()).padStart(2,'0')}`}
                                    onChange={(e) => { 
                                        if(e.target.value) { 
                                            const [y, m, d] = e.target.value.split('-').map(Number);
                                            setCurrentDate(new Date(y, m-1, d)); 
                                        }
                                    }} 
                                />
                            )}
                            {filterPeriod === 'monthly' && (
                                <input 
                                    type="month" 
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                    value={`${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}`}
                                    onChange={(e) => { 
                                        if(e.target.value) { 
                                            const [y, m] = e.target.value.split('-').map(Number); 
                                            setCurrentDate(new Date(y, m-1, 1)); 
                                        }
                                    }} 
                                />
                            )}
                            {filterPeriod === 'yearly' && (
                                <select 
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full text-center z-10"
                                    value={currentDate.getFullYear()}
                                    onChange={(e) => { 
                                        const d = new Date(currentDate); 
                                        d.setFullYear(Number(e.target.value)); 
                                        setCurrentDate(d); 
                                    }}
                                >
                                    {Array.from({length: 20}, (_, i) => new Date().getFullYear() - i + 1).map(y => (
                                        <option key={y} value={y}>{y + 543}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <button onClick={() => handleDateShift(1)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 transition-all"><ChevronRight className="w-5 h-5"/></button>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Advanced Search Panel */}
      {showAdvancedSearch && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 animate-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                  <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">วันที่ (จาก)</label>
                      <input type="date" className="w-full border rounded-lg p-2 text-sm" value={advancedFilters.dateFrom} onChange={e => setAdvancedFilters({...advancedFilters, dateFrom: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">วันที่ (ถึง)</label>
                      <input type="date" className="w-full border rounded-lg p-2 text-sm" value={advancedFilters.dateTo} onChange={e => setAdvancedFilters({...advancedFilters, dateTo: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">ประเภทรายการ</label>
                      <select className="w-full border rounded-lg p-2 text-sm bg-white" value={advancedFilters.type} onChange={e => setAdvancedFilters({...advancedFilters, type: e.target.value})}>
                          <option value="all">ทั้งหมด</option>
                          <option value="purchase">ซื้อสินค้าทั่วไป</option>
                          <option value="prescription">ตัดแว่น</option>
                      </select>
                  </div>
                  <div className="flex gap-2 items-end">
                      <div className="flex-1">
                          <label className="block text-xs font-medium text-slate-500 mb-1">ยอดเงิน (ต่ำสุด)</label>
                          <input type="number" className="w-full border rounded-lg p-2 text-sm" placeholder="Min" value={advancedFilters.minAmount} onChange={e => setAdvancedFilters({...advancedFilters, minAmount: e.target.value})} />
                      </div>
                      <div className="flex-1">
                          <label className="block text-xs font-medium text-slate-500 mb-1">ยอดเงิน (สูงสุด)</label>
                          <input type="number" className="w-full border rounded-lg p-2 text-sm" placeholder="Max" value={advancedFilters.maxAmount} onChange={e => setAdvancedFilters({...advancedFilters, maxAmount: e.target.value})} />
                      </div>
                  </div>
                  <button onClick={clearAdvancedFilters} className="p-2 border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors h-[38px] flex items-center justify-center">
                      <RotateCcw className="w-4 h-4" />
                  </button>
              </div>
          </div>
      )}

      {/* Document Type Selection Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Files className="w-5 h-5 text-primary-600"/> เลือกประเภทเอกสาร (Document Type)
              </h3>
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <span className={`text-xs font-bold ${!enableVat ? 'text-slate-600' : 'text-slate-400'}`}>ไม่จด VAT</span>
                  <button 
                      onClick={() => setEnableVat(!enableVat)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${enableVat ? 'bg-primary-500' : 'bg-slate-300'}`}
                  >
                      <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${enableVat ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </button>
                  <span className={`text-xs font-bold ${enableVat ? 'text-primary-600' : 'text-slate-400'}`}>จด VAT {vatRate}%</span>
              </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {DOC_TYPES.map(type => (
                  <button
                      key={type.id}
                      onClick={() => handleDocTypeSelect(type.id)}
                      className={`
                          group flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-200 cursor-pointer
                          bg-white border hover:shadow-md
                          ${type.special === 'blue' 
                            ? 'border-blue-200 hover:border-blue-400 hover:bg-blue-50/30' 
                            : type.special === 'orange' 
                                ? 'border-orange-200 hover:border-orange-400 hover:bg-orange-50/30'
                                : 'border-gray-200 hover:border-primary-400 hover:text-primary-600'}
                      `}
                  >
                      <type.icon className={`w-8 h-8 mb-3 transition-transform group-hover:scale-110 
                          ${type.special === 'blue' ? 'text-blue-600' : type.special === 'orange' ? 'text-orange-600' : 'text-gray-600 group-hover:text-primary-600'}
                      `} />
                      <div className="text-center">
                          <h5 className={`text-sm font-bold mb-0.5 ${type.special === 'blue' ? 'text-blue-700' : type.special === 'orange' ? 'text-orange-700' : 'text-gray-700 group-hover:text-primary-700'}`}>
                              {type.label}
                          </h5>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">{type.sub}</p>
                      </div>
                  </button>
              ))}
          </div>
      </div>

      {/* Transaction History Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                  <h3 className="font-bold text-lg text-slate-800">รายการขาย (Transaction History)</h3>
                  <p className="text-sm text-slate-500">เลือกรายการเพื่อนำข้อมูลไปออกเอกสาร</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-bold shadow-sm">
                  {filteredTransactions.length} รายการ
              </span>
          </div>
          
          <div className="overflow-x-auto overflow-y-auto custom-scrollbar bg-white relative h-[600px]">
              <table className="w-full text-left border-collapse relative table-fixed min-w-[800px]">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                      <tr>
                          <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[5%] text-center min-w-[60px]">เลือก</th>
                          <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[15%] min-w-[120px]">วันที่/เวลา</th>
                          <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[25%] min-w-[200px]">ลูกค้า</th>
                          <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[30%] min-w-[250px]">รายละเอียด</th>
                          <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-[10%] min-w-[100px]">สถานะ</th>
                          <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-[15%] min-w-[120px]">ยอดเงิน</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredTransactions.length > 0 ? filteredTransactions.map(tx => (
                          <tr 
                              key={tx.id} 
                              className={`
                                  group transition-all duration-200 cursor-pointer 
                                  ${selectedTxId === tx.id ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-slate-50'}
                              `}
                              onClick={() => setSelectedTxId(tx.id)}
                          >
                              <td className="px-4 py-4 text-center align-top">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mx-auto transition-all ${selectedTxId === tx.id ? 'border-primary-600 bg-primary-600 scale-110 shadow-sm' : 'border-slate-300 group-hover:border-primary-400'}`}>
                                      {selectedTxId === tx.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                  </div>
                              </td>
                              <td className="px-4 py-4 align-top">
                                  <div className="font-bold text-slate-700 text-sm truncate">{new Date(tx.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</div>
                                  <div className="text-xs text-slate-400 mt-0.5 font-mono truncate">
                                      พ.ศ. {Number(new Date(tx.date).getFullYear()) + 543}
                                  </div>
                              </td>
                              <td className="px-4 py-4 align-top" title={tx.customer?.name || 'ไม่ระบุ'}>
                                  <div className="flex flex-col">
                                      <span className="font-bold text-slate-800 text-sm truncate block w-full">
                                          {tx.customer?.name || 'ไม่ระบุ'}
                                      </span>
                                      <span className="text-xs text-slate-500 truncate">
                                          {tx.type === 'prescription' ? 'ตัดแว่น' : 'ซื้อสินค้า'}
                                      </span>
                                  </div>
                              </td>
                              <td className="px-4 py-4 align-top">
                                  <div className="text-sm text-slate-600 line-clamp-2" title={tx.detail}>
                                      {tx.detail}
                                  </div>
                              </td>
                              <td className="px-4 py-4 text-center align-top">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm whitespace-nowrap ${
                                      tx.status === 'ชำระครบ' 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}>
                                      {tx.status === 'ชำระครบ' && <CheckCircle2 className="w-3 h-3"/>}
                                      {tx.status}
                                  </span>
                              </td>
                              <td className="px-4 py-4 text-right align-top">
                                  <div className="font-bold text-slate-800 text-base whitespace-nowrap">฿{tx.amount.toLocaleString()}</div>
                              </td>
                          </tr>
                      )) : (
                          <tr>
                              <td colSpan={6} className="px-6 py-20 text-center">
                                  <div className="flex flex-col items-center justify-center gap-4">
                                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                                          <Search className="w-8 h-8 text-slate-300 opacity-50" />
                                      </div>
                                      <div className="text-slate-500 font-medium">ไม่พบรายการขายในช่วงเวลานี้</div>
                                  </div>
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};

const ThaiNumberToText = (amount: number): string => {
    // Basic Thai Baht conversion logic
    const num = Math.abs(amount);
    const baht = Math.floor(num);
    const satang = Math.round((num - baht) * 100);
    if (baht === 0 && satang === 0) return 'ศูนย์บาทถ้วน';
    const numbers = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const units = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
    
    const convert = (n: number): string => {
        let res = '';
        const digits = n.toString().split('').reverse();
        for (let i = 0; i < digits.length; i++) {
            const digit = parseInt(digits[i]);
            const unit = units[i % 6];
            if (digit !== 0) {
                if (i % 6 === 0 && digit === 1 && digits.length > 1) {
                    res = 'เอ็ด' + unit + res;
                } else if (i % 6 === 1 && digit === 2) {
                    res = 'ยี่' + unit + res;
                } else if (i % 6 === 1 && digit === 1) {
                    res = unit + res;
                } else {
                    res = numbers[digit] + unit + res;
                }
            } else if (i % 6 === 0 && i > 0) {
                 // Check if previous digits are not 0 to append 'Larn'
                 const nextDigit = parseInt(digits[i+1] || '0');
                 if(i === 6) res = 'ล้าน' + res; 
                 // Simple logic for million handling in basic function
            }
        }
        return res;
    };
    
    // Better library usually recommended, but keeping simple implementation
    // Fixing million logic properly needs recursive or chunking, simplified here:
    let text = '';
    if (baht > 0) text += convert(baht) + 'บาท';
    if (satang > 0) text += convert(satang) + 'สตางค์';
    else text += 'ถ้วน';
    
    // Fix common edge case
    text = text.replace('หนึ่งสิบ', 'สิบ');
    text = text.replace('สองสิบ', 'ยี่สิบ');
    text = text.replace('สิบหนึ่ง', 'สิบเอ็ด');
    
    return text;
};

const generateHtml = (docType: string, tx: any, docNo: string, date: string, note: string, settings: AppSettings, useVat: boolean, vatRate: number) => {
    const typeObj = DOC_TYPES.find(d => d.id === docType);
    const docTitles: Record<string, { th: string, en: string }> = {
        'quotation': { th: 'ใบเสนอราคา', en: 'QUOTATION' },
        'deposit_receipt': { th: 'ใบเสร็จรับเงินมัดจำ', en: 'DEPOSIT RECEIPT' },
        'purchase_order': { th: 'ใบสั่งซื้อ', en: 'PURCHASE ORDER' },
        'invoice': { th: 'ใบแจ้งหนี้', en: 'INVOICE' },
        'receipt': { th: 'ใบเสร็จรับเงิน', en: 'RECEIPT' },
        'tax_invoice': { th: 'ใบกำกับภาษี/ใบเสร็จรับเงิน', en: 'TAX INVOICE / RECEIPT' },
        'delivery_note': { th: 'ใบส่งของ', en: 'DELIVERY NOTE' },
        'credit_note': { th: 'ใบลดหนี้', en: 'CREDIT NOTE' },
        'debit_note': { th: 'ใบเพิ่มหนี้', en: 'DEBIT NOTE' },
        'prescription': { th: 'ใบตรวจวัดสายตา', en: 'PRESCRIPTION' },
        'lens_order': { th: 'ใบสั่งตัดเลนส์', en: 'LENS ORDER' },
        'warranty': { th: 'บัตรรับประกันสินค้า', en: 'WARRANTY CARD' }
    };

    const docInfo = docTitles[docType] || { th: typeObj?.label || 'เอกสาร', en: 'DOCUMENT' };
    const refId = String(tx.originalId || '').substring(0, 8).toUpperCase();
    const customer = tx.customer || {};

    const commonCss = `
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
        @page { size: A4; margin: 0; }
        body { font-family: 'Sarabun', sans-serif; margin: 0; padding: 0; background: #fff; color: #333; -webkit-print-color-adjust: exact; font-size: 11pt; }
        .page { width: 210mm; min-height: 297mm; padding: 10mm 15mm; box-sizing: border-box; position: relative; margin: 0 auto; background: white; }
        
        /* Grid Layouts */
        .row { display: flex; width: 100%; }
        .col { flex: 1; }
        .col-1 { width: 8.33%; } .col-2 { width: 16.66%; } .col-3 { width: 25%; }
        .col-4 { width: 33.33%; } .col-5 { width: 41.66%; } .col-6 { width: 50%; }
        .col-7 { width: 58.33%; } .col-8 { width: 66.66%; } .col-9 { width: 75%; }
        .col-10 { width: 83.33%; } .col-11 { width: 91.66%; } .col-12 { width: 100%; }
        
        /* Utilities */
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .mb-1 { margin-bottom: 4px; }
        .mb-2 { margin-bottom: 8px; }
        .mb-4 { margin-bottom: 16px; }
        .mt-4 { margin-top: 16px; }
        .border { border: 1px solid #ddd; }
        .p-2 { padding: 8px; }
        
        /* Header Section */
        .header { margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .company-logo { max-height: 60px; max-width: 150px; object-fit: contain; margin-bottom: 5px; }
        .company-name { font-size: 16pt; font-weight: bold; color: #000; }
        .company-info { font-size: 10pt; line-height: 1.4; color: #444; }
        .doc-title-box { text-align: right; }
        .doc-title-th { font-size: 18pt; font-weight: bold; color: #000; line-height: 1.2; }
        .doc-title-en { font-size: 10pt; font-weight: bold; color: #666; letter-spacing: 1px; }
        .doc-meta { margin-top: 10px; font-size: 10pt; }
        .doc-meta-row { display: flex; justify-content: flex-end; margin-bottom: 2px; }
        .meta-label { font-weight: bold; width: 80px; text-align: right; margin-right: 10px; }
        .meta-val { width: 120px; text-align: left; }

        /* Customer & Info Box */
        .info-section { display: flex; gap: 15px; margin-bottom: 20px; }
        .info-box { border: 1px solid #ccc; border-radius: 4px; padding: 10px; flex: 1; font-size: 10pt; line-height: 1.5; }
        .info-header { background: #f0f0f0; border-bottom: 1px solid #ccc; padding: 5px 10px; margin: -10px -10px 10px -10px; font-weight: bold; font-size: 10pt; }
        .info-row { display: flex; }
        .info-label { width: 70px; font-weight: bold; color: #555; }
        .info-val { flex: 1; }

        /* Standard Table */
        table.data-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
        table.data-table th { background-color: #eee; border: 1px solid #bbb; padding: 8px; font-weight: bold; color: #222; text-align: center; }
        table.data-table td { border-left: 1px solid #bbb; border-right: 1px solid #bbb; padding: 8px; vertical-align: top; }
        table.data-table tr.last-row td { border-bottom: 1px solid #bbb; }
        
        /* Summary Section */
        .summary-section { display: flex; margin-top: 5px; font-size: 10pt; }
        .summary-left { flex: 1.5; padding-right: 20px; }
        .summary-right { flex: 1; }
        .amount-box { background: #f9f9f9; border: 1px solid #ccc; padding: 8px; text-align: center; font-weight: bold; border-radius: 4px; margin-bottom: 10px; }
        .note-box { border: 1px dashed #ccc; padding: 8px; font-size: 9pt; color: #666; min-height: 40px; border-radius: 4px; white-space: pre-line; }
        .summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
        .summary-label { font-weight: bold; color: #444; }
        .total-row { border-top: 1px solid #000; border-bottom: 3px double #000; padding: 8px 0; font-size: 12pt; font-weight: bold; margin-top: 5px; background: #fcfcfc; }

        /* Footer / Signature */
        .footer { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; }
        .sig-box { width: 30%; text-align: center; }
        .sig-line { border-bottom: 1px dotted #000; height: 30px; margin-bottom: 5px; margin-top: 20px; }
        .sig-name { font-size: 10pt; margin-bottom: 2px; }
        .sig-role { font-size: 9pt; color: #666; }
        .sig-date { font-size: 9pt; color: #666; margin-top: 2px; }

        /* Prescription Specific */
        .rx-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10pt; }
        .rx-table th { background: #e0f2fe; border: 1px solid #7dd3fc; padding: 10px; color: #0c4a6e; }
        .rx-table td { border: 1px solid #bae6fd; padding: 10px; text-align: center; font-weight: 500; }
        
        /* Warranty Specific */
        .warranty-box { border: 2px solid #ca8a04; background: #fefce8; padding: 20px; border-radius: 8px; text-align: center; margin-top: 20px; }
        .w-header { font-size: 18pt; font-weight: bold; color: #854d0e; margin-bottom: 15px; text-transform: uppercase; border-bottom: 1px dashed #ca8a04; padding-bottom: 10px; display: inline-block; }
    `;

    // 1. PRESCRIPTION LAYOUT
    if (docType === 'prescription') {
        const vision = tx.rawData?.vision || { right: {}, left: {} };
        const frame = tx.rawData?.frame || {};
        const lens = tx.rawData?.lens || {};
        
        return `
        <!DOCTYPE html>
        <html>
        <head><title>${docInfo.th}</title><style>${commonCss}</style></head>
        <body>
            <div class="page">
                ${renderHeader(settings, docInfo, docNo, date)}
                ${renderCustomerInfo(customer, refId, date)}
                
                <div style="margin-top: 20px;">
                    <h3 style="border-bottom: 2px solid #0ea5e9; padding-bottom: 5px; color: #0284c7; margin-bottom: 10px;">ข้อมูลค่าสายตา (Vision Prescription)</h3>
                    <table class="rx-table">
                        <thead>
                            <tr>
                                <th style="text-align:left; width: 100px;">Eye</th>
                                <th>SPH</th>
                                <th>CYL</th>
                                <th>AXIS</th>
                                <th>ADD</th>
                                <th>PD</th>
                                <th>SH</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="text-align:left; font-weight:bold; background:#f0f9ff;">ขวา (OD)</td>
                                <td>${vision.right?.sph || '-'}</td>
                                <td>${vision.right?.cyl || '-'}</td>
                                <td>${vision.right?.axis || '-'}</td>
                                <td>${vision.right?.add || '-'}</td>
                                <td>${vision.right?.pd || '-'}</td>
                                <td>${vision.right?.sh || '-'}</td>
                            </tr>
                            <tr>
                                <td style="text-align:left; font-weight:bold; background:#f0f9ff;">ซ้าย (OS)</td>
                                <td>${vision.left?.sph || '-'}</td>
                                <td>${vision.left?.cyl || '-'}</td>
                                <td>${vision.left?.axis || '-'}</td>
                                <td>${vision.left?.add || '-'}</td>
                                <td>${vision.left?.pd || '-'}</td>
                                <td>${vision.left?.sh || '-'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div style="margin-top: 30px; display: flex; gap: 20px;">
                    <div class="info-box">
                        <div class="info-header">ข้อมูลกรอบแว่น (Frame)</div>
                        <div class="info-row"><span class="info-label">ยี่ห้อ:</span> <span class="info-val">${frame.brand || '-'}</span></div>
                        <div class="info-row"><span class="info-label">รุ่น/สี:</span> <span class="info-val">${frame.style || '-'}</span></div>
                        <div class="info-row"><span class="info-label">ขนาด:</span> <span class="info-val">${frame.size || '-'}</span></div>
                    </div>
                    <div class="info-box">
                        <div class="info-header">ข้อมูลเลนส์ (Lens)</div>
                        <div class="info-row"><span class="info-label">ชนิด:</span> <span class="info-val">${lens.type || '-'}</span></div>
                        <div class="info-row"><span class="info-label">Index:</span> <span class="info-val">${lens.index || '-'}</span></div>
                        <div class="info-row"><span class="info-label">Coating:</span> <span class="info-val">${lens.features || '-'}</span></div>
                    </div>
                </div>

                <div style="margin-top: 20px;">
                    <div class="info-header" style="background:none; border-bottom:1px solid #ccc; margin:0 0 10px 0;">หมายเหตุ / การใช้งาน (Note)</div>
                    <div style="min-height: 60px; border: 1px dashed #ccc; padding: 10px; border-radius: 4px;">
                        ${tx.rawData?.lifestyle || note || '-'}
                    </div>
                </div>

                <div class="footer">
                    <div class="sig-box">
                        <div class="sig-line"></div>
                        <div class="sig-name">นักทัศนมาตร / ผู้ตรวจ</div>
                        <div class="sig-role">Optometrist</div>
                    </div>
                    <div class="sig-box">
                        <div class="sig-line"></div>
                        <div class="sig-name">ผู้รับแว่น</div>
                        <div class="sig-role">Customer</div>
                    </div>
                </div>
            </div>
        </body>
        </html>`;
    }

    // 2. WARRANTY LAYOUT
    if (docType === 'warranty') {
        const frame = tx.rawData?.frame || {};
        const lens = tx.rawData?.lens || {};
        const warrantyEnd = new Date(date);
        warrantyEnd.setFullYear(warrantyEnd.getFullYear() + 1); // Default 1 year

        return `
        <!DOCTYPE html>
        <html>
        <head><title>${docInfo.th}</title><style>${commonCss}</style></head>
        <body>
            <div class="page">
                ${renderHeader(settings, docInfo, docNo, date)}
                
                <div class="warranty-box">
                    <div class="w-header">Certificate of Warranty</div>
                    <p>ทางร้าน ${settings.shopName} ขอรับรองว่าสินค้าของท่านได้รับการตรวจสอบคุณภาพและรับประกันตามเงื่อนไขดังนี้</p>
                    
                    <div style="margin: 30px 0; text-align: left; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div class="info-box" style="background: white;">
                            <div class="info-header" style="background: #fff7ed; color: #9a3412;">ข้อมูลลูกค้า</div>
                            <div class="info-row"><span class="info-label">ชื่อ:</span> ${customer.name || '-'}</div>
                            <div class="info-row"><span class="info-label">โทร:</span> ${customer.phone || '-'}</div>
                            <div class="info-row"><span class="info-label">วันที่ซื้อ:</span> ${new Date(tx.date).toLocaleDateString('th-TH')}</div>
                        </div>
                        <div class="info-box" style="background: white;">
                            <div class="info-header" style="background: #fff7ed; color: #9a3412;">ระยะเวลารับประกัน</div>
                            <div class="info-row"><span class="info-label">เริ่ม:</span> ${new Date(date).toLocaleDateString('th-TH')}</div>
                            <div class="info-row"><span class="info-label">สิ้นสุด:</span> ${warrantyEnd.toLocaleDateString('th-TH')}</div>
                            <div class="info-row"><span class="info-label">Ref No:</span> ${refId}</div>
                        </div>
                    </div>

                    <table class="data-table" style="margin-bottom: 20px;">
                        <thead>
                            <tr>
                                <th>รายการสินค้า (Product)</th>
                                <th>รายละเอียด (Details)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="font-weight:bold;">กรอบแว่น (Frame)</td>
                                <td>${frame.brand || '-'} ${frame.style || ''} ${frame.size || ''}</td>
                            </tr>
                            <tr>
                                <td style="font-weight:bold;">เลนส์ (Lens)</td>
                                <td>${lens.type || '-'} ${lens.features || ''} Index ${lens.index || '-'}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div style="text-align: left; font-size: 10pt; color: #555; margin-top: 20px;">
                        <strong>เงื่อนไขการรับประกัน:</strong>
                        <ul style="margin-top: 5px;">
                            <li>รับประกันโค้ทเลนส์ลอกเป็นเวลา 1 ปี (จากการใช้งานปกติ ไม่รวมรอยขีดข่วน)</li>
                            <li>บริการดัด ปรับแต่งทรง เปลี่ยนแป้นจมูก ฟรีตลอดอายุการใช้งาน</li>
                            <li>การรับประกันไม่ครอบคลุมความเสียหายจากอุบัติเหตุ การนั่งทับ หรือการใช้งานผิดประเภท</li>
                            <li>กรุณาแสดงบัตรนี้ทุกครั้งเมื่อมารับบริการ</li>
                        </ul>
                    </div>
                </div>

                <div class="footer">
                    <div class="sig-box">
                        <div class="sig-line"></div>
                        <div class="sig-role">Authorized Signature</div>
                        <div class="sig-date">${settings.shopName}</div>
                    </div>
                </div>
            </div>
        </body>
        </html>`;
    }

    // 3. STANDARD BUSINESS DOCUMENT (Invoice, Receipt, etc.)
    const total = tx.amount;
    const vatAmt = useVat ? (total * vatRate / (100 + vatRate)) : 0;
    const preVat = total - vatAmt;
    
    // Generate rows (ensure min rows for formatting)
    const minRows = 10;
    const items = tx.items || [];
    const rowsHtml = items.map((item: any, i: number) => `
        <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td>${item.name}</td>
            <td style="text-align:right;">${item.quantity || 1}</td>
            <td style="text-align:right;">${(item.price || 0).toLocaleString()}</td>
            <td style="text-align:right;">${(item.total || (item.price * (item.quantity||1))).toLocaleString()}</td>
        </tr>
    `).join('');
    
    // Fill empty rows
    const emptyRowsCount = Math.max(0, minRows - items.length);
    const emptyRowsHtml = Array(emptyRowsCount).fill('').map(() => `
        <tr>
            <td>&nbsp;</td><td></td><td></td><td></td><td></td>
        </tr>
    `).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head><title>${docInfo.th}</title><style>${commonCss}</style></head>
        <body>
            <div class="page">
                ${renderHeader(settings, docInfo, docNo, date)}
                ${renderCustomerInfo(customer, refId, new Date(tx.date).toLocaleDateString('th-TH'))}

                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width: 5%;">#</th>
                            <th style="width: 50%;">รายการ (Description)</th>
                            <th style="width: 10%;">จำนวน (Qty)</th>
                            <th style="width: 15%;">ราคา/หน่วย (Unit Price)</th>
                            <th style="width: 20%;">จำนวนเงิน (Amount)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                        ${emptyRowsHtml}
                        <tr class="last-row">
                            <td></td><td></td><td></td><td></td><td></td>
                        </tr>
                    </tbody>
                </table>

                <div class="summary-section">
                    <div class="summary-left">
                        <div class="amount-box">${ThaiNumberToText(total)}</div>
                        <div class="note-box"><strong>หมายเหตุ (Remarks):</strong> ${note}</div>
                        <div style="font-size: 9pt; margin-top: 10px; color: #444;">
                            <strong>ข้อมูลการชำระเงิน:</strong><br/>
                            ธนาคารกสิกรไทย (K-Bank)<br/>
                            ชื่อบัญชี: ${settings.shopName}<br/>
                            เลขที่บัญชี: xxx-x-xxxxx-x
                        </div>
                    </div>
                    <div class="summary-right">
                        ${useVat ? `
                        <div class="summary-row">
                            <span class="summary-label">มูลค่าก่อนภาษี (Pre-VAT)</span>
                            <span>${preVat.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                        <div class="summary-row">
                            <span class="summary-label">ภาษีมูลค่าเพิ่ม (VAT ${vatRate}%)</span>
                            <span>${vatAmt.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                        ` : ''}
                        <div class="summary-row total-row">
                            <span>ยอดรวมสุทธิ (Grand Total)</span>
                            <span>${total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                    </div>
                </div>

                <div class="footer">
                    <div class="sig-box">
                        <div class="sig-line"></div>
                        <div class="sig-role">ผู้รับวางบิล / ผู้รับของ</div>
                        <div class="sig-role">Received By</div>
                    </div>
                    <div class="sig-box">
                        <div class="sig-line"></div>
                        <div class="sig-role">ผู้วางบิล / ผู้ส่งของ</div>
                        <div class="sig-role">Delivered By</div>
                    </div>
                    <div class="sig-box">
                        <div class="sig-line"></div>
                        <div class="sig-role">ผู้มีอำนาจลงนาม</div>
                        <div class="sig-role">Authorized Signature</div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
};

// Helper to render consistent header
const renderHeader = (settings: AppSettings, docInfo: any, docNo: string, date: string) => `
    <div class="header">
        <div class="row">
            <div class="col-8">
                <div style="display: flex; gap: 15px; align-items: flex-start;">
                    ${settings.logo ? `<img src="${settings.logo}" class="company-logo" alt="Logo" />` : ''}
                    <div>
                        <div class="company-name">${settings.shopName}</div>
                        <div class="company-info">${settings.shopAddress}</div>
                        <div class="company-info">โทร: ${settings.shopPhone} ${settings.taxId ? ' | เลขประจำตัวผู้เสียภาษี: ' + settings.taxId : ''}</div>
                    </div>
                </div>
            </div>
            <div class="col-4 doc-title-box">
                <div class="doc-title-th">${docInfo.th}</div>
                <div class="doc-title-en">${docInfo.en}</div>
                <div class="doc-meta">
                    <div class="doc-meta-row">
                        <div class="meta-label">เลขที่:</div>
                        <div class="meta-val">${docNo}</div>
                    </div>
                    <div class="doc-meta-row">
                        <div class="meta-label">วันที่:</div>
                        <div class="meta-val">${new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
`;

// Helper to render customer block
const renderCustomerInfo = (customer: any, refId: string, txDate: string) => `
    <div class="info-section">
        <div class="info-box">
            <div class="info-header">ลูกค้า (Customer)</div>
            <div class="info-row"><span class="info-label">ชื่อ:</span> <span class="info-val">${customer.name || 'เงินสด (Cash Sales)'}</span></div>
            <div class="info-row"><span class="info-label">ที่อยู่:</span> <span class="info-val">${customer.address || '-'}</span></div>
            <div class="info-row"><span class="info-label">โทร:</span> <span class="info-val">${customer.phone || '-'}</span></div>
        </div>
        <div class="info-box">
            <div class="info-header">อ้างอิง (Reference)</div>
            <div class="info-row"><span class="info-label">Ref No:</span> <span class="info-val">${refId}</span></div>
            <div class="info-row"><span class="info-label">วันที่ทำรายการ:</span> <span class="info-val">${txDate}</span></div>
            <div class="info-row"><span class="info-label">พนักงานขาย:</span> <span class="info-val">Admin</span></div>
        </div>
    </div>
`;

export default Documents;
