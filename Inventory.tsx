
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Product } from '../types';
import { 
  Search, Plus, Edit, Trash2, Tag, Package, AlertTriangle, 
  TrendingUp, Archive, Glasses, Eye, Briefcase, Filter, X, Wand2, RefreshCw
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

const Inventory = () => {
  const { products, addProduct, updateProduct, deleteProduct, settings } = useData();
  const { addToast } = useToast();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'frame' | 'lens' | 'contact_lens' | 'accessory'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({
    code: '', name: '', type: 'frame', price: 0, stock: 0, description: ''
  });

  // --- Auto Generate Logic ---
  const generateNextCode = (type: string) => {
      let prefix = 'PD';
      switch(type) {
          case 'frame': prefix = 'FR'; break;
          case 'lens': prefix = 'LN'; break;
          case 'contact_lens': prefix = 'CL'; break;
          case 'accessory': prefix = 'AC'; break;
      }

      // Find all codes starting with this prefix
      const existingCodes = products
          .map(p => p.code || '')
          .filter(code => code.startsWith(prefix));

      // Extract numbers
      const numbers = existingCodes.map(code => {
          const numStr = code.replace(prefix, '').replace('-', ''); // Handle both FR001 and FR-001
          return parseInt(numStr, 10);
      }).filter(n => !isNaN(n));

      const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
      const nextNum = maxNum + 1;

      // Format: PREFIX + 3 digits (e.g., FR001)
      return `${prefix}${String(nextNum).padStart(3, '0')}`;
  };

  // Effect to auto-update code when type changes (Only in Add mode)
  useEffect(() => {
      if (!isModalOpen || editingId) return; // Don't run on edit or closed modal

      // Check if the current code is empty OR matches an auto-generated pattern of a DIFFERENT type
      // This prevents overwriting if user manually typed a custom barcode
      const isAutoLike = /^(FR|LN|CL|AC|PD)\d{3,}$/.test(formData.code || '');
      
      if (!formData.code || isAutoLike) {
          const nextCode = generateNextCode(formData.type || 'frame');
          setFormData(prev => ({ ...prev, code: nextCode }));
      }
  }, [formData.type, isModalOpen, editingId, products]); 
  // Added products dependency to ensure it recalculates if data changes, though rare during open modal

  // --- Statistics ---
  const stats = useMemo(() => {
      const totalItems = products.length;
      const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
      const lowStockCount = products.filter(p => p.stock <= (settings.lowStockThreshold || 5)).length;
      return { totalItems, totalValue, lowStockCount };
  }, [products, settings.lowStockThreshold]);

  // --- Filtering ---
  const filteredProducts = useMemo(() => {
      return products.filter(p => {
          const term = (searchTerm || '').toLowerCase();
          const matchesSearch = (p.name || '').toLowerCase().includes(term) || 
                                (p.code || '').toLowerCase().includes(term);
          const matchesType = activeTab === 'all' || p.type === activeTab;
          return matchesSearch && matchesType;
      }).sort((a, b) => a.stock - b.stock); // Sort by stock level (lowest first) usually helpful
  }, [products, searchTerm, activeTab]);

  // --- Handlers ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
        updateProduct(editingId, formData);
        addToast('อัปเดตแล้ว', 'แก้ไขข้อมูลสินค้าเรียบร้อย');
    } else {
        addProduct(formData as Omit<Product, 'id'>);
        addToast('บันทึกเรียบร้อย', 'เพิ่มสินค้าใหม่ลงในคลังแล้ว');
    }
    setIsModalOpen(false);
  };

  const confirmDelete = () => {
      if (deleteId) {
          deleteProduct(deleteId);
          addToast('ลบข้อมูลแล้ว', 'นำสินค้าออกจากคลังเรียบร้อย');
          setDeleteId(null);
      }
  };

  const openAdd = () => {
    setEditingId(null);
    // Initial State with auto-generated code for 'frame'
    const initialType = 'frame';
    setFormData({ 
        code: generateNextCode(initialType), 
        name: '', 
        type: initialType, 
        price: 0, 
        stock: 0, 
        description: '' 
    });
    setIsModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setFormData(p);
    setIsModalOpen(true);
  };

  const handleManualRegenerate = () => {
      const nextCode = generateNextCode(formData.type || 'frame');
      setFormData(prev => ({ ...prev, code: nextCode }));
  };

  // --- Helpers ---
  const getTypeIcon = (type: string) => {
      switch(type) {
          case 'frame': return <Glasses className="w-4 h-4" />;
          case 'lens': return <Eye className="w-4 h-4" />;
          case 'contact_lens': return <Eye className="w-4 h-4 text-blue-500" />;
          case 'accessory': return <Briefcase className="w-4 h-4" />;
          default: return <Package className="w-4 h-4" />;
      }
  };

  const getTypeLabel = (type: string) => {
      switch(type) {
          case 'frame': return 'กรอบแว่น';
          case 'lens': return 'เลนส์';
          case 'contact_lens': return 'คอนแทคเลนส์';
          case 'accessory': return 'อุปกรณ์';
          default: return type;
      }
  };

  const getTypeColor = (type: string) => {
      switch(type) {
          case 'frame': return 'bg-purple-100 text-purple-700 border-purple-200';
          case 'lens': return 'bg-blue-100 text-blue-700 border-blue-200';
          case 'contact_lens': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
          case 'accessory': return 'bg-orange-100 text-orange-700 border-orange-200';
          default: return 'bg-slate-100 text-slate-700 border-slate-200';
      }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Package className="w-7 h-7 text-primary-600" /> คลังสินค้า (Inventory)
          </h1>
          <p className="text-slate-500 text-sm mt-1">จัดการสต็อก ราคา และรายละเอียดสินค้า</p>
        </div>
        <button 
            onClick={openAdd} 
            className="bg-primary-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" /> เพิ่มสินค้าใหม่
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-5 transform group-hover:scale-110 transition-transform">
                  <Archive className="w-24 h-24 text-blue-600" />
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Archive className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-sm text-slate-500 font-medium">รายการสินค้าทั้งหมด</p>
                  <h3 className="text-2xl font-bold text-slate-800">{stats.totalItems.toLocaleString()} <span className="text-sm font-normal text-slate-400">รายการ</span></h3>
              </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-5 transform group-hover:scale-110 transition-transform">
                  <AlertTriangle className="w-24 h-24 text-red-600" />
              </div>
              <div className={`p-3 rounded-xl ${stats.lowStockCount > 0 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-green-50 text-green-600'}`}>
                  <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-sm text-slate-500 font-medium">สินค้าใกล้หมด</p>
                  <h3 className={`text-2xl font-bold ${stats.lowStockCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                      {stats.lowStockCount.toLocaleString()} <span className="text-sm font-normal text-slate-400">รายการ</span>
                  </h3>
              </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-4 opacity-5 transform group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-24 h-24 text-green-600" />
              </div>
              <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                  <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-sm text-slate-500 font-medium">มูลค่าสินค้าในคลัง</p>
                  <h3 className="text-2xl font-bold text-slate-800">฿{stats.totalValue.toLocaleString()}</h3>
              </div>
          </div>
      </div>

      {/* Controls & Filters */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
          {/* Category Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-xl overflow-x-auto w-full md:w-auto no-scrollbar">
              {[
                  { id: 'all', label: 'ทั้งหมด' },
                  { id: 'frame', label: 'กรอบแว่น' },
                  { id: 'lens', label: 'เลนส์' },
                  { id: 'contact_lens', label: 'คอนแทค' },
                  { id: 'accessory', label: 'อุปกรณ์' },
              ].map(tab => (
                  <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                          activeTab === tab.id 
                          ? 'bg-white text-primary-600 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                      }`}
                  >
                      {tab.label}
                  </button>
              ))}
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                  type="text" 
                  placeholder="ค้นหาชื่อสินค้า, รหัสสินค้า..." 
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all placeholder:text-slate-400"
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3 h-3" />
                  </button>
              )}
          </div>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <tr className="text-xs uppercase text-slate-500 font-semibold">
                <th className="px-6 py-4 rounded-tl-xl">สินค้า</th>
                <th className="px-6 py-4">หมวดหมู่</th>
                <th className="px-6 py-4">รายละเอียด</th>
                <th className="px-6 py-4 text-right">ราคาต่อหน่วย</th>
                <th className="px-6 py-4 text-center">คงเหลือ</th>
                <th className="px-6 py-4 text-right rounded-tr-xl">จัดการ</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filteredProducts.length > 0 ? filteredProducts.map(p => {
                    const isLowStock = p.stock <= (settings.lowStockThreshold || 5);
                    return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 bg-slate-100 group-hover:bg-white group-hover:shadow-sm transition-all border border-slate-100`}>
                                        {getTypeIcon(p.type)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">{p.name}</div>
                                        <div className="text-xs text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded w-fit mt-0.5 group-hover:bg-white group-hover:border group-hover:border-slate-200 transition-all">
                                            {p.code}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getTypeColor(p.type)}`}>
                                    {getTypeLabel(p.type)}
                                </span>
                            </td>
                            <td className="px-6 py-4 max-w-[200px]">
                                <div className="text-sm text-slate-600 truncate" title={p.description}>
                                    {p.description || '-'}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="font-bold text-slate-700">฿{p.price.toLocaleString()}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col items-center gap-1">
                                    <span className={`font-bold text-sm ${isLowStock ? 'text-red-600' : 'text-slate-700'}`}>
                                        {p.stock}
                                    </span>
                                    {isLowStock && (
                                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200">
                                            Low Stock
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(p)} className="p-2 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title="แก้ไข">
                                        <Edit className="w-4 h-4"/>
                                    </button>
                                    <button onClick={() => setDeleteId(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบ">
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    );
                }) : (
                    <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                            <div className="flex flex-col items-center justify-center gap-3">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                    <Search className="w-8 h-8 opacity-20" />
                                </div>
                                <p>ไม่พบสินค้าที่ค้นหา</p>
                                {activeTab !== 'all' && (
                                    <button onClick={() => setActiveTab('all')} className="text-primary-600 text-sm hover:underline">
                                        ดูสินค้าทั้งหมด
                                    </button>
                                )}
                            </div>
                        </td>
                    </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="ลบสินค้า"
        message={`คุณต้องการลบสินค้า "${products.find(p => p.id === deleteId)?.name || ''}" ออกจากคลังใช่หรือไม่?\nการกระทำนี้อาจส่งผลต่อประวัติการขายในอดีต`}
        confirmText="ลบสินค้า"
      />

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary-600"/> {editingId ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">ประเภท (Category)</label>
                        <select className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white" 
                            value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                            <option value="frame">กรอบแว่น (Frame)</option>
                            <option value="lens">เลนส์ (Lens)</option>
                            <option value="contact_lens">คอนแทคเลนส์</option>
                            <option value="accessory">อุปกรณ์เสริม</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">รหัสสินค้า (Code)</label>
                        <div className="relative">
                            <input 
                                required 
                                placeholder="เช่น FR001" 
                                className="w-full pl-3 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono" 
                                value={formData.code} 
                                onChange={e => setFormData({...formData, code: e.target.value})} 
                            />
                            {!editingId && (
                                <button 
                                    type="button"
                                    onClick={handleManualRegenerate}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-600 transition-colors"
                                    title="Generate Auto Code"
                                >
                                    <Wand2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">ชื่อสินค้า (Product Name)</label>
                    <input required placeholder="ระบุชื่อรุ่น ยี่ห้อ หรือคุณสมบัติ" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" 
                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">ราคาขาย (Price)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
                            <input required type="number" min="0" className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" 
                                value={formData.price || ''} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">จำนวนคงเหลือ (Stock)</label>
                        <div className="relative">
                            <input required type="number" min="0" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" 
                                value={formData.stock || ''} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">ชิ้น</div>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">รายละเอียดเพิ่มเติม</label>
                    <textarea placeholder="ขนาด สี คุณสมบัติพิเศษ..." className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" rows={3} 
                        value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                
                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">ยกเลิก</button>
                    <button type="submit" className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-200 font-medium transition-colors">
                        {editingId ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
