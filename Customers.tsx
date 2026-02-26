
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Search, Plus, Filter, Eye, Edit, Trash2, FilePlus, FileText, Gift, DollarSign, AlertCircle, RotateCcw, X, Phone } from 'lucide-react';
import { Customer } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';

const PREFIXES = ['นาย', 'นาง', 'นางสาว', 'ด.ช.', 'ด.ญ.'];

const Customers = ({ onViewDetail, onAddPrescription, onIssueDocument }: { onViewDetail: (id: string) => void, onAddPrescription: (id: string) => void, onIssueDocument: (id: string) => void }) => {
  const { customers, prescriptions, purchases, addCustomer, updateCustomer, deleteCustomer, settings, recalculatePoints } = useData();
  const { addToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Advanced Search State
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
      gender: '',
      minAge: '',
      maxAge: '',
      minPoints: '',
      maxPoints: '',
      address: ''
  });
  
  // Confirmation Modal State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '', gender: '', age: 0, phone: '', address: ''
  });

  // Calculate Financial Stats & Prescription Stats per Customer
  const customerStats = useMemo(() => {
      const stats: Record<string, { totalSpent: number, outstanding: number, prescriptionCount: number, lastPrescriptionDate: string | null }> = {};
      
      customers.forEach(c => {
          // 1. From Prescriptions
          const customerPrescriptions = prescriptions.filter(p => String(p.customerId) === String(c.id));
          const rxTotal = customerPrescriptions.reduce((sum, p) => sum + (p.payment.framePrice + p.payment.lensPrice - p.payment.discount), 0);
          const rxOutstanding = customerPrescriptions.reduce((sum, p) => sum + p.payment.remaining, 0);

          // Get Prescription Stats
          const sortedRx = [...customerPrescriptions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const lastDate = sortedRx.length > 0 ? sortedRx[0].date : null;

          // 2. From General Purchases
          const customerPurchases = purchases.filter(p => String(p.customerId) === String(c.id));
          const purchaseTotal = customerPurchases.reduce((sum, p) => sum + p.total, 0);
          
          stats[String(c.id)] = { 
              totalSpent: rxTotal + purchaseTotal,
              outstanding: rxOutstanding,
              prescriptionCount: customerPrescriptions.length,
              lastPrescriptionDate: lastDate
          };
      });
      return stats;
  }, [customers, prescriptions, purchases]);

  // Filter and Sort Customers (A-Z / ก-ฮ)
  const filteredCustomers = customers
    .filter(c => {
      // 1. Basic Search
      const basicMatch = (c.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
                         (c.phone || '').includes(searchTerm || '');
      if (!basicMatch) return false;

      // 2. Advanced Filters
      if (showAdvancedSearch) {
          if (advancedFilters.gender && c.gender !== advancedFilters.gender) return false;
          if (advancedFilters.minAge && c.age < Number(advancedFilters.minAge)) return false;
          if (advancedFilters.maxAge && c.age > Number(advancedFilters.maxAge)) return false;
          
          if (settings.enablePoints) {
             if (advancedFilters.minPoints && (c.points || 0) < Number(advancedFilters.minPoints)) return false;
             if (advancedFilters.maxPoints && (c.points || 0) > Number(advancedFilters.maxPoints)) return false;
          }
          
          if (advancedFilters.address && !(c.address || '').toLowerCase().includes((advancedFilters.address || '').toLowerCase())) return false;
      }
      
      return true;
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'th'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate Gender
    if (!formData.gender) {
        addToast('กรุณาระบุข้อมูล', 'กรุณาเลือกเพศ', 'error');
        return;
    }

    // Check for Duplicates (Name)
    const inputName = formData.name?.trim() || '';
    const duplicateName = customers.find(c => (c.name || '').trim() === inputName && c.id !== editingId);
    if (duplicateName) {
        addToast('ไม่สามารถบันทึกได้', `ชื่อลูกค้า "${inputName}" มีอยู่ในระบบแล้ว`, 'error');
        return;
    }

    // Check for Duplicates (Phone)
    const inputPhone = formData.phone?.trim() || '';
    if (inputPhone) {
        const duplicatePhone = customers.find(c => (c.phone || '').trim() === inputPhone && c.id !== editingId);
        if (duplicatePhone) {
            addToast('ไม่สามารถบันทึกได้', `เบอร์โทรศัพท์ "${inputPhone}" มีอยู่ในระบบแล้ว`, 'error');
            return;
        }
    }

    try {
        if (editingId) {
          updateCustomer(editingId, formData);
          addToast('อัปเดตแล้ว', 'แก้ไขข้อมูลลูกค้าเรียบร้อยแล้ว');
          setIsModalOpen(false);
          setEditingId(null);
          setFormData({ name: '', gender: '', age: 0, phone: '', address: '' });
        } else {
          // If adding new customer, wait for ID then redirect to prescription
          const newId = await addCustomer(formData as Omit<Customer, 'id' | 'createdAt'>);
          addToast('บันทึกเรียบร้อย', 'เพิ่มลูกค้าใหม่ลงในระบบแล้ว');
          setIsModalOpen(false);
          setEditingId(null);
          setFormData({ name: '', gender: '', age: 0, phone: '', address: '' });
          
          // Auto Redirect to Add Prescription
          setTimeout(() => {
              onAddPrescription(newId);
          }, 100);
        }
    } catch (error) {
        addToast('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    }
  };

  const confirmDelete = async () => {
    if (deleteId) {
        try {
            await deleteCustomer(deleteId);
            addToast('ลบข้อมูลแล้ว', 'นำรายชื่อออกจากระบบเรียบร้อย');
        } catch (error) {
            addToast('เกิดข้อผิดพลาด', 'ไม่สามารถลบข้อมูลได้', 'error');
        }
        setDeleteId(null);
    }
  };

  const handleSyncAllPoints = async () => {
    if (!settings.enablePoints) return;
    if (!window.confirm('คุณต้องการคำนวณแต้มสะสมใหม่ทั้งหมดจากยอดซื้อในอดีตใช่หรือไม่?\n(ขั้นตอนนี้อาจใช้เวลาสักครู่)')) return;

    setIsSyncing(true);
    let count = 0;
    try {
        // Use a loop to process sequentially or Promise.all for parallel (careful with DB rate limits)
        for (const customer of customers) {
            await recalculatePoints(customer.id);
            count++;
        }
        addToast('คำนวณสำเร็จ', `ปรับปรุงแต้มสะสมย้อนหลังให้ลูกค้า ${count} รายเรียบร้อย`);
    } catch (error) {
        addToast('เกิดข้อผิดพลาด', 'ไม่สามารถคำนวณแต้มได้ครบถ้วน', 'error');
    } finally {
        setIsSyncing(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    // age: '' allows the placeholder to show. Cast as any to bypass strict number type check for empty state.
    setFormData({ name: '', gender: '', age: '' as any, phone: '', address: '' });
    setIsModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditingId(c.id);
    setFormData(c);
    setIsModalOpen(true);
  };

  const clearAdvancedFilters = () => {
      setAdvancedFilters({
          gender: '',
          minAge: '',
          maxAge: '',
          minPoints: '',
          maxPoints: '',
          address: ''
      });
  };

  const handlePrefixClick = (prefix: string) => {
      let currentName = formData.name || '';
      const existingPrefix = PREFIXES.find(p => currentName.startsWith(p));
      
      if (existingPrefix) {
          if (existingPrefix === prefix) return; // Do nothing if same
          // Replace prefix
          setFormData({ ...formData, name: currentName.replace(existingPrefix, prefix) });
      } else {
          // Prepend prefix
          setFormData({ ...formData, name: `${prefix}${currentName}` });
      }
  };

  const hasActiveAdvancedFilters = Object.values(advancedFilters).some(val => val !== '');
  const isFiltering = (searchTerm || '').trim() !== '' || hasActiveAdvancedFilters;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">จัดการลูกค้า</h1>
          <p className="text-gray-500 dark:text-slate-400">
            {isFiltering 
                ? `ค้นพบ ${filteredCustomers.length} รายชื่อ (จากทั้งหมด ${customers.length} คน)`
                : `รายชื่อลูกค้าทั้งหมด ${customers.length} คน`
            }
          </p>
        </div>
        <div className="flex gap-2">
            {settings.enablePoints && (
                <button 
                    onClick={handleSyncAllPoints} 
                    disabled={isSyncing}
                    className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                    <RotateCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> 
                    {isSyncing ? 'กำลังคำนวณ...' : 'คำนวณแต้มย้อนหลัง'}
                </button>
            )}
            <button onClick={openAdd} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
              <Plus className="w-4 h-4" /> เพิ่มลูกค้าใหม่
            </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col gap-4 transition-all duration-300">
        <div className="flex gap-4">
            <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
                type="text"
                placeholder="ค้นหาชื่อ หรือ เบอร์โทรศัพท์..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 transition-colors"
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
                className={`p-2 rounded-lg border transition-colors flex items-center gap-2 px-3 ${showAdvancedSearch ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-400' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 border-gray-200 dark:border-slate-600'}`}
            >
            <Filter className="w-5 h-5" />
            <span className="hidden sm:inline">ตัวกรองขั้นสูง</span>
            </button>
        </div>

        {/* Advanced Search Panel */}
        {showAdvancedSearch && (
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600 animate-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">เพศ (Gender)</label>
                        <select 
                            className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            value={advancedFilters.gender}
                            onChange={e => setAdvancedFilters({...advancedFilters, gender: e.target.value})}
                        >
                            <option value="">ทั้งหมด</option>
                            <option value="ชาย">ชาย</option>
                            <option value="หญิง">หญิง</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">ช่วงอายุ (Age)</label>
                        <div className="flex gap-2 items-center">
                            <input 
                                type="number" placeholder="Min" 
                                className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                value={advancedFilters.minAge}
                                onChange={e => setAdvancedFilters({...advancedFilters, minAge: e.target.value})}
                            />
                            <span className="text-gray-400">-</span>
                            <input 
                                type="number" placeholder="Max" 
                                className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                value={advancedFilters.maxAge}
                                onChange={e => setAdvancedFilters({...advancedFilters, maxAge: e.target.value})}
                            />
                        </div>
                    </div>
                    {settings.enablePoints && (
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">แต้มสะสม (Points)</label>
                        <div className="flex gap-2 items-center">
                            <input 
                                type="number" placeholder="Min" 
                                className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                value={advancedFilters.minPoints}
                                onChange={e => setAdvancedFilters({...advancedFilters, minPoints: e.target.value})}
                            />
                            <span className="text-gray-400">-</span>
                            <input 
                                type="number" placeholder="Max" 
                                className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                value={advancedFilters.maxPoints}
                                onChange={e => setAdvancedFilters({...advancedFilters, maxPoints: e.target.value})}
                            />
                        </div>
                    </div>
                    )}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">ที่อยู่ (Address)</label>
                        <input 
                            type="text" placeholder="ระบุจังหวัด หรือ เขต..." 
                            className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            value={advancedFilters.address}
                            onChange={e => setAdvancedFilters({...advancedFilters, address: e.target.value})}
                        />
                    </div>
                </div>
                <div className="flex justify-end mt-4 pt-3 border-t border-slate-200 dark:border-slate-600">
                    <button 
                        onClick={clearAdvancedFilters}
                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 bg-white dark:bg-slate-700 border border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <RotateCcw className="w-3 h-3" /> ล้างตัวกรอง
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-all duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700 text-xs uppercase text-gray-500 dark:text-slate-400 font-semibold">
                <th className="px-6 py-4">ลูกค้า</th>
                <th className="px-6 py-4">สถานะการเงิน</th>
                <th className="px-6 py-4">เบอร์โทร & ประวัติ</th>
                {settings.enablePoints && <th className="px-6 py-4 text-center">แต้มสะสม</th>}
                <th className="px-6 py-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {filteredCustomers.length > 0 ? filteredCustomers.map((customer, index) => {
                const stats = customerStats[String(customer.id)] || { totalSpent: 0, outstanding: 0, prescriptionCount: 0, lastPrescriptionDate: null };
                return (
                  <tr key={customer.id || `cust-${index}`} id={`customer-${customer.id}`} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-sm mr-3">
                          {(customer.name || '').charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-slate-100">{customer.name}</div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">{customer.gender}, {customer.age} ปี</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                            <div className="text-sm text-gray-600 dark:text-slate-300 flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-gray-400"/> 
                                <span>ยอดซื้อ: <span className="font-bold text-gray-800 dark:text-white">฿{stats.totalSpent.toLocaleString()}</span></span>
                            </div>
                            {stats.outstanding > 0 && (
                                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full w-fit font-bold border border-red-100 dark:border-red-900/30 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3"/> ค้างจ่าย: ฿{stats.outstanding.toLocaleString()}
                                </div>
                            )}
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1">
                            <a href={`tel:${customer.phone}`} className="text-sm text-slate-600 dark:text-slate-300 font-mono hover:text-primary-600 hover:underline flex items-center gap-1 transition-colors">
                                <Phone className="w-3 h-3" /> {customer.phone}
                            </a>
                            {stats.prescriptionCount > 0 && (
                                <div className="text-xs text-slate-400">
                                    <div>วัดสายตา {stats.prescriptionCount} ครั้ง</div>
                                    {stats.lastPrescriptionDate && (
                                        <div className="text-[10px] mt-0.5 text-slate-500 dark:text-slate-500">
                                            ล่าสุด: {new Date(stats.lastPrescriptionDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </td>
                    {settings.enablePoints && (
                        <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                                <Gift className="w-3 h-3 mr-1.5" />
                                {customer.points || 0}
                            </span>
                        </td>
                    )}
                    <td className="px-6 py-4 text-right space-x-1">
                      <button onClick={() => onAddPrescription(customer.id)} className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="เพิ่มใบวัดสายตา"><FilePlus className="w-4 h-4" /></button>
                      <button onClick={() => onIssueDocument(customer.id)} className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors" title="ออกเอกสาร"><FileText className="w-4 h-4" /></button>
                      <button onClick={() => {
                        if (customer.id) {
                            onViewDetail(customer.id);
                        } else {
                            addToast('เกิดข้อผิดพลาด', 'ไม่พบรหัสลูกค้า', 'error');
                        }
                      }} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="ดูรายละเอียด"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => openEdit(customer)} className="p-1.5 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors" title="แก้ไข"><Edit className="w-4 h-4" /></button>
                      <button type="button" onClick={() => setDeleteId(customer.id)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="ลบ"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                );
              }) : (
                <tr key="empty-state">
                  <td colSpan={settings.enablePoints ? 5 : 4} className="px-6 py-10 text-center text-gray-400 dark:text-slate-500">ไม่พบข้อมูลลูกค้า</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="ลบข้อมูลลูกค้า"
        message={`คุณต้องการลบรายชื่อลูกค้า "${customers.find(c => c.id === deleteId)?.name || ''}" ใช่หรือไม่?\n\nข้อมูลประวัติการวัดสายตา การชำระเงิน และแต้มสะสมทั้งหมดของลูกค้ารายนี้จะถูกลบไปด้วย`}
        confirmText="ลบข้อมูล"
      />

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">{editingId ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">ชื่อ-นามสกุล</label>
                
                {/* Prefix Quick Select */}
                <div className="flex gap-2 mb-2 flex-wrap">
                    {PREFIXES.map(prefix => {
                        const isActive = formData.name?.startsWith(prefix);
                        return (
                            <button
                                key={prefix}
                                type="button"
                                onClick={() => handlePrefixClick(prefix)}
                                className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                                    isActive 
                                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800 font-bold' 
                                    : 'bg-white dark:bg-slate-700 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600'
                                }`}
                            >
                                {prefix}
                            </button>
                        );
                    })}
                </div>

                <input 
                    required 
                    type="text" 
                    placeholder="กรุณากรอก ชื่อ - นามสกุล" 
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-slate-700 dark:text-white placeholder:text-gray-400" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">เพศ</label>
                  <select 
                    required
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 outline-none bg-white dark:bg-slate-700 dark:text-white" 
                    value={formData.gender} 
                    onChange={e => setFormData({...formData, gender: e.target.value})}
                  >
                    <option value="" disabled>กรุณาเลือกเพศ</option>
                    <option value="ชาย">ชาย</option>
                    <option value="หญิง">หญิง</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">อายุ (ปี)</label>
                  <input 
                    required 
                    type="number" 
                    placeholder="อายุ" 
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 outline-none bg-white dark:bg-slate-700 dark:text-white placeholder:text-gray-400" 
                    value={formData.age || ''} 
                    onChange={e => setFormData({...formData, age: parseInt(e.target.value)})} 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">เบอร์โทรศัพท์</label>
                <input 
                    required 
                    type="tel" 
                    maxLength={10}
                    placeholder="กรุณากรอกเบอร์โทรศัพท์" 
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 outline-none bg-white dark:bg-slate-700 dark:text-white placeholder:text-gray-400" 
                    value={formData.phone} 
                    onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 10) setFormData({...formData, phone: val});
                    }} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ที่อยู่</label>
                <textarea 
                    rows={3}
                    placeholder="กรุณากรอก ที่อยู่" 
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 outline-none bg-white dark:bg-slate-700 dark:text-white resize-none placeholder:text-gray-400"
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})} 
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">ยกเลิก</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm transition-colors">{editingId ? 'บันทึกการแก้ไข' : 'บันทึก'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
