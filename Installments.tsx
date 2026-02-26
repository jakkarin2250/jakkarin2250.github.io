
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { InstallmentPlan, InstallmentSchedule } from '../types';
import { Plus, Search, CalendarClock, DollarSign, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Trash2, CreditCard, Phone, MapPin, User, Filter, RotateCcw, X } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

const Installments = () => {
    const { installments, customers, addInstallment, payInstallment, deleteInstallment } = useData();
    const { addToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [payConfig, setPayConfig] = useState<{ planId: string, schedule: InstallmentSchedule } | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Advanced Search State
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
    const [filters, setFilters] = useState({
        status: 'all',
        paymentStatus: 'all',
        startDateFrom: '',
        startDateTo: ''
    });

    // Customer Search for Create Modal
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerList, setShowCustomerList] = useState(false);

    // Form State for creating new plan
    const [form, setForm] = useState<{
        customerId: string;
        productName: string;
        totalAmount: number;
        downPayment: number;
        months: number;
        interestRate: number;
        startDate: string;
        note: string;
    }>({
        customerId: '',
        productName: '',
        totalAmount: 0,
        downPayment: 0,
        months: 3,
        interestRate: 0,
        startDate: new Date().toISOString().split('T')[0],
        note: ''
    });

    // Helper for payment modal
    const [paymentMethod, setPaymentMethod] = useState('เงินสด');

    const clearFilters = () => {
        setFilters({
            status: 'all',
            paymentStatus: 'all',
            startDateFrom: '',
            startDateTo: ''
        });
        setSearchTerm('');
    };

    const sortedCustomers = useMemo(() => {
        return [...customers].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));
    }, [customers]);

    const filteredCustomerOptions = useMemo(() => {
        const term = (customerSearch || '').toLowerCase();
        return sortedCustomers.filter(c => 
            (c.name || '').toLowerCase().includes(term) || 
            (c.phone || '').includes(term)
        );
    }, [sortedCustomers, customerSearch]);

    const filteredPlans = installments.filter(plan => {
        // Robust ID Matching (String/Number safe)
        const customer = customers.find(c => String(c.id) === String(plan.customerId));
        const customerName = (customer?.name || plan.customerName || '').toLowerCase();
        const productName = (plan.productName || '').toLowerCase();
        const term = (searchTerm || '').toLowerCase();
        
        // Basic Search
        const matchesTerm = customerName.includes(term) || productName.includes(term);
        if (!matchesTerm) return false;

        // Advanced Filters
        if (showAdvancedSearch) {
            if (filters.status !== 'all' && plan.status !== filters.status) return false;
            
            if (filters.paymentStatus === 'overdue') {
                const isOverdue = plan.schedules.some(s => s.status === 'pending' && s.dueDate < new Date().toISOString().split('T')[0]);
                if (!isOverdue) return false;
            }

            if (filters.startDateFrom && plan.startDate < filters.startDateFrom) return false;
            if (filters.startDateTo && plan.startDate > filters.startDateTo) return false;
        }

        return true;
    }).sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    // Calculate Summary Stats
    const totalOutstanding = installments.reduce((acc, curr) => {
        const pending = curr.schedules.filter(s => s.status !== 'paid').reduce((sum, s) => sum + s.amount, 0);
        return acc + pending;
    }, 0);
    
    const activePlans = installments.filter(p => p.status === 'active').length;
    
    const overdueAmount = installments.reduce((acc, curr) => {
        const today = new Date().toISOString().split('T')[0];
        const overdue = curr.schedules.filter(s => s.status === 'pending' && s.dueDate < today).reduce((sum, s) => sum + s.amount, 0);
        return acc + overdue;
    }, 0);

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const principal = form.totalAmount - form.downPayment;
        const interestAmount = principal * (form.interestRate / 100);
        const totalPayable = principal + interestAmount;
        const monthly = Math.ceil(totalPayable / form.months);
        
        // Find selected customer for snapshot
        const selectedCustomer = customers.find(c => String(c.id) === String(form.customerId));

        // Generate Schedules
        const schedules: InstallmentSchedule[] = [];
        let currentDate = new Date(form.startDate);
        
        for(let i=1; i<=form.months; i++) {
            currentDate.setMonth(currentDate.getMonth() + 1);
            schedules.push({
                term: i,
                dueDate: currentDate.toISOString().split('T')[0],
                amount: monthly,
                status: 'pending'
            });
        }

        addInstallment({
            ...form,
            customerName: selectedCustomer?.name || '', // Save snapshot
            principalAmount: principal,
            monthlyAmount: monthly,
            status: 'active',
            schedules,
            recordedBy: 'admin'
        });

        addToast('สร้างสำเร็จ', 'สร้างแผนการผ่อนชำระเรียบร้อยแล้ว');
        setIsCreateModalOpen(false);
        setForm({ customerId: '', productName: '', totalAmount: 0, downPayment: 0, months: 3, interestRate: 0, startDate: new Date().toISOString().split('T')[0], note: '' });
        setCustomerSearch('');
    };

    const handlePaySubmit = () => {
        if(payConfig) {
            payInstallment(payConfig.planId, payConfig.schedule.term, payConfig.schedule.amount, paymentMethod);
            addToast('บันทึกสำเร็จ', 'บันทึกการรับชำระค่างวดเรียบร้อย');
            setIsPayModalOpen(false);
            setPayConfig(null);
        }
    };

    const openPayModal = (planId: string, schedule: InstallmentSchedule) => {
        setPayConfig({ planId, schedule });
        setIsPayModalOpen(true);
    };

    const confirmDelete = () => {
        if(deleteId) {
            deleteInstallment(deleteId);
            addToast('ลบข้อมูลแล้ว', 'ลบแผนการผ่อนชำระเรียบร้อย');
            setDeleteId(null);
        }
    };

    const openCreateModal = () => {
        setForm({ customerId: '', productName: '', totalAmount: 0, downPayment: 0, months: 3, interestRate: 0, startDate: new Date().toISOString().split('T')[0], note: '' });
        setCustomerSearch('');
        setIsCreateModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">ระบบผ่อนชำระ</h1>
                    <p className="text-gray-500">จัดการแผนผ่อนชำระสินค้าและติดตามค่างวด</p>
                </div>
                <button onClick={openCreateModal} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                    <Plus className="w-4 h-4" /> สร้างรายการผ่อน
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                    <div className="p-4 rounded-full bg-blue-100 text-blue-600 mr-4"><DollarSign className="w-6 h-6"/></div>
                    <div><p className="text-sm text-gray-500">ยอดรอชำระทั้งหมด</p><p className="text-2xl font-bold text-gray-800">฿{totalOutstanding.toLocaleString()}</p></div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                    <div className="p-4 rounded-full bg-yellow-100 text-yellow-600 mr-4"><CalendarClock className="w-6 h-6"/></div>
                    <div><p className="text-sm text-gray-500">แผนที่กำลังผ่อน</p><p className="text-2xl font-bold text-gray-800">{activePlans} รายการ</p></div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                    <div className="p-4 rounded-full bg-red-100 text-red-600 mr-4"><AlertCircle className="w-6 h-6"/></div>
                    <div><p className="text-sm text-gray-500">ยอดเกินกำหนดชำระ</p><p className="text-2xl font-bold text-red-600">฿{overdueAmount.toLocaleString()}</p></div>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input 
                            type="text"
                            placeholder="ค้นหาชื่อลูกค้า หรือ สินค้า..."
                            className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <button 
                        onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                        className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-colors ${showAdvancedSearch ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Filter className="w-4 h-4" /> 
                        <span className="hidden sm:inline">ตัวกรอง</span>
                    </button>
                </div>

                {showAdvancedSearch && (
                    <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-200">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">สถานะแผน (Status)</label>
                            <select 
                                className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                                value={filters.status}
                                onChange={e => setFilters({...filters, status: e.target.value})}
                            >
                                <option value="all">ทั้งหมด</option>
                                <option value="active">กำลังผ่อน (Active)</option>
                                <option value="completed">ผ่อนครบแล้ว (Completed)</option>
                                <option value="cancelled">ยกเลิก (Cancelled)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">สถานะการชำระ (Payment)</label>
                            <select 
                                className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                                value={filters.paymentStatus}
                                onChange={e => setFilters({...filters, paymentStatus: e.target.value})}
                            >
                                <option value="all">ทั้งหมด</option>
                                <option value="overdue">เกินกำหนดชำระ (Overdue)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">วันที่เริ่มผ่อน (จาก)</label>
                            <input 
                                type="date" 
                                className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                                value={filters.startDateFrom}
                                onChange={e => setFilters({...filters, startDateFrom: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">วันที่เริ่มผ่อน (ถึง)</label>
                            <div className="flex gap-2">
                                <input 
                                    type="date" 
                                    className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                                    value={filters.startDateTo}
                                    onChange={e => setFilters({...filters, startDateTo: e.target.value})}
                                />
                                <button 
                                    onClick={clearFilters}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-gray-200"
                                    title="ล้างตัวกรอง"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Installment List */}
            <div className="space-y-4">
                {filteredPlans.map(plan => {
                    // Robust lookup using String coercion to avoid type mismatch
                    const customer = customers.find(c => String(c.id) === String(plan.customerId));
                    const displayName = customer?.name || plan.customerName || <span className="text-gray-400 italic">ไม่พบข้อมูลลูกค้า (ID: {plan.customerId})</span>;
                    
                    const paidTerms = plan.schedules.filter(s => s.status === 'paid').length;
                    const progress = Math.round((paidTerms / plan.months) * 100);
                    const isOverdue = plan.schedules.some(s => s.status === 'pending' && s.dueDate < new Date().toISOString().split('T')[0]);

                    return (
                        <div key={plan.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExpandedId(expandedId === plan.id ? null : plan.id)}>
                                <div className="flex items-center gap-4 flex-1">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shrink-0 border-4 ${plan.status === 'completed' ? 'bg-green-50 text-green-600 border-green-100' : isOverdue ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                        {Math.round(progress)}%
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        {/* Product Name First (as per request) */}
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <h3 className="font-bold text-gray-800 text-lg">{plan.productName}</h3>
                                            {isOverdue && <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full border border-red-200 font-medium">เกินกำหนด</span>}
                                            {plan.status === 'completed' && <span className="bg-green-100 text-green-600 text-[10px] px-2 py-0.5 rounded-full border border-green-200 font-medium">ครบกำหนด</span>}
                                            {plan.status === 'cancelled' && <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full border border-gray-200 font-medium">ยกเลิก</span>}
                                        </div>
                                        
                                        {/* Customer Name Row */}
                                        <div className="flex items-center gap-2 text-primary-700 font-medium mb-1.5">
                                            <User className="w-4 h-4"/> 
                                            {displayName}
                                        </div>

                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-slate-500">
                                            <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> {customer?.phone || '-'}</span>
                                            <span className="flex items-center gap-1 truncate max-w-[200px]"><MapPin className="w-3 h-3"/> {customer?.address || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-8 w-full sm:w-auto justify-between sm:justify-end ml-16 sm:ml-0 border-t sm:border-t-0 pt-3 sm:pt-0 mt-2 sm:mt-0">
                                    <div className="text-right">
                                        <div className="text-xs text-gray-400">ค่างวด/เดือน</div>
                                        <div className="font-bold text-gray-800">฿{plan.monthlyAmount.toLocaleString()}</div>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <div className="text-xs text-gray-400">เหลืออีก</div>
                                        <div className="font-bold text-gray-800">{plan.months - paidTerms} งวด</div>
                                    </div>
                                    <button className="text-gray-400 hover:text-gray-600">
                                        {expandedId === plan.id ? <ChevronUp /> : <ChevronDown />}
                                    </button>
                                </div>
                            </div>

                            {/* Detailed Schedule (Expandable) */}
                            {expandedId === plan.id && (
                                <div className="border-t border-gray-100 bg-gray-50/50 p-4 sm:p-6 animate-in slide-in-from-top-2 duration-200">
                                    <div className="mb-4 flex justify-between items-center">
                                        <h4 className="font-bold text-sm text-gray-700">ตารางผ่อนชำระ</h4>
                                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(plan.id); }} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 hover:underline">
                                            <Trash2 className="w-3 h-3"/> ลบรายการผ่อน
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                        {plan.schedules.map(schedule => {
                                            const isPending = schedule.status === 'pending';
                                            const isLate = isPending && schedule.dueDate < new Date().toISOString().split('T')[0];
                                            
                                            return (
                                                <div key={schedule.term} className={`p-3 rounded-lg border ${schedule.status === 'paid' ? 'bg-green-50 border-green-200' : isLate ? 'bg-white border-red-300 shadow-sm' : 'bg-white border-gray-200'}`}>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-bold text-gray-500 uppercase">งวดที่ {schedule.term}</span>
                                                        {schedule.status === 'paid' ? (
                                                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                        ) : (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); openPayModal(plan.id, schedule); }}
                                                                className="text-[10px] bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700 transition-colors"
                                                                disabled={plan.status === 'cancelled'}
                                                            >
                                                                แจ้งชำระ
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className={`font-bold ${isLate ? 'text-red-600' : 'text-gray-800'}`}>฿{schedule.amount.toLocaleString()}</div>
                                                    <div className="text-xs text-gray-500 mt-1 flex justify-between">
                                                        <span>กำหนด: {new Date(schedule.dueDate).toLocaleDateString('th-TH', {day: 'numeric', month: 'short'})}</span>
                                                        {isLate && <span className="text-red-500 font-bold">!</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-4 text-xs text-gray-400">
                                        หมายเหตุ: {plan.note || '-'}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                {filteredPlans.length === 0 && <div className="text-center py-10 text-gray-400">ไม่พบรายการผ่อนชำระ</div>}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-800">สร้างแผนการผ่อนชำระใหม่</h3>
                        </div>
                        <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ลูกค้า</label>
                                <div className="relative">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                        <input 
                                            type="text"
                                            required={!form.customerId}
                                            className="w-full pl-10 border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                            placeholder="ค้นหาชื่อ หรือ เบอร์โทรลูกค้า..."
                                            value={customerSearch}
                                            onChange={(e) => {
                                                setCustomerSearch(e.target.value);
                                                setShowCustomerList(true);
                                                if (form.customerId) setForm({...form, customerId: ''}); // Clear ID on search
                                            }}
                                            onFocus={() => setShowCustomerList(true)}
                                            onBlur={() => setTimeout(() => setShowCustomerList(false), 200)}
                                        />
                                        {form.customerId && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                                                <CheckCircle2 className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>
                                    
                                    {showCustomerList && (
                                        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-xl">
                                            {filteredCustomerOptions.length > 0 ? (
                                                filteredCustomerOptions.map(c => (
                                                    <div 
                                                        key={c.id}
                                                        className="p-3 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-50 last:border-0"
                                                        onClick={() => {
                                                            setForm({...form, customerId: c.id});
                                                            setCustomerSearch(c.name);
                                                            setShowCustomerList(false);
                                                        }}
                                                    >
                                                        <div className="font-bold text-slate-800">{c.name}</div>
                                                        <div className="text-xs text-slate-500">{c.phone}</div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-4 text-center text-sm text-gray-400">
                                                    ไม่พบลูกค้าที่ค้นหา
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">สินค้า/บริการ</label>
                                <input required className="w-full border rounded-lg p-2" placeholder="เช่น กรอบ Rayban + เลนส์ Hoya" value={form.productName} onChange={e => setForm({...form, productName: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ยอดรวม (บาท)</label>
                                    <input required type="number" className="w-full border rounded-lg p-2" value={form.totalAmount || ''} onChange={e => setForm({...form, totalAmount: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">เงินดาวน์ (บาท)</label>
                                    <input type="number" className="w-full border rounded-lg p-2" value={form.downPayment || ''} onChange={e => setForm({...form, downPayment: Number(e.target.value)})} />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนงวด</label>
                                    <select className="w-full border rounded-lg p-2" value={form.months} onChange={e => setForm({...form, months: Number(e.target.value)})}>
                                        {[2,3,4,6,10,12].map(m => <option key={m} value={m}>{m} เดือน</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ดอกเบี้ย (%)</label>
                                    <input type="number" step="0.1" className="w-full border rounded-lg p-2" value={form.interestRate} onChange={e => setForm({...form, interestRate: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">เริ่มผ่อน</label>
                                    <input type="date" className="w-full border rounded-lg p-2" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
                                </div>
                            </div>
                            
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-4">
                                <div className="flex justify-between text-sm mb-1">
                                    <span>ยอดจัดผ่อน:</span>
                                    <span className="font-bold">฿{(form.totalAmount - form.downPayment).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm mb-1 text-blue-700">
                                    <span>ผ่อนต่อเดือน (ประมาณ):</span>
                                    <span className="font-bold">฿{Math.ceil(((form.totalAmount - form.downPayment) * (1 + form.interestRate/100)) / form.months).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">ยกเลิก</button>
                                <button type="submit" className="px-6 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg shadow-sm">สร้างแผน</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Pay Modal */}
            {isPayModalOpen && payConfig && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b bg-green-50">
                            <h3 className="text-lg font-bold text-green-800 flex items-center gap-2">
                                <CreditCard className="w-5 h-5"/> ชำระค่างวด
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="text-center mb-4">
                                <div className="text-sm text-gray-500">งวดที่ {payConfig.schedule.term}</div>
                                <div className="text-3xl font-bold text-gray-800">฿{payConfig.schedule.amount.toLocaleString()}</div>
                                <div className="text-xs text-gray-400 mt-1">กำหนดชำระ: {new Date(payConfig.schedule.dueDate).toLocaleDateString('th-TH')}</div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ช่องทางชำระ</label>
                                <select className="w-full border rounded-lg p-2" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                    <option value="เงินสด">เงินสด</option>
                                    <option value="โอนเงิน">โอนเงิน</option>
                                    <option value="บัตรเครดิต">บัตรเครดิต</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button onClick={() => setIsPayModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">ยกเลิก</button>
                                <button onClick={handlePaySubmit} className="px-6 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg shadow-sm">ยืนยันการชำระ</button>
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
                message="คุณต้องการลบแผนการผ่อนชำระนี้ใช่หรือไม่? ประวัติการชำระเงินเดิมจะยังคงอยู่"
                confirmText="ลบข้อมูล"
            />
        </div>
    );
};

export default Installments;
