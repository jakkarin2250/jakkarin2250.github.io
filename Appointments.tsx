
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Appointment } from '../types';
import { auth } from '../services/firebase';
import { 
    Calendar as CalIcon, Clock, User, Plus, Trash2, Search, 
    Phone, MapPin, ChevronRight, CalendarDays, History, Filter, PenTool, Edit, CheckCircle2, RotateCcw, X
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

const Appointments = () => {
    const { appointments, customers, addAppointment, updateAppointment, deleteAppointment } = useData();
    const { addToast } = useToast();
    
    // State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
    const [newAppt, setNewAppt] = useState({ customerId: '', date: new Date().toISOString().split('T')[0], time: '', note: '' });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Advanced Search
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: ''
    });

    // Customer Search for Modal
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerList, setShowCustomerList] = useState(false);

    // Logic
    const todayStr = new Date().toISOString().split('T')[0];

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

    const processedAppointments = useMemo(() => {
        let filtered = appointments.filter(appt => {
            // Robust comparison: Convert both IDs to strings
            const customer = customers.find(c => String(c.id) === String(appt.customerId));
            const customerName = (customer?.name || '').toLowerCase();
            const search = (searchTerm || '').toLowerCase();
            
            const matchesTerm = customerName.includes(search) || (appt.note || '').toLowerCase().includes(search);
            if (!matchesTerm) return false;

            // Advanced Filters
            if (showAdvancedSearch) {
                if (filters.dateFrom && appt.date < filters.dateFrom) return false;
                if (filters.dateTo && appt.date > filters.dateTo) return false;
            }

            return true;
        });

        // Split by tab logic
        if (activeTab === 'upcoming') {
            filtered = filtered.filter(a => a.date >= todayStr);
        } else {
            filtered = filtered.filter(a => a.date < todayStr);
        }

        // Sort by Date & Time
        return filtered.sort((a,b) => new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime());
    }, [appointments, customers, searchTerm, activeTab, todayStr, showAdvancedSearch, filters]);

    // Group by Date for Timeline View
    const groupedAppointments = useMemo(() => {
        const groups: Record<string, Appointment[]> = {};
        processedAppointments.forEach(appt => {
            if (!groups[appt.date]) groups[appt.date] = [];
            groups[appt.date].push(appt);
        });
        return groups;
    }, [processedAppointments]);

    // Stats
    const todayCount = appointments.filter(a => a.date === todayStr).length;
    const upcomingCount = appointments.filter(a => a.date >= todayStr).length;

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Use Email if available, otherwise display name, otherwise System
        const recorderName = auth.currentUser?.email || auth.currentUser?.displayName || 'System';

        if (editingId) {
            updateAppointment(editingId, {
                ...newAppt,
                recordedBy: recorderName // Update recorder on edit? Optional, keeping it for tracking latest change
            });
            addToast('อัปเดตเรียบร้อย', 'แก้ไขข้อมูลนัดหมายสำเร็จ');
        } else {
            addAppointment({
                ...newAppt,
                recordedBy: recorderName
            });
            addToast('บันทึกเรียบร้อย', 'เพิ่มนัดหมายใหม่สำเร็จแล้ว');
        }
        
        setIsModalOpen(false);
        setEditingId(null);
        setNewAppt({ customerId: '', date: new Date().toISOString().split('T')[0], time: '', note: '' });
        setCustomerSearch('');
    };

    const openEdit = (appt: Appointment) => {
        setEditingId(appt.id);
        const customer = customers.find(c => c.id === appt.customerId);
        setCustomerSearch(customer?.name || '');
        setNewAppt({
            customerId: appt.customerId,
            date: appt.date,
            time: appt.time,
            note: appt.note
        });
        setIsModalOpen(true);
    };

    const openAdd = () => {
        setEditingId(null);
        setCustomerSearch('');
        setNewAppt({ customerId: '', date: new Date().toISOString().split('T')[0], time: '', note: '' });
        setIsModalOpen(true);
    };

    const confirmDelete = () => {
        if (deleteId) {
            deleteAppointment(deleteId);
            addToast('ลบข้อมูลแล้ว', 'ยกเลิกนัดหมายเรียบร้อย');
            setDeleteId(null);
        }
    };

    const clearFilters = () => {
        setFilters({ dateFrom: '', dateTo: '' });
    };

    const getDayLabel = (dateStr: string) => {
        if (dateStr === todayStr) return 'วันนี้ (Today)';
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (dateStr === tomorrow.toISOString().split('T')[0]) return 'พรุ่งนี้ (Tomorrow)';
        
        return new Date(dateStr).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    return (
        <div className="h-full flex flex-col gap-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <CalendarDays className="w-7 h-7 text-primary-600" /> ตารางนัดหมาย
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">จัดการตารางเวลาและการนัดหมายลูกค้า</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                            type="text" 
                            placeholder="ค้นหาลูกค้า..." 
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm transition-all"
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
                        onClick={openAdd} 
                        className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-md shadow-primary-200 transition-all active:scale-95 whitespace-nowrap"
                    >
                        <Plus className="w-5 h-5"/> <span className="hidden sm:inline">เพิ่มนัดหมาย</span>
                    </button>
                </div>
            </div>

            {/* Advanced Search Panel */}
            {showAdvancedSearch && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-medium text-slate-500 mb-1">วันที่ (จาก)</label>
                            <input 
                                type="date" 
                                className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                                value={filters.dateFrom}
                                onChange={e => setFilters({...filters, dateFrom: e.target.value})}
                            />
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-medium text-slate-500 mb-1">วันที่ (ถึง)</label>
                            <input 
                                type="date" 
                                className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                                value={filters.dateTo}
                                onChange={e => setFilters({...filters, dateTo: e.target.value})}
                            />
                        </div>
                        <button 
                            onClick={clearFilters}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-slate-200"
                            title="ล้างตัวกรอง"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Stats & Tabs */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Stats Column */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Clock className="w-24 h-24" />
                        </div>
                        <p className="text-blue-100 text-sm font-medium mb-1">นัดหมายวันนี้</p>
                        <h2 className="text-4xl font-bold">{todayCount}</h2>
                        <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between text-xs text-blue-100">
                            <span>ทั้งหมดที่รออยู่</span>
                            <span className="font-bold bg-white/20 px-2 py-0.5 rounded">{upcomingCount} รายการ</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2">
                        <button 
                            onClick={() => setActiveTab('upcoming')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'upcoming' ? 'bg-slate-50 text-primary-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <div className={`p-2 rounded-lg ${activeTab === 'upcoming' ? 'bg-white shadow-sm text-primary-600' : 'bg-slate-100'}`}>
                                <CalendarDays className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <div className="text-sm">กำลังจะมาถึง</div>
                                <div className="text-[10px] opacity-70">Upcoming</div>
                            </div>
                            {activeTab === 'upcoming' && <ChevronRight className="w-4 h-4 ml-auto text-primary-400" />}
                        </button>
                        
                        <button 
                            onClick={() => setActiveTab('history')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'history' ? 'bg-slate-50 text-slate-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <div className={`p-2 rounded-lg ${activeTab === 'history' ? 'bg-white shadow-sm text-slate-600' : 'bg-slate-100'}`}>
                                <History className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <div className="text-sm">ประวัติย้อนหลัง</div>
                                <div className="text-[10px] opacity-70">History</div>
                            </div>
                            {activeTab === 'history' && <ChevronRight className="w-4 h-4 ml-auto text-slate-400" />}
                        </button>
                    </div>
                </div>

                {/* Right Timeline Column */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 min-h-[500px] flex flex-col">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                {activeTab === 'upcoming' ? '📅 รายการนัดหมาย (Upcoming)' : '📜 ประวัติการนัด (History)'}
                            </h3>
                            <span className="text-xs text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                                {processedAppointments.length} รายการ
                            </span>
                        </div>
                        
                        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                            {Object.keys(groupedAppointments).length > 0 ? (
                                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                    {Object.entries(groupedAppointments).map(([date, appts]) => (
                                        <div key={date} className="relative flex items-start group is-active">
                                            {/* Date Marker */}
                                            <div className="absolute left-0 md:left-1/2 ml-5 md:ml-0 md:-translate-x-1/2 mt-1">
                                                <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${date === todayStr ? 'bg-primary-500 ring-4 ring-primary-100' : 'bg-slate-300'}`}></div>
                                            </div>

                                            <div className="w-full pl-10 md:pl-0 md:grid md:grid-cols-2 md:gap-16">
                                                {/* Date Label */}
                                                <div className="md:text-right mb-2 md:mb-0 md:mt-0.5">
                                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold shadow-sm ${date === todayStr ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'}`}>
                                                        {getDayLabel(date)}
                                                    </span>
                                                </div>

                                                {/* Cards */}
                                                <div className="space-y-3">
                                                    {(appts as Appointment[]).map(appt => {
                                                        // Robust comparison
                                                        const customer = customers.find(c => String(c.id) === String(appt.customerId));
                                                        
                                                        return (
                                                            <div key={appt.id} className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-primary-200 transition-all group/card relative">
                                                                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity bg-white/80 p-1 rounded-lg backdrop-blur-sm shadow-sm">
                                                                    <button 
                                                                        onClick={() => openEdit(appt)}
                                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                                        title="แก้ไข"
                                                                    >
                                                                        <Edit className="w-4 h-4"/>
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => setDeleteId(appt.id)}
                                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                                        title="ยกเลิกนัด"
                                                                    >
                                                                        <Trash2 className="w-4 h-4"/>
                                                                    </button>
                                                                </div>

                                                                <div className="flex items-start gap-4">
                                                                    <div className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px] ${date === todayStr ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-600'}`}>
                                                                        <span className="text-lg font-bold leading-none">{appt.time}</span>
                                                                        <span className="text-[10px] uppercase font-medium">น.</span>
                                                                    </div>
                                                                    
                                                                    <div className="flex-1 min-w-0">
                                                                        <h4 className="font-bold text-lg text-slate-800 truncate pr-6">
                                                                            {customer?.name || <span className="text-slate-400 italic font-normal">ไม่พบข้อมูลลูกค้า (ID: {appt.customerId})</span>}
                                                                        </h4>
                                                                        
                                                                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                                                            {customer?.phone && (
                                                                                <span className="flex items-center gap-1 hover:text-primary-600 cursor-pointer">
                                                                                    <Phone className="w-3 h-3"/> {customer.phone}
                                                                                </span>
                                                                            )}
                                                                            {customer?.gender && <span className="flex items-center gap-1"><User className="w-3 h-3"/> {customer.gender}</span>}
                                                                        </div>
                                                                        
                                                                        {appt.note && (
                                                                            <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 italic">
                                                                                "{appt.note}"
                                                                            </div>
                                                                        )}

                                                                        <div className="mt-2 text-[10px] text-slate-400 flex justify-end items-center gap-1">
                                                                            <PenTool className="w-3 h-3 opacity-50"/> ผู้ลงนัด: {appt.recordedBy || 'System'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                        <CalendarDays className="w-8 h-8 opacity-20" />
                                    </div>
                                    <p className="text-sm">ไม่มีรายการนัดหมาย{activeTab === 'upcoming' ? 'เร็วๆ นี้' : 'ในช่วงนี้'}</p>
                                    {activeTab === 'upcoming' && (
                                        <button onClick={openAdd} className="mt-4 text-primary-600 hover:text-primary-700 text-sm font-medium hover:underline">
                                            + เพิ่มนัดหมายใหม่
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-primary-600"/> {editingId ? 'แก้ไขนัดหมาย' : 'นัดหมายลูกค้าใหม่'}
                            </h3>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">เลือกลูกค้า</label>
                                <div className="relative">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                        <input 
                                            type="text"
                                            required={!newAppt.customerId}
                                            className="w-full pl-10 border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                            placeholder="ค้นหาชื่อ หรือ เบอร์โทรลูกค้า..."
                                            value={customerSearch}
                                            onChange={(e) => {
                                                setCustomerSearch(e.target.value);
                                                setShowCustomerList(true);
                                                if (newAppt.customerId) setNewAppt({...newAppt, customerId: ''});
                                            }}
                                            onFocus={() => setShowCustomerList(true)}
                                            onBlur={() => setTimeout(() => setShowCustomerList(false), 200)}
                                            disabled={!!editingId} // Disable customer change when editing
                                        />
                                        {newAppt.customerId && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                                                <CheckCircle2 className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>
                                    
                                    {showCustomerList && !editingId && (
                                        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-xl">
                                            {filteredCustomerOptions.length > 0 ? (
                                                filteredCustomerOptions.map(c => (
                                                    <div 
                                                        key={c.id}
                                                        className="p-3 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-50 last:border-0"
                                                        onClick={() => {
                                                            setNewAppt({...newAppt, customerId: c.id});
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
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">วันที่</label>
                                    <input 
                                        required 
                                        type="date" 
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                        value={newAppt.date} 
                                        onChange={e => setNewAppt({...newAppt, date: e.target.value})} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">เวลา</label>
                                    <input 
                                        required 
                                        type="time" 
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                        value={newAppt.time} 
                                        onChange={e => setNewAppt({...newAppt, time: e.target.value})} 
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">รายละเอียดเพิ่มเติม</label>
                                <textarea 
                                    placeholder="เช่น วัดสายตา, รับแว่น, ปรับแต่งทรง..." 
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none" 
                                    rows={3} 
                                    value={newAppt.note} 
                                    onChange={e => setNewAppt({...newAppt, note: e.target.value})} 
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">ยกเลิก</button>
                                <button type="submit" className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-200 font-medium transition-colors">{editingId ? 'บันทึกแก้ไข' : 'บันทึกนัดหมาย'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="ยกเลิกนัดหมาย"
                message="คุณต้องการลบรายการนัดหมายนี้ออกจากปฏิทินใช่หรือไม่?"
                confirmText="ยืนยันการลบ"
            />
        </div>
    );
};

export default Appointments;
