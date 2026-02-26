
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Job } from '../types';
import { 
  CheckCircle2, Clock, Package, Check, Trash2, Search, 
  ArrowRight, ArrowLeft, Calendar, AlertCircle, User, FileText, MoreHorizontal, Plus, ChevronRight, Filter, RotateCcw, X
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

const Jobs = () => {
    const { jobs, customers, addJob, updateJobStatus, deleteJob } = useData();
    const { addToast } = useToast();
    
    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Advanced Search
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: '',
        status: 'all'
    });

    // Customer Search in Modal
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerList, setShowCustomerList] = useState(false);

    // New Job Form State
    const [newJob, setNewJob] = useState<{
        customerId: string;
        items: string;
        pickupDate: string;
        status: Job['status'];
    }>({
        customerId: '',
        items: '',
        pickupDate: new Date().toISOString().split('T')[0],
        status: 'รอเลนส์'
    });

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

    // Group jobs by status
    const statuses: Job['status'][] = ['รอเลนส์', 'กำลังประกอบ', 'พร้อมรับ', 'รับแล้ว'];

    const getStatusConfig = (status: string) => {
        switch(status) {
            case 'รอเลนส์': return { 
                color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', 
                header: 'bg-amber-100', icon: Package, label: 'รอเลนส์ / สินค้า' 
            };
            case 'กำลังประกอบ': return { 
                color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', 
                header: 'bg-blue-100', icon: Clock, label: 'กำลังประกอบ' 
            };
            case 'พร้อมรับ': return { 
                color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', 
                header: 'bg-green-100', icon: CheckCircle2, label: 'พร้อมรับ' 
            };
            case 'รับแล้ว': return { 
                color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', 
                header: 'bg-slate-100', icon: Check, label: 'รับแล้ว (History)' 
            };
            default: return { color: '', bg: '', border: '', header: '', icon: Package, label: status };
        }
    };

    const getUrgency = (pickupDate: string, status: string) => {
        if (status === 'รับแล้ว') return null;
        const today = new Date();
        today.setHours(0,0,0,0);
        const due = new Date(pickupDate);
        due.setHours(0,0,0,0);
        
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { label: `เกินกำหนด ${Math.abs(diffDays)} วัน`, color: 'text-red-600 bg-red-50 border-red-100' };
        if (diffDays === 0) return { label: 'ต้องเสร็จวันนี้', color: 'text-orange-600 bg-orange-50 border-orange-100' };
        if (diffDays <= 2) return { label: `เหลือ ${diffDays} วัน`, color: 'text-yellow-600 bg-yellow-50 border-yellow-100' };
        return { label: `อีก ${diffDays} วัน`, color: 'text-slate-500 bg-slate-100 border-slate-200' };
    };

    const handleStatusUpdate = (id: string, status: Job['status']) => {
        updateJobStatus(id, status);
        addToast('อัปเดตแล้ว', `เปลี่ยนสถานะงานเป็น "${status}" เรียบร้อย`);
    }

    const handleAddJob = (e: React.FormEvent) => {
        e.preventDefault();
        addJob({
            customerId: newJob.customerId,
            orderDate: new Date().toISOString().split('T')[0],
            pickupDate: newJob.pickupDate,
            status: newJob.status,
            items: [newJob.items] // Simple array for manual entry
        });
        addToast('บันทึกสำเร็จ', 'เพิ่มงานใหม่เข้าระบบเรียบร้อย');
        setIsModalOpen(false);
        setNewJob({ customerId: '', items: '', pickupDate: new Date().toISOString().split('T')[0], status: 'รอเลนส์' });
        setCustomerSearch('');
    };

    const confirmDelete = () => {
        if (deleteId) {
            deleteJob(deleteId);
            addToast('ลบข้อมูลแล้ว', 'ลบงานออกจากระบบเรียบร้อย');
            setDeleteId(null);
        }
    };

    const openCreateModal = () => {
        setCustomerSearch('');
        setNewJob({ customerId: '', items: '', pickupDate: new Date().toISOString().split('T')[0], status: 'รอเลนส์' });
        setIsModalOpen(true);
    };

    const clearFilters = () => {
        setFilters({ dateFrom: '', dateTo: '', status: 'all' });
        setSearchTerm('');
    };

    // Filter jobs
    const filteredJobs = jobs.filter(job => {
        // Robust ID Matching (String/Number safe)
        const customer = customers.find(c => String(c.id) === String(job.customerId));
        const term = (searchTerm || '').toLowerCase();
        
        const basicMatch = (
            (customer?.name || '').toLowerCase().includes(term) ||
            String(job.id).toLowerCase().includes(term) ||
            (Array.isArray(job.items) ? job.items : []).some(i => (i || '').toLowerCase().includes(term))
        );

        if (!basicMatch) return false;

        if (showAdvancedSearch) {
            if (filters.status !== 'all' && job.status !== filters.status) return false;
            if (filters.dateFrom && job.pickupDate < filters.dateFrom) return false;
            if (filters.dateTo && job.pickupDate > filters.dateTo) return false;
        }

        return true;
    });

    return (
        <div className="h-full flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">ติดตามงาน (Job Tracking)</h1>
                    <p className="text-gray-500 text-sm">สถานะงานประกอบแว่นและสั่งทำเลนส์</p>
                </div>
                
                <div className="flex gap-3 w-full sm:w-auto">
                    {/* Search Bar */}
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                            type="text" 
                            placeholder="ค้นหาชื่องาน, ลูกค้า..." 
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                        className={`px-3 py-2 rounded-xl border flex items-center gap-2 transition-colors ${showAdvancedSearch ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Filter className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={openCreateModal}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-md shadow-primary-200 transition-all active:scale-95 whitespace-nowrap"
                    >
                        <Plus className="w-5 h-5"/> <span className="hidden sm:inline">เพิ่มงานใหม่</span>
                    </button>
                </div>
            </div>

            {/* Advanced Search Panel */}
            {showAdvancedSearch && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                        <div className="sm:col-span-1">
                            <label className="block text-xs font-medium text-slate-500 mb-1">วันนัดรับ (จาก)</label>
                            <input 
                                type="date" 
                                className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                                value={filters.dateFrom}
                                onChange={e => setFilters({...filters, dateFrom: e.target.value})}
                            />
                        </div>
                        <div className="sm:col-span-1">
                            <label className="block text-xs font-medium text-slate-500 mb-1">วันนัดรับ (ถึง)</label>
                            <input 
                                type="date" 
                                className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                                value={filters.dateTo}
                                onChange={e => setFilters({...filters, dateTo: e.target.value})}
                            />
                        </div>
                        <div className="sm:col-span-1">
                            <label className="block text-xs font-medium text-slate-500 mb-1">สถานะ</label>
                            <select
                                className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                                value={filters.status}
                                onChange={e => setFilters({...filters, status: e.target.value})}
                            >
                                <option value="all">ทั้งหมด</option>
                                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <button 
                            onClick={clearFilters}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-slate-200 h-[38px] flex items-center justify-center"
                            title="ล้างตัวกรอง"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
            
            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto pb-2">
                <div className="flex gap-6 min-w-[1000px] h-full">
                    {statuses.map(status => {
                        const config = getStatusConfig(status);
                        // If status filter is active and not matching, don't show cards in this column (or show empty to keep structure)
                        // Actually, better to just filter the jobs within the column.
                        const columnJobs = filteredJobs.filter(j => j.status === status);
                        const StatusIcon = config.icon;

                        return (
                            <div key={status} className="flex-1 min-w-[280px] max-w-[350px] flex flex-col h-full">
                                {/* Column Header */}
                                <div className={`flex items-center justify-between p-3 rounded-t-xl border-t border-x ${config.border} ${config.header} border-b-2 border-b-white`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg bg-white/60 ${config.color}`}>
                                            <StatusIcon className="w-4 h-4" />
                                        </div>
                                        <h3 className={`font-bold text-sm ${config.color}`}>{config.label}</h3>
                                    </div>
                                    <span className="bg-white/80 px-2 py-0.5 rounded-md text-xs font-bold text-slate-600 shadow-sm">
                                        {columnJobs.length}
                                    </span>
                                </div>
                                
                                {/* Drop Area / List */}
                                <div className={`flex-1 bg-slate-50/50 border-x border-b ${config.border} rounded-b-xl p-3 overflow-y-auto custom-scrollbar`}>
                                    <div className="space-y-3">
                                        {columnJobs.map(job => {
                                            // Robust ID Check
                                            const customer = customers.find(c => String(c.id) === String(job.customerId));
                                            const urgency = getUrgency(job.pickupDate, status);

                                            return (
                                                <div key={job.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all group relative animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                    {/* Card Header */}
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                                                                {(customer?.name || '').charAt(0) || '?'}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-sm text-slate-800 line-clamp-1">
                                                                    {customer?.name || <span className="text-slate-400 italic">ไม่พบลูกค้า</span>}
                                                                </h4>
                                                                <div className="text-[10px] text-slate-400 font-mono">Job ID: {String(job.id).substring(0,6)}</div>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => setDeleteId(job.id)}
                                                            className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                            title="ลบงาน"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>

                                                    {/* Items */}
                                                    <div className="mb-3">
                                                        <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                            <FileText className="w-3.5 h-3.5 mt-0.5 text-slate-400 flex-shrink-0"/>
                                                            <span className="line-clamp-3 leading-relaxed">{(Array.isArray(job.items) ? job.items : []).join(', ')}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Footer Info */}
                                                    <div className="flex justify-between items-center mb-3">
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            <span>รับ: {new Date(job.pickupDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                                                        </div>
                                                        {urgency && (
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgency.color}`}>
                                                                {urgency.label}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                                                        {status !== 'รอเลนส์' && (
                                                            <button 
                                                                onClick={() => handleStatusUpdate(job.id, statuses[statuses.indexOf(status) - 1])} 
                                                                className="flex-1 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors flex items-center justify-center gap-1"
                                                            >
                                                                <ArrowLeft className="w-3 h-3"/> ย้อนกลับ
                                                            </button>
                                                        )}
                                                        {status !== 'รับแล้ว' ? (
                                                            <button 
                                                                onClick={() => handleStatusUpdate(job.id, statuses[statuses.indexOf(status) + 1])} 
                                                                className="flex-1 py-1.5 rounded-lg text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors flex items-center justify-center gap-1 shadow-sm"
                                                            >
                                                                ถัดไป <ArrowRight className="w-3 h-3"/>
                                                            </button>
                                                        ) : (
                                                            <div className="flex-1 text-center text-xs font-medium text-green-600 py-1.5 bg-green-50 rounded-lg flex items-center justify-center gap-1">
                                                                <Check className="w-3 h-3"/> เสร็จสิ้น
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {columnJobs.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                                <div className="p-3 bg-white rounded-full mb-2 opacity-50 shadow-sm border border-slate-100">
                                                    <StatusIcon className="w-6 h-6" />
                                                </div>
                                                <span className="text-xs">ไม่มีงานในสถานะนี้</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Create Job Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Package className="w-5 h-5 text-primary-600"/> สร้างใบงานใหม่
                            </h3>
                        </div>
                        <form onSubmit={handleAddJob} className="p-6 space-y-5 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">เลือกลูกค้า</label>
                                <div className="relative">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                        <input 
                                            type="text"
                                            required={!newJob.customerId}
                                            className="w-full pl-10 border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                            placeholder="ค้นหาชื่อ หรือ เบอร์โทรลูกค้า..."
                                            value={customerSearch}
                                            onChange={(e) => {
                                                setCustomerSearch(e.target.value);
                                                setShowCustomerList(true);
                                                if (newJob.customerId) setNewJob({...newJob, customerId: ''});
                                            }}
                                            onFocus={() => setShowCustomerList(true)}
                                            onBlur={() => setTimeout(() => setShowCustomerList(false), 200)}
                                        />
                                        {newJob.customerId && (
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
                                                            setNewJob({...newJob, customerId: c.id});
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
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">รายการ / รายละเอียดงาน</label>
                                <textarea 
                                    required
                                    placeholder="เช่น กรอบ Rayban รุ่น Aviator + เลนส์ Hoya BlueControl..." 
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none" 
                                    rows={3} 
                                    value={newJob.items} 
                                    onChange={e => setNewJob({...newJob, items: e.target.value})} 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">วันนัดรับ</label>
                                    <input 
                                        required 
                                        type="date" 
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                        value={newJob.pickupDate} 
                                        onChange={e => setNewJob({...newJob, pickupDate: e.target.value})} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">สถานะเริ่มต้น</label>
                                    <select 
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white"
                                        value={newJob.status} 
                                        onChange={e => setNewJob({...newJob, status: e.target.value as Job['status']})} 
                                    >
                                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">ยกเลิก</button>
                                <button type="submit" className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-200 font-medium transition-colors">สร้างงาน</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="ลบงาน"
                message="คุณต้องการลบงานนี้ออกจากระบบติดตามใช่หรือไม่?"
                confirmText="ลบงาน"
            />
        </div>
    );
};

export default Jobs;
