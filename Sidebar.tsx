
import React, { useState } from 'react';
import { LayoutDashboard, Users, Calendar, ClipboardList, ShoppingCart, Package, LogOut, Settings, CalendarClock, FileText, Rocket, PieChart, Wallet } from 'lucide-react';
import { useData } from '../context/DataContext';

interface SidebarProps {
  currentModule: string;
  setModule: (module: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const Sidebar = ({ currentModule, setModule, onLogout, isOpen, setIsOpen }: SidebarProps) => {
  const { settings } = useData();
  const [imgError, setImgError] = useState(false);
  
  const menuItems = [
    { id: 'dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
    { id: 'customers', label: 'จัดการลูกค้า', icon: Users },
    { id: 'appointments', label: 'นัดหมาย', icon: Calendar },
    { id: 'jobs', label: 'ติดตามงาน', icon: ClipboardList },
    { id: 'sales', label: 'สรุปยอดขาย', icon: ShoppingCart },
    { id: 'accounting', label: 'การเงินและบัญชี', icon: PieChart },
    { id: 'cashflow', label: 'บันทึกรายรับ-รายจ่าย', icon: Wallet },
    { id: 'documents', label: 'ออกเอกสาร', icon: FileText },
    { id: 'inventory', label: 'คลังสินค้า', icon: Package },
    { id: 'installments', label: 'ระบบผ่อนชำระ', icon: CalendarClock },
    { id: 'sales-booster', label: 'ตัวช่วยเร่งยอดขาย', icon: Rocket },
    { id: 'settings', label: 'ตั้งค่าระบบ', icon: Settings },
  ];

  const logoSrc = settings.logo || '/logo.png';

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 transform transition-transform duration-300 md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-center h-20 border-b border-gray-200 dark:border-slate-700 transition-colors">
            <div className="flex items-center gap-3 px-4">
              {!imgError ? (
                <img 
                  src={logoSrc}
                  alt={settings.shopName}
                  className="h-10 w-auto object-contain"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                  {(settings.shopName || '').charAt(0)}
                </div>
              )}
              <span className="text-xl font-bold text-gray-800 dark:text-white tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">
                {settings.shopName}
              </span>
            </div>
          </div>

          {/* Nav Items */}
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-3">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setModule(item.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-150 ${
                    currentModule === item.id
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-slate-200'
                  }`}
                >
                  <item.icon className={`mr-3 h-5 w-5 ${
                    currentModule === item.id 
                      ? 'text-primary-600 dark:text-primary-400' 
                      : item.id === 'sales-booster' 
                        ? 'text-orange-500' 
                        : 'text-gray-400 dark:text-slate-500 group-hover:text-gray-500'
                  }`} />
                  {item.label}
                  {item.id === 'sales-booster' && (
                      <span className="ml-auto bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">HOT</span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 transition-colors">
            <button
              onClick={onLogout}
              className="w-full flex items-center px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              ออกจากระบบ
            </button>
            <div className="mt-4 text-xs text-center text-gray-400 dark:text-slate-600">
              v1.2.0 &copy; 2024 {settings.shopName}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
