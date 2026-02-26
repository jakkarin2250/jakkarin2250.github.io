
import React, { useState, useRef, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Store, FileText, Lock, AlertTriangle, Save, 
  RotateCcw, ShieldCheck, Database, CreditCard,
  Glasses, Bell, Download, Upload, Trash2, Gift, Tag, Plus, Edit, Calendar, Activity, Search, Filter, Image as ImageIcon, User, X, ChevronLeft, RefreshCw, Eye, Clock, Calculator
} from 'lucide-react';
import { AppSettings, Promotion, PromotionType, ActivityLog, LogActionType, LogModule } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';

type SettingSection = 'profile' | 'account' | 'documents' | 'products' | 'loyalty' | 'promotions' | 'activity' | 'security' | 'danger';

const STANDARD_PROMO_TYPES = ['bundle_frame_lens', 'tier_discount', 'spend_save', 'time_based', 'brand_discount'];

// Json Diff Viewer Component
const JsonDiff = ({ oldData, newData }: { oldData?: any, newData?: any }) => {
    if (!oldData && !newData) return <div className="text-slate-400 text-sm italic text-center py-4">ไม่มีข้อมูลการเปลี่ยนแปลง</div>;

    const allKeys = Array.from(new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]));
    
    return (
        <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden text-xs font-mono">
            <div className="grid grid-cols-3 bg-slate-100 border-b border-slate-200 font-bold p-2 text-slate-600 uppercase tracking-wider">
                <div>Field</div>
                <div>Old Value</div>
                <div>New Value</div>
            </div>
            {allKeys.map(key => {
                const oldVal = oldData ? oldData[key] : undefined;
                const newVal = newData ? newData[key] : undefined;
                
                // Skip if unchanged (optional, but cleaner)
                if (JSON.stringify(oldVal) === JSON.stringify(newVal)) return null;

                return (
                    <div key={key} className="grid grid-cols-3 border-b border-slate-100 last:border-0 hover:bg-white transition-colors">
                        <div className="p-2 text-slate-500 font-medium truncate border-r border-slate-100">{key}</div>
                        <div className="p-2 text-red-600 bg-red-50/30 break-all">{JSON.stringify(oldVal) || '-'}</div>
                        <div className="p-2 text-green-600 bg-green-50/30 break-all">{JSON.stringify(newVal) || '-'}</div>
                    </div>
                );
            })}
        </div>
    );
};

const Settings = () => {
  const { 
      settings, updateSettings, resetData, importData, clearSystemLogs, recalculateAllPoints,
      customers, products, prescriptions, appointments, jobs, purchases, paymentHistory, pointTransactions, promotions, addPromotion, updatePromotion, deletePromotion,
      activityLogs
  } = useData();
  const { user, updateProfileName } = useAuth();
  const { addToast } = useToast();
  const [activeSection, setActiveSection] = useState<SettingSection>('profile');
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [userName, setUserName] = useState(user?.displayName || '');
  const [isDirty, setIsDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal State for Confirmations
  const [confirmAction, setConfirmAction] = useState<{
      type: 'DELETE_PROMOTION' | 'CLEAR_LOGS' | 'RESET_DATA' | 'RECALC_POINTS';
      id?: string;
      title: string;
      message: string;
      confirmText?: string;
  } | null>(null);

  // Promotion Form State
  const [promoForm, setPromoForm] = useState<Partial<Promotion>>({
      name: '', description: '', conditionText: '', isActive: true, startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], type: 'bundle_frame_lens', conditions: {}
  });
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [isCustomType, setIsCustomType] = useState(false);
  
  // Helper for generic discount input
  const [discountValue, setDiscountValue] = useState<number | ''>('');
  const [discountUnit, setDiscountUnit] = useState<'amount' | 'percent'>('amount');

  // Recalculate Points Form
  const [recalcDateRange, setRecalcDateRange] = useState({ start: '', end: '' });
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Activity Log Filter
  const [logSearch, setLogSearch] = useState('');
  const [logFilterModule, setLogFilterModule] = useState<LogModule | 'ALL'>('ALL');
  const [logFilterAction, setLogFilterAction] = useState<LogActionType | 'ALL'>('ALL');
  const [logDateFrom, setLogDateFrom] = useState('');
  const [logDateTo, setLogDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  // Sync internal state with context when context changes (e.g. initial load)
  React.useEffect(() => {
    setFormData(settings);
  }, [settings]);

  // Sync user name if it changes externally
  React.useEffect(() => {
      if (user?.displayName) setUserName(user.displayName);
  }, [user]);

  const handleChange = (key: keyof AppSettings, value: any) => {
    let finalValue = value;

    // Auto-convert Google Drive sharing links to direct image links
    if (key === 'logo' && typeof value === 'string') {
        const driveRegex = /drive\.google\.com\/file\/d\/([-_\w]+)/;
        const match = value.match(driveRegex);
        if (match && match[1]) {
            finalValue = `https://drive.google.com/uc?export=view&id=${match[1]}`;
        }
    }

    setFormData(prev => ({ ...prev, [key]: finalValue }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (activeSection === 'account') {
        if (!(userName || '').trim()) {
            addToast('ข้อผิดพลาด', 'กรุณาระบุชื่อผู้ใช้งาน', 'error');
            return;
        }
        try {
            await updateProfileName(userName);
            addToast('บันทึกเรียบร้อย', 'อัปเดตชื่อผู้ใช้งานแล้ว');
            setIsDirty(false);
        } catch (error) {
            addToast('เกิดข้อผิดพลาด', 'ไม่สามารถอัปเดตชื่อได้', 'error');
        }
    } else {
        updateSettings(formData);
        addToast('บันทึกเรียบร้อย', 'อัปเดตการตั้งค่าระบบแล้ว');
        setIsDirty(false);
    }
  };

  const executeConfirmAction = async () => {
      if (!confirmAction) return;

      switch(confirmAction.type) {
          case 'DELETE_PROMOTION':
              if (confirmAction.id) {
                  deletePromotion(confirmAction.id);
                  addToast('ลบข้อมูลแล้ว', 'ลบโปรโมชั่นออกจากระบบเรียบร้อย');
              }
              break;
          case 'CLEAR_LOGS':
              await clearSystemLogs();
              addToast('สำเร็จ', 'ล้างประวัติกิจกรรมเรียบร้อยแล้ว');
              break;
          case 'RESET_DATA':
               await resetData();
               addToast('ล้างข้อมูลสำเร็จ', 'ข้อมูลทั้งหมดถูกลบออกจากระบบแล้ว');
               break;
          case 'RECALC_POINTS':
               setIsRecalculating(true);
               try {
                   const count = await recalculateAllPoints(recalcDateRange.start, recalcDateRange.end);
                   addToast('คำนวณสำเร็จ', `ปรับปรุงแต้มสะสมให้ลูกค้า ${count} รายเรียบร้อย`);
               } catch (error) {
                   addToast('ล้มเหลว', 'เกิดข้อผิดพลาดในการคำนวณ', 'error');
               } finally {
                   setIsRecalculating(false);
               }
               break;
      }
      setConfirmAction(null);
  };

  const requestDeletePromotion = (id: string, name: string) => {
      setConfirmAction({
          type: 'DELETE_PROMOTION',
          id,
          title: 'ลบโปรโมชั่น',
          message: `คุณต้องการลบโปรโมชั่น "${name}" ใช่หรือไม่?`,
          confirmText: 'ลบโปรโมชั่น'
      });
  };

  const requestClearLogs = () => {
      setConfirmAction({
          type: 'CLEAR_LOGS',
          title: 'ล้างประวัติกิจกรรม',
          message: 'คุณแน่ใจหรือไม่ที่จะลบประวัติกิจกรรมทั้งหมด? ข้อมูลนี้ไม่สามารถกู้คืนได้',
          confirmText: 'ล้างประวัติ'
      });
  };

  const requestResetData = () => {
       setConfirmAction({
          type: 'RESET_DATA',
          title: 'ล้างข้อมูลทั้งหมด (Factory Reset)',
          message: 'คำเตือน: การกระทำนี้จะลบข้อมูลลูกค้า ใบเสร็จ สินค้า และนัดหมายทั้งหมดในระบบอย่างถาวร\n\nคุณแน่ใจหรือไม่ที่จะดำเนินการต่อ?',
          confirmText: 'ล้างข้อมูลทั้งหมด'
      });
  };

  const requestRecalculatePoints = () => {
      setConfirmAction({
          type: 'RECALC_POINTS',
          title: 'คำนวณแต้มย้อนหลัง',
          message: `ระบบจะคำนวณแต้มสะสมใหม่จากยอดซื้อที่มีอยู่ทั้งหมด ${recalcDateRange.start ? `ตั้งแต่วันที่ ${new Date(recalcDateRange.start).toLocaleDateString('th-TH')}` : ''} ด้วยอัตรา ${formData.earnRate || 25} บาท = 1 แต้ม\n\nการดำเนินการนี้อาจใช้เวลาสักครู่ คุณต้องการดำเนินการต่อหรือไม่?`,
          confirmText: 'ยืนยันการคำนวณ'
      });
  };

  // Helper to convert array to object map for firebase structure
  const arrayToMap = (arr: any[]) => arr.reduce((acc, item) => ({ ...acc, [item.id]: item }), {});

  const handleExport = () => {
    try {
        const backupData = {
            customers: arrayToMap(customers),
            products: arrayToMap(products),
            prescriptions: arrayToMap(prescriptions),
            appointments: arrayToMap(appointments),
            jobs: arrayToMap(jobs),
            purchases: arrayToMap(purchases),
            paymentHistory: arrayToMap(paymentHistory),
            pointTransactions: arrayToMap(pointTransactions),
            promotions: arrayToMap(promotions),
            settings: settings,
            exportDate: new Date().toISOString(),
            version: '1.2.0'
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `jtoptic-backup-${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        
        addToast('ส่งออกสำเร็จ', 'ไฟล์ Backup ถูกดาวน์โหลดเรียบร้อยแล้ว');
    } catch (error) {
        console.error(error);
        addToast('เกิดข้อผิดพลาด', 'ไม่สามารถส่งออกข้อมูลได้', 'error');
    }
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!window.confirm('คำเตือน: การกู้คืนข้อมูลจะ "ทับ" ข้อมูลปัจจุบันทั้งหมดที่มีอยู่\nคุณแน่ใจหรือไม่ที่จะดำเนินการต่อ?')) {
          e.target.value = ''; // Reset input
          return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              await importData(json);
              addToast('กู้คืนสำเร็จ', 'ข้อมูลถูกกู้คืนจากไฟล์ Backup เรียบร้อยแล้ว');
          } catch (error) {
              console.error(error);
              addToast('กู้คืนล้มเหลว', 'ไฟล์ไม่ถูกต้องหรือเกิดข้อผิดพลาด', 'error');
          } finally {
              if (fileInputRef.current) fileInputRef.current.value = '';
          }
      };
      reader.readAsText(file);
  };

  // Promotion Handlers
  const handleSavePromo = () => {
      if (!promoForm.name || !promoForm.startDate || !promoForm.endDate || !promoForm.type) {
          addToast('ข้อมูลไม่ครบ', 'กรุณากรอกชื่อ, วันที่ และประเภทให้ครบถ้วน', 'error');
          return;
      }

      // Merge generic discount into conditions
      const finalConditions = { ...promoForm.conditions };
      
      // Only merge generic discount if NOT tier_discount (which uses specific fields)
      if (promoForm.type !== 'tier_discount' && discountValue !== '') {
          if (discountUnit === 'amount') {
              finalConditions.discountAmount = Number(discountValue);
              delete finalConditions.discountPercent;
          } else {
              finalConditions.discountPercent = Number(discountValue);
              delete finalConditions.discountAmount;
          }
      }

      const payload = {
          ...promoForm,
          conditions: finalConditions
      }
      
      if (editingPromoId) {
          updatePromotion(editingPromoId, payload);
          addToast('แก้ไขสำเร็จ', 'อัปเดตโปรโมชั่นเรียบร้อย');
      } else {
          addPromotion(payload as Promotion);
          addToast('สร้างสำเร็จ', 'เพิ่มโปรโมชั่นใหม่เรียบร้อย');
      }
      setIsPromoModalOpen(false);
      setEditingPromoId(null);
      setIsCustomType(false);
      setPromoForm({ name: '', description: '', conditionText: '', isActive: true, startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], type: 'bundle_frame_lens', conditions: {} });
      setDiscountValue('');
  };

  const openCreatePromo = () => {
      setEditingPromoId(null);
      setIsCustomType(false);
      setDiscountValue('');
      setDiscountUnit('amount');
      setPromoForm({ 
          name: '', description: '', conditionText: '', isActive: true, 
          startDate: new Date().toISOString().split('T')[0], 
          endDate: new Date().toISOString().split('T')[0], 
          type: 'bundle_frame_lens', 
          conditions: { minSpend: 0 } 
      });
      setIsPromoModalOpen(true);
  };

  const openEditPromo = (promo: Promotion) => {
      setEditingPromoId(promo.id);
      setPromoForm({ ...promo, conditions: promo.conditions || {} });
      setIsCustomType(!STANDARD_PROMO_TYPES.includes(promo.type));
      
      if (promo.conditions?.discountAmount) {
          setDiscountValue(promo.conditions.discountAmount);
          setDiscountUnit('amount');
      } else if (promo.conditions?.discountPercent) {
          setDiscountValue(promo.conditions.discountPercent);
          setDiscountUnit('percent');
      } else {
          setDiscountValue('');
          setDiscountUnit('amount');
      }

      setIsPromoModalOpen(true);
  };

  // Activity Log Handlers
  const handleExportLogs = () => {
      const csvContent = "data:text/csv;charset=utf-8," 
          + "Timestamp,User,Action,Module,Description,RefID,IP\n"
          + filteredLogs.map(l => 
              `${l.timestamp},${l.userName},${l.actionType},${l.module},"${l.description.replace(/"/g, '""')}",${l.refId || ''},${l.ipAddress || ''}`
          ).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `activity_log_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
  };

  const getActionColor = (action: LogActionType) => {
      switch (action) {
          case 'CREATE': return 'bg-green-100 text-green-700 border-green-200';
          case 'UPDATE': return 'bg-blue-100 text-blue-700 border-blue-200';
          case 'DELETE': return 'bg-red-100 text-red-700 border-red-200';
          case 'LOGIN': return 'bg-purple-100 text-purple-700 border-purple-200';
          case 'LOGOUT': return 'bg-gray-100 text-gray-700 border-gray-200';
          case 'VIEW': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
          case 'PRINT': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
          default: return 'bg-slate-100 text-slate-700 border-slate-200';
      }
  };

  const filteredLogs = useMemo(() => {
    return activityLogs.filter(log => {
      // Text Search
      const searchMatch = 
        (log.userName || '').toLowerCase().includes((logSearch || '').toLowerCase()) ||
        (log.description || '').toLowerCase().includes((logSearch || '').toLowerCase()) ||
        (log.refId && log.refId.toLowerCase().includes((logSearch || '').toLowerCase()));
      
      if (!searchMatch) return false;

      // Dropdown Filters
      if (logFilterModule !== 'ALL' && log.module !== logFilterModule) return false;
      if (logFilterAction !== 'ALL' && log.actionType !== logFilterAction) return false;

      // Date Filter
      if (logDateFrom && new Date(log.timestamp) < new Date(logDateFrom)) return false;
      if (logDateTo) {
          const d = new Date(logDateTo);
          d.setHours(23, 59, 59); // End of day
          if (new Date(log.timestamp) > d) return false;
      }

      return true;
    }).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [activityLogs, logSearch, logFilterModule, logFilterAction, logDateFrom, logDateTo]);

  const menuItems = [
    { id: 'profile', label: 'ข้อมูลร้านค้า', icon: Store, description: 'ชื่อร้าน, ที่อยู่, เบอร์โทร, โลโก้' },
    { id: 'account', label: 'บัญชีผู้ใช้', icon: User, description: 'ชื่อผู้ใช้งาน, อีเมล' },
    { id: 'documents', label: 'ใบเสร็จ & เอกสาร', icon: FileText, description: 'หัวบิล, ท้ายบิล, Running Number' },
    { id: 'products', label: 'สินค้า & บริการ', icon: Glasses, description: 'แจ้งเตือน, ค่าเริ่มต้น' },
    { id: 'loyalty', label: 'ระบบสะสมแต้ม', icon: Gift, description: 'อัตราแลกเปลี่ยน, เงื่อนไข' },
    { id: 'promotions', label: 'โปรโมชั่น', icon: Tag, description: 'ส่วนลด, ของแถม, แคมเปญ' },
    { id: 'activity', label: 'บันทึกกิจกรรม', icon: Activity, description: 'ประวัติการใช้งานระบบ' },
    { id: 'security', label: 'ความปลอดภัย', icon: ShieldCheck, description: 'Auto Logout, สำรองข้อมูล, กู้คืน' },
    { id: 'danger', label: 'พื้นที่อันตราย', icon: AlertTriangle, description: 'ล้างข้อมูล, คืนค่าโรงงาน' },
  ];

  const renderContent = () => {
      switch (activeSection) {
          // ... (Previous cases remain same until 'activity') ...
          case 'account':
              return (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="border-b border-gray-100 pb-4 mb-4">
                          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                               <User className="w-6 h-6 text-primary-600" /> บัญชีผู้ใช้ (User Account)
                          </h2>
                           <p className="text-gray-500 text-sm mt-1">จัดการข้อมูลส่วนตัวและชื่อที่แสดงในระบบ</p>
                      </div>

                      <div className="max-w-md">
                          <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้ใช้งาน (Display Name)</label>
                          <div className="flex gap-3">
                              <input
                                  type="text"
                                  className="flex-1 border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 outline-none"
                                  value={userName}
                                  onChange={e => { setUserName(e.target.value); setIsDirty(true); }}
                              />
                          </div>
                           <p className="text-xs text-gray-500 mt-2">ชื่อนี้จะปรากฏที่มุมขวาบนของหน้าจอและในบันทึกกิจกรรม</p>
                           
                           <div className="mt-6">
                              <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล (Email)</label>
                               <input
                                  type="text"
                                  disabled
                                  className="w-full border border-gray-200 bg-gray-50 rounded-lg p-2.5 text-gray-500 cursor-not-allowed"
                                  value={user?.email || ''}
                              />
                           </div>
                      </div>
                  </div>
              );
          case 'profile':
              return (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="border-b border-gray-100 pb-4 mb-4">
                          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                              <Store className="w-6 h-6 text-primary-600" /> ข้อมูลร้านค้า
                          </h2>
                          <p className="text-gray-500 text-sm mt-1">ข้อมูลนี้จะถูกแสดงบนใบเสร็จและส่วนหัวของเอกสาร</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อร้านค้า (Shop Name)</label>
                                  <input 
                                      type="text" 
                                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 outline-none"
                                      value={formData.shopName}
                                      onChange={e => handleChange('shopName', e.target.value)}
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์ (Phone)</label>
                                  <input 
                                      type="tel" 
                                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 outline-none"
                                      value={formData.shopPhone}
                                      onChange={e => handleChange('shopPhone', e.target.value)}
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
                                  <input 
                                      type="text" 
                                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 outline-none"
                                      value={formData.taxId}
                                      onChange={e => handleChange('taxId', e.target.value)}
                                  />
                              </div>
                          </div>
                          <div className="space-y-4">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่ (Address)</label>
                                  <textarea 
                                      rows={5}
                                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                                      value={formData.shopAddress}
                                      onChange={e => handleChange('shopAddress', e.target.value)}
                                  />
                              </div>
                              <div className="border-t border-gray-100 pt-4 mt-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-2">โลโก้ร้านค้า (Logo URL)</label>
                                  <div className="flex gap-4 items-start">
                                      <div className="w-20 h-20 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden shrink-0 relative">
                                          {formData.logo ? (
                                              <>
                                                  <img 
                                                      key={formData.logo}
                                                      src={formData.logo} 
                                                      alt="Logo Preview" 
                                                      className="w-full h-full object-contain z-10 relative" 
                                                      onError={(e) => e.currentTarget.style.display = 'none'} 
                                                  />
                                                  <div className="absolute inset-0 flex items-center justify-center z-0">
                                                       <ImageIcon className="w-8 h-8 text-slate-300" />
                                                  </div>
                                              </>
                                          ) : (
                                              <ImageIcon className="w-8 h-8 text-slate-300" />
                                          )}
                                      </div>
                                      <div className="flex-1">
                                          <input 
                                              type="text" 
                                              placeholder="https://... หรือ /logo.png"
                                              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                              value={formData.logo || ''}
                                              onChange={e => handleChange('logo', e.target.value)}
                                          />
                                          <p className="text-xs text-gray-500 mt-1">
                                              ระบุ URL รูปภาพ (รองรับลิงก์ Google Drive) หรือใช้ไฟล์ในเครื่องโดยวางไฟล์ในโฟลเดอร์ public (เช่น /logo.png)
                                          </p>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              );
          case 'documents':
              return (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="border-b border-gray-100 pb-4 mb-4">
                          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                              <FileText className="w-6 h-6 text-primary-600" /> ใบเสร็จและเอกสาร (Documents)
                          </h2>
                          <p className="text-gray-500 text-sm mt-1">กำหนดรูปแบบเลขที่เอกสาร และข้อความเพิ่มเติม</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                              <h3 className="font-bold text-slate-700">การคำนวณภาษี (VAT)</h3>
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                  <div className="flex items-center justify-between mb-4">
                                      <span className="text-sm font-medium">เปิดใช้งาน VAT (7%)</span>
                                      <label className="relative inline-flex items-center cursor-pointer">
                                          <input type="checkbox" className="sr-only peer" checked={formData.enableVat} onChange={e => handleChange('enableVat', e.target.checked)} />
                                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                      </label>
                                  </div>
                                  <div className={`transition-opacity ${formData.enableVat ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                      <label className="block text-xs font-medium text-slate-500 mb-1">อัตราภาษี (%)</label>
                                      <input 
                                          type="number" 
                                          className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                                          value={formData.vatRate || 7}
                                          onChange={e => handleChange('vatRate', Number(e.target.value))}
                                      />
                                  </div>
                              </div>

                              <h3 className="font-bold text-slate-700 mt-6">เลขที่เอกสารล่าสุด (Running Number)</h3>
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-60 overflow-y-auto custom-scrollbar">
                                  {formData.documentRunningNumbers && Object.keys(formData.documentRunningNumbers).length > 0 ? (
                                      <table className="w-full text-sm text-left">
                                          <thead>
                                              <tr className="text-slate-500 border-b border-slate-200">
                                                  <th className="pb-2">Prefix-Year</th>
                                                  <th className="pb-2 text-right">Current</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                              {Object.entries(formData.documentRunningNumbers).map(([key, val]) => (
                                                  <tr key={key}>
                                                      <td className="py-2 font-mono">{key}</td>
                                                      <td className="py-2 text-right font-bold">{val}</td>
                                                  </tr>
                                              ))}
                                          </tbody>
                                      </table>
                                  ) : (
                                      <p className="text-xs text-slate-400 text-center py-4">ยังไม่มีการออกเอกสาร</p>
                                  )}
                              </div>
                          </div>

                          <div className="space-y-4">
                              <h3 className="font-bold text-slate-700">ข้อความบนเอกสาร</h3>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">หัวบิล (Header Text)</label>
                                  <input 
                                      type="text" 
                                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 outline-none"
                                      value={formData.receiptHeader}
                                      onChange={e => handleChange('receiptHeader', e.target.value)}
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">ท้ายบิล (Footer Text)</label>
                                  <textarea 
                                      rows={4}
                                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                                      placeholder="ขอบคุณที่ใช้บริการ / เงื่อนไขการรับประกัน..."
                                      value={formData.receiptFooter}
                                      onChange={e => handleChange('receiptFooter', e.target.value)}
                                  />
                                  <p className="text-xs text-gray-500 mt-1">ข้อความนี้จะปรากฏที่ส่วนล่างสุดของใบเสร็จและเอกสารต่างๆ</p>
                              </div>
                          </div>
                      </div>
                  </div>
              );
          case 'products':
              return (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="border-b border-gray-100 pb-4 mb-4">
                          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                              <Glasses className="w-6 h-6 text-primary-600" /> สินค้าและบริการ (Products)
                          </h2>
                          <p className="text-gray-500 text-sm mt-1">ตั้งค่าการแจ้งเตือนและค่าเริ่มต้นของสินค้า</p>
                      </div>

                      <div className="max-w-md">
                          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                  <Bell className="w-5 h-5 text-yellow-500" /> การแจ้งเตือนสินค้า (Inventory Alert)
                              </h3>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">แจ้งเตือนเมื่อสินค้าต่ำกว่า (Low Stock Threshold)</label>
                                  <div className="flex items-center gap-3">
                                      <input 
                                          type="number" min="0"
                                          className="w-24 text-center border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-yellow-500 outline-none"
                                          value={formData.lowStockThreshold}
                                          onChange={e => handleChange('lowStockThreshold', Number(e.target.value))}
                                      />
                                      <span className="text-gray-600">ชิ้น</span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-2">
                                      สินค้าที่มีจำนวนคงเหลือน้อยกว่าค่านี้จะแสดงสถานะ "Low Stock" และแจ้งเตือนในหน้า Dashboard
                                  </p>
                              </div>
                          </div>
                      </div>
                  </div>
              );
          case 'loyalty':
              return (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="border-b border-gray-100 pb-4 mb-4">
                          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                              <Gift className="w-6 h-6 text-primary-600" /> ระบบสะสมแต้ม (Loyalty System)
                          </h2>
                          <p className="text-gray-500 text-sm mt-1">กำหนดเงื่อนไขการแจกแต้มและการแลกส่วนลด</p>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100 mb-6">
                           <div className="flex items-center justify-between">
                               <div>
                                   <h3 className="font-bold text-purple-900">เปิดใช้งานระบบสะสมแต้ม</h3>
                                   <p className="text-sm text-purple-700">เมื่อเปิดใช้งาน ลูกค้าจะได้รับแต้มอัตโนมัติจากการชำระเงิน</p>
                               </div>
                               <div className="flex items-center">
                                   <label className="relative inline-flex items-center cursor-pointer">
                                       <input type="checkbox" className="sr-only peer" checked={formData.enablePoints} onChange={e => handleChange('enablePoints', e.target.checked)} />
                                       <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                   </label>
                               </div>
                           </div>
                      </div>

                      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity ${formData.enablePoints ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Database className="w-5 h-5 text-blue-500" /> การได้รับแต้ม (Earning)
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">อัตราการสะสมแต้ม</label>
                                        <div className="flex items-center gap-3">
                                            <span className="text-gray-600">ทุกๆ ยอดซื้อ</span>
                                            <input 
                                                type="number" min="1"
                                                className="w-24 text-center border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formData.earnRate}
                                                onChange={e => handleChange('earnRate', Number(e.target.value))}
                                            />
                                            <span className="text-gray-600">บาท = 1 แต้ม</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">
                                            ตัวอย่าง: หากตั้งค่าเป็น 25 บาท = 1 แต้ม, ลูกค้าซื้อของ 100 บาท จะได้ 4 แต้ม
                                        </p>
                                    </div>
                                </div>
                           </div>

                           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-green-500" /> การแลกส่วนลด (Redeeming)
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">มูลค่าของแต้ม</label>
                                        <div className="flex items-center gap-3">
                                            <span className="text-gray-600">ใช้</span>
                                            <span className="font-bold">1 แต้ม</span>
                                            <span className="text-gray-600">แลกส่วนลดได้</span>
                                            <input 
                                                type="number" step="0.1" min="0.1"
                                                className="w-24 text-center border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none"
                                                value={formData.redeemRate}
                                                onChange={e => handleChange('redeemRate', Number(e.target.value))}
                                            />
                                            <span className="text-gray-600">บาท</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">
                                            ตัวอย่าง: หากตั้งค่าเป็น 1 บาท, ใช้ 100 แต้ม จะลดได้ 100 บาท
                                        </p>
                                    </div>
                                </div>
                           </div>

                           {/* Retroactive Calculation Panel */}
                           <div className="col-span-1 md:col-span-2 bg-white p-6 rounded-xl border border-orange-200 shadow-sm">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Calculator className="w-5 h-5 text-orange-500" /> คำนวณแต้มย้อนหลัง (Retroactive Calculation)
                                </h3>
                                <p className="text-sm text-gray-500 mb-4">
                                    ระบบจะคำนวณแต้มสะสมใหม่จากประวัติการซื้อทั้งหมด ตามอัตราการได้รับแต้มปัจจุบัน ({formData.earnRate || 25} บาท = 1 แต้ม) โดยจะทำการปรับปรุงยอดคงเหลือให้ถูกต้อง
                                </p>
                                
                                <div className="flex flex-col sm:flex-row gap-4 items-end">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">ตั้งแต่วันที่ (Start Date)</label>
                                        <input 
                                            type="date" 
                                            className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
                                            value={recalcDateRange.start}
                                            onChange={e => setRecalcDateRange({...recalcDateRange, start: e.target.value})}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">ถึงวันที่ (End Date)</label>
                                        <input 
                                            type="date" 
                                            className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
                                            value={recalcDateRange.end}
                                            onChange={e => setRecalcDateRange({...recalcDateRange, end: e.target.value})}
                                        />
                                    </div>
                                    <button 
                                        onClick={requestRecalculatePoints}
                                        disabled={isRecalculating}
                                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isRecalculating ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Calculator className="w-4 h-4"/>}
                                        คำนวณใหม่
                                    </button>
                                </div>
                           </div>
                      </div>
                  </div>
              );
          case 'promotions':
              return (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="border-b border-gray-100 pb-4 mb-4 flex justify-between items-center">
                          <div>
                              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                  <Tag className="w-6 h-6 text-primary-600" /> โปรโมชั่น (Promotions)
                              </h2>
                              <p className="text-gray-500 text-sm mt-1">จัดการแคมเปญ ส่วนลด และสิทธิพิเศษ</p>
                          </div>
                          <button onClick={openCreatePromo} className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-700 transition-colors">
                              <Plus className="w-4 h-4" /> สร้างโปรโมชั่น
                          </button>
                      </div>

                      <div className="grid gap-4">
                          {promotions.length === 0 ? <p className="text-center text-gray-400 py-10">ยังไม่มีโปรโมชั่น</p> : promotions.map(promo => {
                              return (
                                  <div key={promo.id} className={`bg-white p-4 rounded-xl border ${promo.isActive ? 'border-primary-100' : 'border-gray-100 bg-gray-50'} shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
                                      <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${promo.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                                                  {promo.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                                              </span>
                                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                  {promo.type === 'bundle_frame_lens' ? 'ซื้อกรอบแถมเลนส์' :
                                                   promo.type === 'tier_discount' ? 'ส่วนลดสมาชิก' :
                                                   promo.type === 'spend_save' ? 'ลดตามยอดซื้อ' :
                                                   promo.type === 'time_based' ? 'Happy Hour' : 
                                                   promo.type === 'brand_discount' ? 'ลดตามแบรนด์' :
                                                   promo.type}
                                              </span>
                                          </div>
                                          <h3 className="font-bold text-gray-800">{promo.name}</h3>
                                          <p className="text-sm text-gray-500">{promo.description}</p>
                                          {promo.conditionText && (
                                              <p className="text-xs text-slate-400 mt-1 bg-slate-50 p-1.5 rounded w-fit border border-slate-100">
                                                  <span className="font-bold">เงื่อนไข:</span> {promo.conditionText}
                                              </p>
                                          )}
                                          <div className="text-xs text-gray-400 mt-2 flex items-center gap-2">
                                              <Calendar className="w-3 h-3" /> {new Date(promo.startDate).toLocaleDateString('th-TH')} - {new Date(promo.endDate).toLocaleDateString('th-TH')}
                                              {promo.conditions?.minSpend && promo.conditions.minSpend > 0 && (
                                                  <span className="bg-orange-50 text-orange-600 px-1.5 rounded border border-orange-100">ขั้นต่ำ ฿{promo.conditions.minSpend.toLocaleString()}</span>
                                              )}
                                          </div>
                                      </div>
                                      <div className="flex gap-2">
                                          <button onClick={() => openEditPromo(promo)} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"><Edit className="w-4 h-4" /></button>
                                          <button onClick={() => requestDeletePromotion(promo.id, promo.name)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              );
          case 'activity':
              return (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="border-b border-gray-100 pb-4 mb-4 flex justify-between items-center">
                          <div>
                              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                  <Activity className="w-6 h-6 text-primary-600" /> บันทึกกิจกรรม (Activity Log)
                              </h2>
                              <p className="text-gray-500 text-sm mt-1">ตรวจสอบประวัติการใช้งานและการเปลี่ยนแปลงข้อมูลในระบบ</p>
                          </div>
                          <button onClick={handleExportLogs} className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg transition-colors shadow-sm text-sm font-medium">
                              <Download className="w-4 h-4" /> Export CSV
                          </button>
                      </div>

                      {/* Filters */}
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col lg:flex-row gap-4 mb-4">
                          <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input 
                                  type="text" 
                                  placeholder="ค้นหาผู้ใช้, รายละเอียด, Ref ID..." 
                                  className="w-full pl-9 p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  value={logSearch}
                                  onChange={e => setLogSearch(e.target.value)}
                              />
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                  <Filter className="w-4 h-4 text-slate-400" />
                                  <select 
                                      className="bg-transparent text-sm text-slate-700 outline-none"
                                      value={logFilterModule}
                                      onChange={e => setLogFilterModule(e.target.value as any)}
                                  >
                                      <option value="ALL">ทุกโมดูล</option>
                                      {['CUSTOMER', 'ORDER', 'INVOICE', 'PRODUCT', 'STOCK', 'SETTINGS', 'AUTH', 'ACCOUNTING'].map(m => <option key={m} value={m}>{m}</option>)}
                                  </select>
                              </div>

                              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                  <Activity className="w-4 h-4 text-slate-400" />
                                  <select 
                                      className="bg-transparent text-sm text-slate-700 outline-none"
                                      value={logFilterAction}
                                      onChange={e => setLogFilterAction(e.target.value as any)}
                                  >
                                      <option value="ALL">ทุกกิจกรรม</option>
                                      {['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'PRINT', 'OTHER'].map(a => <option key={a} value={a}>{a}</option>)}
                                  </select>
                              </div>

                              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                  <Calendar className="w-4 h-4 text-slate-400" />
                                  <input 
                                      type="date" 
                                      className="bg-transparent text-sm text-slate-700 outline-none"
                                      value={logDateFrom}
                                      onChange={e => setLogDateFrom(e.target.value)}
                                  />
                                  <span className="text-slate-400">-</span>
                                  <input 
                                      type="date" 
                                      className="bg-transparent text-sm text-slate-700 outline-none"
                                      value={logDateTo}
                                      onChange={e => setLogDateTo(e.target.value)}
                                  />
                              </div>
                          </div>
                      </div>

                      {/* Table */}
                      <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
                          <div className="overflow-auto flex-1 custom-scrollbar max-h-[600px]">
                              <table className="w-full text-left border-collapse">
                                  <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm text-xs font-bold text-slate-500 uppercase tracking-wider">
                                      <tr>
                                          <th className="px-6 py-4">Timestamp</th>
                                          <th className="px-6 py-4">User</th>
                                          <th className="px-6 py-4">Action</th>
                                          <th className="px-6 py-4">Module</th>
                                          <th className="px-6 py-4">Description</th>
                                          <th className="px-6 py-4 text-center">Detail</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-sm">
                                      {filteredLogs.length > 0 ? filteredLogs.map(log => (
                                          <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                                              <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                                  {new Date(log.timestamp).toLocaleString('th-TH')}
                                              </td>
                                              <td className="px-6 py-4 font-medium text-slate-700">
                                                  <div className="flex items-center gap-2">
                                                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600 font-bold">
                                                          {(log.userName || '').charAt(0).toUpperCase()}
                                                      </div>
                                                      {log.userName}
                                                  </div>
                                              </td>
                                              <td className="px-6 py-4">
                                                  <span className={`px-2 py-1 rounded text-xs font-bold border ${getActionColor(log.actionType)}`}>
                                                      {log.actionType}
                                                  </span>
                                              </td>
                                              <td className="px-6 py-4 text-slate-600 font-medium">
                                                  {log.module}
                                              </td>
                                              <td className="px-6 py-4 text-slate-600 truncate max-w-xs" title={log.description}>
                                                  {log.description}
                                              </td>
                                              <td className="px-6 py-4 text-center">
                                                  <button 
                                                      onClick={() => setSelectedLog(log)}
                                                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                  >
                                                      <Eye className="w-4 h-4" />
                                                  </button>
                                              </td>
                                          </tr>
                                      )) : (
                                          <tr>
                                              <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                                  No logs found based on current filters.
                                              </td>
                                          </tr>
                                      )}
                                  </tbody>
                              </table>
                          </div>
                          <div className="p-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 flex justify-between items-center">
                              <span>Showing {filteredLogs.length} records</span>
                              <span>Data is immutable and securely stored.</span>
                          </div>
                      </div>
                  </div>
              );
          case 'security':
              return (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="border-b border-gray-100 pb-4 mb-4">
                          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                              <ShieldCheck className="w-6 h-6 text-primary-600" /> ความปลอดภัยและการสำรองข้อมูล
                          </h2>
                          <p className="text-gray-500 text-sm mt-1">จัดการสำรองข้อมูล (Backup) และความปลอดภัยของระบบ</p>
                      </div>

                      {/* Auto Logout Settings */}
                      <div className="bg-red-50 p-6 rounded-xl border border-red-100 mb-6">
                          <h3 className="font-bold text-red-900 mb-4 flex items-center gap-2">
                              <Clock className="w-5 h-5 text-red-600" /> ระบบออกจากระบบอัตโนมัติ (Auto Logout)
                          </h3>
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                      <input 
                                          type="checkbox" 
                                          className="sr-only peer" 
                                          checked={formData.autoLogoutEnabled !== false} 
                                          onChange={e => handleChange('autoLogoutEnabled', e.target.checked)} 
                                      />
                                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                  </label>
                                  <span className="text-sm font-medium text-slate-700">เปิดใช้งาน Auto Logout เมื่อไม่มีการเคลื่อนไหว</span>
                              </div>
                              
                              <div className={`flex items-center gap-2 transition-opacity ${formData.autoLogoutEnabled !== false ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                  <span className="text-sm text-slate-600">เวลา (นาที):</span>
                                  <input 
                                      type="number" 
                                      min="1" 
                                      max="60"
                                      className="w-20 text-center border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                                      value={formData.autoLogoutMinutes || 10}
                                      onChange={e => handleChange('autoLogoutMinutes', Number(e.target.value))}
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 flex flex-col items-center text-center">
                              <div className="p-3 bg-white rounded-full shadow-sm text-blue-600 mb-4">
                                  <Download className="w-8 h-8" />
                              </div>
                              <h3 className="font-bold text-blue-900 text-lg">สำรองข้อมูล (Backup)</h3>
                              <p className="text-blue-700 text-sm mt-2 mb-6">
                                  ดาวน์โหลดข้อมูลทั้งหมดในระบบเก็บไว้เป็นไฟล์ .json เพื่อความปลอดภัย
                              </p>
                              <button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors w-full">
                                  ดาวน์โหลดไฟล์ Backup
                              </button>
                          </div>

                          <div className="bg-green-50 p-6 rounded-xl border border-green-100 flex flex-col items-center text-center">
                              <div className="p-3 bg-white rounded-full shadow-sm text-green-600 mb-4">
                                  <Upload className="w-8 h-8" />
                              </div>
                              <h3 className="font-bold text-green-900 text-lg">กู้คืนข้อมูล (Restore)</h3>
                              <p className="text-green-700 text-sm mt-2 mb-6">
                                  นำเข้าไฟล์ Backup เพื่อกู้คืนข้อมูล (ข้อมูลปัจจุบันจะถูกเขียนทับ)
                              </p>
                              <button onClick={handleImportClick} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors w-full">
                                  เลือกไฟล์กู้คืน
                              </button>
                              <input 
                                  type="file" 
                                  ref={fileInputRef} 
                                  className="hidden" 
                                  accept=".json" 
                                  onChange={handleFileChange} 
                              />
                          </div>
                      </div>
                  </div>
              );
          case 'danger':
              return (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="border-b border-red-100 pb-4 mb-4">
                          <h2 className="text-xl font-bold text-red-700 flex items-center gap-2">
                              <AlertTriangle className="w-6 h-6" /> พื้นที่อันตราย (Danger Zone)
                          </h2>
                          <p className="text-red-500 text-sm mt-1">โปรดระมัดระวัง การกระทำในส่วนนี้ไม่สามารถย้อนกลับได้</p>
                      </div>

                      <div className="space-y-4">
                          <div className="p-4 border border-red-200 rounded-xl flex justify-between items-center bg-white">
                              <div>
                                  <h3 className="font-bold text-slate-800">ล้างประวัติกิจกรรม</h3>
                                  <p className="text-sm text-slate-500">ลบข้อมูล Log การใช้งานทั้งหมด แต่ข้อมูลลูกค้าและยอดขายยังอยู่ครบ</p>
                              </div>
                              <button onClick={requestClearLogs} className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium">
                                  ล้างประวัติ
                              </button>
                          </div>

                          <div className="p-4 border border-red-200 rounded-xl flex justify-between items-center bg-red-50">
                              <div>
                                  <h3 className="font-bold text-red-800">ล้างข้อมูลทั้งหมด (Factory Reset)</h3>
                                  <p className="text-sm text-red-600">ลบข้อมูลทุกอย่างในระบบ ลูกค้า สินค้า ยอดขาย จะหายไปทั้งหมด</p>
                              </div>
                              <button onClick={requestResetData} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm">
                                  ล้างข้อมูลทั้งหมด
                              </button>
                          </div>
                      </div>
                  </div>
              );
          default:
              return null;
      }
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6">
      {/* Confirmation Modal */}
      <ConfirmationModal 
          isOpen={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={executeConfirmAction}
          title={confirmAction?.title || ''}
          message={confirmAction?.message || ''}
          confirmText={confirmAction?.confirmText}
      />

      {/* Sidebar Settings Navigation */}
      <div className="w-full md:w-64 flex-shrink-0">
         <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-0">
             <div className="p-4 bg-gray-50 border-b border-gray-100">
                 <h1 className="font-bold text-gray-800">ตั้งค่าระบบ</h1>
             </div>
             <nav className="p-2 space-y-1">
                 {menuItems.map(item => (
                     <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id as SettingSection)}
                        className={`w-full flex items-start p-3 rounded-lg transition-colors text-left group ${
                            activeSection === item.id 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                     >
                         <item.icon className={`w-5 h-5 mt-0.5 mr-3 flex-shrink-0 ${
                             activeSection === item.id ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                         }`} />
                         <div>
                             <div className="font-medium text-sm">{item.label}</div>
                             <div className={`text-xs mt-0.5 ${
                                 activeSection === item.id ? 'text-blue-400' : 'text-gray-400'
                             }`}>{item.description}</div>
                         </div>
                     </button>
                 ))}
             </nav>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
          {/* Scrollable Content */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto">
              {renderContent()}
          </div>

          {/* Footer Actions (Only show for non-danger/security sections) */}
          {activeSection !== 'danger' && activeSection !== 'promotions' && activeSection !== 'activity' && (
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                  {isDirty && <span className="text-sm text-yellow-600 flex items-center mr-auto animate-pulse">
                      <AlertTriangle className="w-4 h-4 mr-1"/> มีการแก้ไขที่ยังไม่ได้บันทึก
                  </span>}
                  <button 
                    onClick={() => {
                        setFormData(settings);
                        if (activeSection === 'account' && user?.displayName) setUserName(user.displayName);
                        setIsDirty(false);
                    }}
                    disabled={!isDirty}
                    className="px-4 py-2 text-gray-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 rounded-lg transition-all disabled:opacity-50"
                  >
                      ยกเลิก
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={!isDirty}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      <Save className="w-4 h-4" /> บันทึกการตั้งค่า
                  </button>
              </div>
          )}
      </div>

      {/* Promotion Modal */}
      {isPromoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                  {/* ... (Existing Modal Content) ... */}
                  <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                      <button onClick={() => setIsPromoModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                          <ChevronLeft className="w-5 h-5" />
                      </button>
                      <h3 className="text-lg font-bold text-gray-800">{editingPromoId ? 'แก้ไขโปรโมชั่น' : 'สร้างโปรโมชั่นใหม่'}</h3>
                  </div>
                  {/* ... (Rest of Modal) ... */}
                  <div className="p-6 space-y-4 overflow-y-auto">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อโปรโมชั่น</label>
                          <input type="text" className="w-full border rounded-lg p-2" value={promoForm.name} onChange={e => setPromoForm({...promoForm, name: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด (Short Description)</label>
                          <textarea rows={2} className="w-full border rounded-lg p-2" value={promoForm.description} onChange={e => setPromoForm({...promoForm, description: e.target.value})} />
                      </div>
                      
                      {/* Condition Text Area */}
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">เงื่อนไขเพิ่มเติม (Detailed Conditions)</label>
                          <textarea 
                              rows={3} 
                              className="w-full border rounded-lg p-2 text-sm" 
                              placeholder="เช่น ต้องซื้อสินค้า 2 ชิ้นขึ้นไป, ไม่สามารถใช้ร่วมกับรายการอื่นได้"
                              value={promoForm.conditionText || ''} 
                              onChange={e => setPromoForm({...promoForm, conditionText: e.target.value})} 
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
                              {isCustomType ? (
                                  <div className="flex gap-2">
                                      <input 
                                          type="text" 
                                          className="w-full border rounded-lg p-2 text-sm" 
                                          placeholder="ระบุประเภท..."
                                          value={promoForm.type} 
                                          onChange={e => setPromoForm({...promoForm, type: e.target.value})} 
                                      />
                                      <button 
                                          type="button"
                                          onClick={() => {
                                              setIsCustomType(false);
                                              setPromoForm({...promoForm, type: 'bundle_frame_lens', conditions: {}});
                                          }}
                                          className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 rounded-lg"
                                          title="กลับไปเลือกแบบรายการ"
                                      >
                                          <X className="w-4 h-4"/>
                                      </button>
                                  </div>
                              ) : (
                                  <select 
                                      className="w-full border rounded-lg p-2" 
                                      value={promoForm.type} 
                                      onChange={e => {
                                          if (e.target.value === 'other') {
                                              setIsCustomType(true);
                                              setPromoForm({...promoForm, type: '', conditions: {}});
                                          } else {
                                              setPromoForm({...promoForm, type: e.target.value as PromotionType, conditions: {}});
                                          }
                                      }}
                                  >
                                      <option value="bundle_frame_lens">ซื้อกรอบแถมเลนส์</option>
                                      <option value="tier_discount">ส่วนลดตามระดับสมาชิก</option>
                                      <option value="spend_save">ซื้อครบ...ลด...</option>
                                      <option value="time_based">ช่วงเวลาพิเศษ (Happy Hour)</option>
                                      <option value="brand_discount">ลดเฉพาะแบรนด์</option>
                                      <option value="other">อื่นๆ (กำหนดเอง)</option>
                                  </select>
                              )}
                          </div>
                          <div className="flex items-end pb-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" className="w-4 h-4" checked={promoForm.isActive} onChange={e => setPromoForm({...promoForm, isActive: e.target.checked})} />
                                  <span className="text-sm font-medium">เปิดใช้งาน</span>
                              </label>
                          </div>
                      </div>
                      
                      {/* Generic Discount Field (Hidden for Tier Discount) */}
                      {promoForm.type !== 'tier_discount' && (
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">มูลค่าส่วนลด (Discount Value)</label>
                          <div className="flex gap-2">
                              <input 
                                  type="number" 
                                  className="flex-1 border rounded-lg p-2" 
                                  placeholder="0"
                                  value={discountValue}
                                  onChange={e => setDiscountValue(Number(e.target.value))}
                              />
                              <select 
                                  className="border rounded-lg p-2 bg-gray-50"
                                  value={discountUnit}
                                  onChange={e => setDiscountUnit(e.target.value as 'amount' | 'percent')}
                              >
                                  <option value="amount">บาท (THB)</option>
                                  <option value="percent">% (Percent)</option>
                              </select>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                              ระบุส่วนลดที่จะนำไปคำนวณ (ถ้ามี)
                          </p>
                      </div>
                      )}

                      {/* Minimum Spend Field */}
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ยอดซื้อขั้นต่ำ (Minimum Spend)</label>
                          <div className="flex gap-2 items-center">
                              <input 
                                  type="number" 
                                  className="w-full border rounded-lg p-2" 
                                  placeholder="0"
                                  value={promoForm.conditions?.minSpend || ''}
                                  onChange={e => setPromoForm({
                                      ...promoForm, 
                                      conditions: { ...promoForm.conditions, minSpend: Number(e.target.value) }
                                  })}
                              />
                              <span className="text-sm text-gray-500">บาท</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                              ต้องมียอดซื้อเท่านี้ขึ้นไป โปรโมชั่นจึงจะทำงาน (ใส่ 0 หากไม่มีขั้นต่ำ)
                          </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">วันเริ่ม</label>
                              <input type="date" className="w-full border rounded-lg p-2" value={promoForm.startDate} onChange={e => setPromoForm({...promoForm, startDate: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">วันสิ้นสุด</label>
                              <input type="date" className="w-full border rounded-lg p-2" value={promoForm.endDate} onChange={e => setPromoForm({...promoForm, endDate: e.target.value})} />
                          </div>
                      </div>

                      {/* Dynamic Conditions Fields */}
                      {!isCustomType && (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <h4 className="font-bold text-sm text-gray-700 mb-3 border-b pb-2">เงื่อนไขเฉพาะ (Specific Rules)</h4>
                          {promoForm.type === 'bundle_frame_lens' && (
                              <div>
                                  <p className="text-xs text-gray-500">โปรโมชั่นนี้ใช้สำหรับการขายกรอบพร้อมเลนส์</p>
                              </div>
                          )}
                          {promoForm.type === 'tier_discount' && (
                              <div className="grid grid-cols-2 gap-3">
                                  <div>
                                      <label className="block text-xs font-medium text-orange-700">Bronze (%)</label>
                                      <input type="number" className="w-full border rounded-lg p-2" value={promoForm.conditions?.tierRates?.bronze || 0} onChange={e => setPromoForm({...promoForm, conditions: {...promoForm.conditions, tierRates: {...(promoForm.conditions?.tierRates as any), bronze: Number(e.target.value)}}})} />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-medium text-gray-500">Silver (%)</label>
                                      <input type="number" className="w-full border rounded-lg p-2" value={promoForm.conditions?.tierRates?.silver || 0} onChange={e => setPromoForm({...promoForm, conditions: {...promoForm.conditions, tierRates: {...(promoForm.conditions?.tierRates as any), silver: Number(e.target.value)}}})} />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-medium text-yellow-600">Gold (%)</label>
                                      <input type="number" className="w-full border rounded-lg p-2" value={promoForm.conditions?.tierRates?.gold || 0} onChange={e => setPromoForm({...promoForm, conditions: {...promoForm.conditions, tierRates: {...(promoForm.conditions?.tierRates as any), gold: Number(e.target.value)}}})} />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-medium text-purple-600">Platinum (%)</label>
                                      <input type="number" className="w-full border rounded-lg p-2" value={promoForm.conditions?.tierRates?.platinum || 0} onChange={e => setPromoForm({...promoForm, conditions: {...promoForm.conditions, tierRates: {...(promoForm.conditions?.tierRates as any), platinum: Number(e.target.value)}}})} />
                                  </div>
                              </div>
                          )}
                          {promoForm.type === 'time_based' && (
                              <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-4">
                                      <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">เริ่มเวลา</label>
                                          <input type="time" className="w-full border rounded-lg p-2" value={promoForm.conditions?.startHour || ''} onChange={e => setPromoForm({...promoForm, conditions: {...promoForm.conditions, startHour: e.target.value}})} />
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">สิ้นสุดเวลา</label>
                                          <input type="time" className="w-full border rounded-lg p-2" value={promoForm.conditions?.endHour || ''} onChange={e => setPromoForm({...promoForm, conditions: {...promoForm.conditions, endHour: e.target.value}})} />
                                      </div>
                                  </div>
                              </div>
                          )}
                          {promoForm.type === 'brand_discount' && (
                              <div className="grid grid-cols-1 gap-4">
                                  <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อแบรนด์ (ในสินค้า)</label>
                                      <input type="text" className="w-full border rounded-lg p-2" placeholder="เช่น RayBan" value={promoForm.conditions?.targetBrand || ''} onChange={e => setPromoForm({...promoForm, conditions: {...promoForm.conditions, targetBrand: e.target.value}})} />
                                  </div>
                              </div>
                          )}
                      </div>
                      )}
                  </div>
                  <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                      <button onClick={() => setIsPromoModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-white rounded-lg border border-transparent hover:border-gray-200">ยกเลิก</button>
                      <button onClick={handleSavePromo} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">บันทึกโปรโมชั่น</button>
                  </div>
              </div>
          </div>
      )}

      {/* Log Detail Modal */}
      {selectedLog && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                      <div>
                          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                              <FileText className="w-5 h-5 text-indigo-600" /> รายละเอียดกิจกรรม (Log Detail)
                          </h3>
                          <p className="text-xs text-slate-500 mt-1 font-mono">ID: {selectedLog.id}</p>
                      </div>
                      <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-6 h-6" />
                      </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto space-y-6">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                              <label className="text-xs font-bold text-slate-400 uppercase">Timestamp</label>
                              <div className="text-slate-700 font-medium">{new Date(selectedLog.timestamp).toLocaleString('th-TH')}</div>
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-400 uppercase">User</label>
                              <div className="text-slate-700 font-medium">{selectedLog.userName} ({selectedLog.role || 'User'})</div>
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-400 uppercase">Action / Module</label>
                              <div className="flex gap-2 mt-1">
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getActionColor(selectedLog.actionType)}`}>{selectedLog.actionType}</span>
                                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">{selectedLog.module}</span>
                              </div>
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-400 uppercase">Reference ID</label>
                              <div className="text-slate-700 font-mono text-xs">{selectedLog.refId || '-'}</div>
                          </div>
                          <div className="col-span-2">
                              <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
                              <div className="text-slate-800 font-medium">{selectedLog.description}</div>
                          </div>
                      </div>

                      {(selectedLog.oldData || selectedLog.newData) && (
                          <div>
                              <h4 className="text-sm font-bold text-slate-700 mb-2">Data Changes (Before vs After)</h4>
                              <JsonDiff oldData={selectedLog.oldData} newData={selectedLog.newData} />
                          </div>
                      )}
                      
                      <div className="text-xs text-slate-400 pt-4 border-t border-slate-100 flex justify-between">
                          <span>User Agent: {selectedLog.userAgent || 'Unknown'}</span>
                          <span>IP: {selectedLog.ipAddress || '-'}</span>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Settings;
