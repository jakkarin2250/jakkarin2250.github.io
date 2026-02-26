
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';
import { useTheme } from './context/ThemeContext';
import ToastContainer from './components/Toast';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Prescriptions from './pages/Prescriptions';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Appointments from './pages/Appointments';
import Jobs from './pages/Jobs';
import Settings from './pages/Settings';
import Installments from './pages/Installments';
import Documents from './pages/Documents';
import SalesBooster from './pages/SalesBooster';
import Accounting from './pages/Accounting';
import Cashflow from './pages/Cashflow';
import AutoLogoutHandler from './components/AutoLogoutHandler';
import { Menu, Moon, Sun } from 'lucide-react';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const { settings } = useData(); 
  const { theme, toggleTheme } = useTheme();
  
  // State with Persistence
  const [module, setModule] = useState(() => sessionStorage.getItem('jt_module') || 'dashboard');
  const [detailId, setDetailId] = useState<string | null>(() => sessionStorage.getItem('jt_detailId') || null);
  
  const [autoOpenAdd, setAutoOpenAdd] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Real-time Clock State
  const [currentDate, setCurrentDate] = useState(new Date());

  // Persist State
  useEffect(() => {
    sessionStorage.setItem('jt_module', module);
  }, [module]);

  useEffect(() => {
    if (detailId) {
      sessionStorage.setItem('jt_detailId', detailId);
    } else {
      sessionStorage.removeItem('jt_detailId');
    }
  }, [detailId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!user) return <Login />;

  const renderModule = () => {
    if (detailId && module === 'customers') {
      return <Prescriptions 
        customerId={detailId} 
        onBack={() => { setDetailId(null); setAutoOpenAdd(false); }} 
        autoOpenAdd={autoOpenAdd}
      />;
    }

    switch (module) {
      case 'customers': return <Customers 
        onViewDetail={(id) => { setDetailId(id); setAutoOpenAdd(false); }} 
        onAddPrescription={(id) => { setDetailId(id); setAutoOpenAdd(true); }}
        onIssueDocument={(id) => { setModule('documents'); setDetailId(id); }}
      />;
      case 'inventory': return <Inventory />;
      case 'sales': return <Sales />;
      case 'accounting': return <Accounting />;
      case 'cashflow': return <Cashflow />;
      case 'documents': return <Documents 
        initialCustomerId={detailId} 
        onBack={() => { 
            // Return to customer module. 
            // If detailId exists, it will auto-render the Customer Detail view (Prescriptions component)
            setModule('customers'); 
        }}
      />;
      case 'appointments': return <Appointments />;
      case 'jobs': return <Jobs />;
      case 'installments': return <Installments />;
      case 'sales-booster': return <SalesBooster />;
      case 'settings': return <Settings />;
      default: return <Dashboard setModule={setModule} />;
    }
  };

  const getModuleTitle = () => {
      if (detailId && module === 'customers') return 'รายละเอียดลูกค้า';
      switch (module) {
          case 'dashboard': return 'แดชบอร์ด';
          case 'customers': return 'จัดการลูกค้า';
          case 'inventory': return 'คลังสินค้า';
          case 'sales': return 'สรุปยอดขาย';
          case 'accounting': return 'การเงินและบัญชี';
          case 'cashflow': return 'บันทึกรายรับ-รายจ่าย';
          case 'documents': return 'ออกเอกสาร';
          case 'appointments': return 'นัดหมาย';
          case 'jobs': return 'ติดตามงาน';
          case 'installments': return 'ระบบผ่อนชำระ';
          case 'sales-booster': return 'ตัวช่วยเร่งยอดขาย';
          case 'settings': return 'ตั้งค่าระบบ';
          default: return '';
      }
  };

  const logoSrc = settings.logo || '/logo.png';

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors duration-300">
      <AutoLogoutHandler />
      <Sidebar 
        currentModule={module} 
        setModule={(m) => { setModule(m); setDetailId(null); }} 
        onLogout={logout} 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm z-10 transition-colors duration-300">
            {/* Left Side: Page Title */}
            <div className="font-bold text-2xl text-slate-800 dark:text-slate-100 tracking-tight">
                {getModuleTitle()}
            </div>

            {/* Right Side: Theme Toggle, Clock & Profile */}
            <div className="flex items-center gap-6">
                
                {/* Theme Toggle */}
                <button 
                  onClick={toggleTheme}
                  className="p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all focus:outline-none"
                  title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                >
                  {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-400" />}
                </button>

                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden lg:block"></div>

                {/* Clock */}
                <div className="text-right hidden lg:block">
                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-100 leading-none font-mono tracking-tight min-w-[140px]">
                        {currentDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 uppercase tracking-wide">
                        {currentDate.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                </div>

                <div className="h-10 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden lg:block"></div>

                {/* Profile */}
                <div className="flex items-center gap-3 pl-2">
                    <div className="text-right">
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{user.displayName || 'Administrator'}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
                    </div>
                    <div className="w-11 h-11 bg-gradient-to-br from-primary-600 to-primary-500 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md ring-2 ring-white dark:ring-slate-600 border border-primary-200 dark:border-slate-600">
                        {(user.displayName || '').charAt(0).toUpperCase() || 'A'}
                    </div>
                </div>
            </div>
        </header>

        {/* Mobile Header */}
        <div className="md:hidden bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-4 flex items-center justify-between shadow-sm transition-colors duration-300">
             <div className="flex items-center gap-3">
                 <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
                     <Menu />
                 </button>
                 <img src={logoSrc} alt="Logo" className="h-8 w-auto object-contain" />
                 <span className="font-bold text-gray-800 dark:text-slate-100 text-lg truncate max-w-[150px]">{settings.shopName}</span>
             </div>
             {/* Mobile Controls */}
             <div className="flex items-center gap-3">
                 <button 
                    onClick={toggleTheme}
                    className="p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                 >
                    {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                 </button>
             </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
          <div className="w-full h-full">
            {renderModule()}
          </div>
        </main>
      </div>
      
      <ToastContainer />
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <DataProvider>
          <MainLayout />
        </DataProvider>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
