
import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, Legend, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Download, Trash2, ChevronLeft, ChevronRight, TrendingUp, 
  DollarSign, Users, Calendar, BarChart3, Wallet,
  CreditCard, ShoppingBag, PieChart as PieChartIcon, Clock as ClockIcon,
  BarChart2
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

type FilterType = 'daily' | 'monthly' | 'yearly';
type ViewMode = 'chart' | 'calendar';
type ChartType = 'area' | 'bar';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const Sales = () => {
  const { purchases, prescriptions, customers, paymentHistory, deletePurchase, deletePrescription } = useData();
  const { addToast } = useToast();
  
  // State
  const [filterType, setFilterType] = useState<FilterType>('monthly');
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [deleteConfig, setDeleteConfig] = useState<{ id: string, type: string } | null>(null);

  // --- Date Manipulation ---
  const shiftDate = (amount: number) => {
      const newDate = new Date(selectedDate);
      if (filterType === 'daily') newDate.setDate(newDate.getDate() + amount);
      if (filterType === 'monthly') newDate.setMonth(newDate.getMonth() + amount);
      if (filterType === 'yearly') newDate.setFullYear(newDate.getFullYear() + amount);
      setSelectedDate(newDate);
  };

  const getLabel = () => {
      if (filterType === 'daily') return selectedDate.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      if (filterType === 'monthly') return selectedDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
      return selectedDate.toLocaleDateString('th-TH', { year: 'numeric' });
  };

  const getChartTitle = () => {
      if (filterType === 'daily') return `แนวโน้มรายชั่วโมง (${selectedDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })})`;
      if (filterType === 'monthly') return `แนวโน้มรายวัน (ประจำเดือน ${selectedDate.toLocaleDateString('th-TH', { month: 'long' })})`;
      return `แนวโน้มรายเดือน (ประจำปี ${selectedDate.getFullYear() + 543})`;
  };

  // --- Statistics Calculation ---
  const { salesData, chartData, stats, globalStats, calendarDailyData } = useMemo(() => {
      // 1. Calculate Global Stats
      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const currentYearStr = `${now.getFullYear()}`;

      const getValue = (item: any) => {
          if ('total' in item) return item.total;
          const payment = item.payment || { framePrice: 0, lensPrice: 0, discount: 0 };
          return payment.framePrice + payment.lensPrice - payment.discount;
      };
      const allItems = [...purchases, ...prescriptions];

      const totalSalesAllTime = allItems.reduce((acc, curr) => acc + getValue(curr), 0);
      const monthlySales = allItems.filter(i => i.date.startsWith(currentMonthStr)).reduce((acc, curr) => acc + getValue(curr), 0);
      const yearlySales = allItems.filter(i => i.date.startsWith(currentYearStr)).reduce((acc, curr) => acc + getValue(curr), 0);
      const totalCustomers = customers.length;

      // 2. Filter Data
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      
      const targetDaily = `${year}-${month}-${day}`;
      const targetMonthly = `${year}-${month}`;
      const targetYearly = `${year}`;

      const isMatch = (date: string) => {
          if (filterType === 'daily') return date.startsWith(targetDaily);
          if (filterType === 'monthly') return date.startsWith(targetMonthly);
          return date.startsWith(targetYearly);
      };

      const pSales = purchases
        .filter(p => isMatch(p.date))
        .map(p => ({
            id: p.id,
            date: p.date,
            amount: p.total,
            type: 'General',
            details: (Array.isArray(p.items) ? p.items : []).map(i => i.name).join(', '),
            customerName: customers.find(c => c.id === p.customerId)?.name || 'ลูกค้าทั่วไป',
            status: 'สำเร็จ',
            originalData: p
        }));

      const rxSales = prescriptions
        .filter(p => isMatch(p.date))
        .map(p => {
            const payment = p.payment || { framePrice: 0, lensPrice: 0, discount: 0, remaining: 0 };
            const total = payment.framePrice + payment.lensPrice - payment.discount;
            return {
                id: p.id,
                date: p.date,
                amount: total,
                type: 'Prescription',
                details: `${p.frame?.style || 'กรอบแว่น'} / ${p.lens?.type || 'เลนส์'}`,
                customerName: customers.find(c => c.id === p.customerId)?.name || 'ไม่ระบุ',
                status: payment.remaining === 0 ? 'ชำระครบ' : 'ค้างชำระ',
                originalData: p
            };
        });

      const combinedSales = [...pSales, ...rxSales].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const filteredPayments = paymentHistory.filter(p => isMatch(p.date));

      const categoryMap = new Map<string, number>();
      combinedSales.forEach(s => {
          const key = s.type === 'Prescription' ? 'แว่นสายตา' : 'สินค้าทั่วไป';
          categoryMap.set(key, (categoryMap.get(key) || 0) + s.amount);
      });
      const categoryBreakdown = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));

      // Calendar Data Construction
      const calendarDailyData = new Map<string, number>();
      [...purchases, ...prescriptions].forEach(item => {
          const date = item.date; // YYYY-MM-DD
          const val = 'total' in item ? item.total : (item.payment.framePrice + item.payment.lensPrice - item.payment.discount);
          calendarDailyData.set(date, (calendarDailyData.get(date) || 0) + val);
      });

      // Chart Data Construction
      let chartMap = new Map<string, { sales: number, received: number }>();
      
       if (filterType === 'daily') {
          // X-Axis: 06:00 - 22:00
          for(let i=6; i<=22; i++) chartMap.set(String(i).padStart(2, '0')+':00', { sales: 0, received: 0 });
          
          filteredPayments.forEach(p => {
              const hour = p.time ? p.time.split(':')[0] + ':00' : '12:00';
              if (chartMap.has(hour)) {
                 const current = chartMap.get(hour)!;
                 current.received += p.amount;
              }
          });
          
          combinedSales.forEach(s => {
             // Use 12:00 as default distribution for daily view
             const hour = '12:00'; 
             if (chartMap.has(hour)) {
                const current = chartMap.get(hour)!;
                current.sales += s.amount;
             }
          });

      } else if (filterType === 'monthly') {
          // X-Axis: Days 1 - 31
          const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
          for(let i=1; i<=daysInMonth; i++) chartMap.set(String(i), { sales: 0, received: 0 });
          
          combinedSales.forEach(s => {
              // Parse date manually to avoid timezone shifts
              const parts = s.date.split('-'); // YYYY-MM-DD
              const d = parseInt(parts[2], 10).toString();
              if (chartMap.has(d)) {
                  const current = chartMap.get(d)!;
                  current.sales += s.amount;
              }
          });
          filteredPayments.forEach(p => {
              const parts = p.date.split('-');
              const d = parseInt(parts[2], 10).toString();
               if (chartMap.has(d)) {
                  const current = chartMap.get(d)!;
                  current.received += p.amount;
               }
          });

      } else { // Yearly
          // X-Axis: Jan - Dec
          const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
          months.forEach(m => chartMap.set(m, { sales: 0, received: 0 }));
          
          combinedSales.forEach(s => {
              const parts = s.date.split('-');
              const monthIndex = parseInt(parts[1], 10) - 1;
              const m = months[monthIndex];
              const current = chartMap.get(m)!;
              current.sales += s.amount;
          });
          filteredPayments.forEach(p => {
               const parts = p.date.split('-');
               const monthIndex = parseInt(parts[1], 10) - 1;
               const m = months[monthIndex];
               const current = chartMap.get(m)!;
               current.received += p.amount;
          });
      }

      const finalChartData = Array.from(chartMap.entries()).map(([name, val]) => ({
          name,
          sales: val.sales,
          received: val.received
      }));

      return {
          salesData: combinedSales,
          chartData: finalChartData,
          stats: { categoryBreakdown },
          globalStats: { totalSalesAllTime, monthlySales, yearlySales, totalCustomers },
          calendarDailyData
      };
  }, [purchases, prescriptions, customers, paymentHistory, filterType, selectedDate]);


  // --- Actions ---
  const confirmDelete = () => {
      if (deleteConfig) {
        try {
            if (deleteConfig.type === 'Prescription') {
                deletePrescription(deleteConfig.id);
            } else {
                deletePurchase(deleteConfig.id);
            }
            addToast('ลบข้อมูลแล้ว', 'ลบรายการขายออกจากระบบเรียบร้อย');
        } catch (error) {
            addToast('เกิดข้อผิดพลาด', 'ไม่สามารถลบข้อมูลได้', 'error');
        }
        setDeleteConfig(null);
      }
  };

  const handleExport = () => {
      const csvContent = "data:text/csv;charset=utf-8," 
          + "Date,Customer,Type,Details,Amount,Status\n"
          + salesData.map(e => `${e.date},${e.customerName},${e.type},"${e.details}",${e.amount},${e.status}`).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `sales_report_${filterType}_${selectedDate.toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
  };

  // Calendar render component
  const CalendarView = () => {
      const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
      const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay();
      const today = new Date().toISOString().split('T')[0];
      
      const renderCalendarCell = (day: number) => {
          const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const amount = calendarDailyData.get(dateStr) || 0;
          const isToday = dateStr === today;
          
          return (
              <div key={day} className={`min-h-[80px] border border-slate-100 rounded-lg p-2 flex flex-col justify-between hover:border-primary-300 transition-colors cursor-pointer group ${isToday ? 'bg-blue-50/50 border-blue-200' : 'bg-white'}`}>
                   <span className={`text-sm font-medium ${isToday ? 'text-primary-600 bg-white w-6 h-6 rounded-full flex items-center justify-center shadow-sm' : 'text-slate-700'}`}>{day}</span>
                   {amount > 0 && (
                       <div className="text-right">
                           <span className="text-xs text-slate-400 block">ยอดขาย</span>
                           <span className="font-bold text-green-600 text-sm">฿{(amount/1000).toFixed(1)}k</span>
                       </div>
                   )}
                   {amount === 0 && <span className="text-[10px] text-slate-300 text-center mt-2 opacity-0 group-hover:opacity-100">-</span>}
              </div>
          );
      };

      return (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="grid grid-cols-7 gap-4 mb-2 text-center">
                  {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => <div key={d} className="text-sm font-bold text-slate-400">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`}></div>)}
                  {Array.from({ length: daysInMonth }).map((_, i) => renderCalendarCell(i + 1))}
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">สรุปยอดขาย</h1>
            <p className="text-slate-500 text-sm">ภาพรวมรายได้และสถิติร้านค้า</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-1.5 rounded-xl shadow-sm border border-slate-100">
            {/* View Toggle */}
            <div className="flex bg-slate-100 rounded-lg p-1">
                 <button 
                    onClick={() => setViewMode('chart')} 
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'chart' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                    title="มุมมองกราฟ"
                 >
                     <BarChart3 className="w-4 h-4"/>
                 </button>
                 <button 
                    onClick={() => setViewMode('calendar')} 
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                    title="มุมมองปฏิทิน"
                 >
                     <Calendar className="w-4 h-4"/>
                 </button>
            </div>

            {/* Chart Type Toggle (Only visible in Chart View) */}
            {viewMode === 'chart' && (
                <>
                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                    <div className="flex bg-slate-100 rounded-lg p-1">
                        <button 
                            onClick={() => setChartType('area')} 
                            className={`p-1.5 rounded-md transition-all ${chartType === 'area' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
                            title="กราฟแนวโน้ม (Area Chart)"
                        >
                            <TrendingUp className="w-4 h-4"/>
                        </button>
                        <button 
                            onClick={() => setChartType('bar')} 
                            className={`p-1.5 rounded-md transition-all ${chartType === 'bar' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
                            title="กราฟแท่งเปรียบเทียบ (Bar Chart)"
                        >
                            <BarChart2 className="w-4 h-4"/>
                        </button>
                    </div>
                </>
            )}
            
            <div className="w-px h-6 bg-slate-200 mx-1"></div>

            {/* Filter Toggle */}
            <div className="flex bg-slate-100 rounded-lg p-1">
                {(['daily', 'monthly', 'yearly'] as FilterType[]).map(t => (
                    <button
                        key={t}
                        onClick={() => setFilterType(t)}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                            filterType === t 
                            ? 'bg-white text-slate-800 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {t === 'daily' ? 'รายวัน' : t === 'monthly' ? 'รายเดือน' : 'รายปี'}
                    </button>
                ))}
            </div>

            <div className="w-px h-6 bg-slate-200 mx-1"></div>

            {/* Date Navigator */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                <button onClick={() => shiftDate(-1)} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors"><ChevronLeft className="w-4 h-4"/></button>
                <div className="relative min-w-[140px] h-8 flex items-center justify-center group cursor-pointer hover:bg-slate-50 rounded px-2 transition-colors">
                    <div className="flex items-center gap-2 font-mono font-bold text-slate-700 text-sm pointer-events-none">
                        <Calendar className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                        {getLabel()}
                    </div>
                    {/* Hidden Inputs for Date Selection */}
                    {filterType === 'daily' && (
                        <input type="date" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')}`}
                            onChange={(e) => { if(e.target.value) { const [y, m, d] = e.target.value.split('-').map(Number); setSelectedDate(new Date(y, m-1, d)); }}} />
                    )}
                    {filterType === 'monthly' && (
                        <input type="month" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,'0')}`}
                            onChange={(e) => { if(e.target.value) { const [y, m] = e.target.value.split('-').map(Number); setSelectedDate(new Date(y, m-1, 1)); }}} />
                    )}
                    {filterType === 'yearly' && (
                        <select className="absolute inset-0 opacity-0 cursor-pointer w-full h-full text-center"
                            value={selectedDate.getFullYear()}
                            onChange={(e) => { const d = new Date(selectedDate); d.setFullYear(Number(e.target.value)); setSelectedDate(d); }}>
                            {Array.from({length: 20}, (_, i) => new Date().getFullYear() - i + 1).map(y => (
                                <option key={y} value={y}>{y + 543}</option>
                            ))}
                        </select>
                    )}
                </div>
                <button onClick={() => shiftDate(1)} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors"><ChevronRight className="w-4 h-4"/></button>
            </div>

            <div className="w-px h-6 bg-slate-200 mx-1"></div>

            <button onClick={handleExport} className="p-2 text-slate-500 hover:text-primary-600 hover:bg-slate-50 rounded-lg transition-colors" title="Export CSV">
                <Download className="w-4 h-4" />
            </button>
        </div>
      </div>

      {/* KPI Cards (Overview) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Sales */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 transform group-hover:scale-110 transition-transform">
                  <Wallet className="w-20 h-20 text-purple-600"/>
              </div>
              <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><DollarSign className="w-5 h-5"/></div>
                  <span className="text-slate-500 text-sm font-medium">ยอดขายทั้งหมด</span>
              </div>
              <div className="text-2xl font-bold text-slate-800">฿{globalStats.totalSalesAllTime.toLocaleString()}</div>
              <div className="text-xs text-slate-400 mt-2">ยอดสะสมตั้งแต่เปิดระบบ</div>
          </div>

          {/* 2. Monthly Sales */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 transform group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-20 h-20 text-green-600"/>
              </div>
              <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Calendar className="w-5 h-5"/></div>
                  <span className="text-slate-500 text-sm font-medium">ยอดขายเดือนนี้</span>
              </div>
              <div className="text-2xl font-bold text-slate-800">฿{globalStats.monthlySales.toLocaleString()}</div>
              <div className="text-xs text-slate-400 mt-2">ประจำเดือน {new Date().toLocaleDateString('th-TH', { month: 'long' })}</div>
          </div>

          {/* 3. Yearly Sales */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 transform group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-20 h-20 text-blue-600"/>
              </div>
              <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BarChart3 className="w-5 h-5"/></div>
                  <span className="text-slate-500 text-sm font-medium">ยอดขายปีนี้</span>
              </div>
              <div className="text-2xl font-bold text-slate-800">฿{globalStats.yearlySales.toLocaleString()}</div>
              <div className="text-xs text-slate-400 mt-2">ประจำปี {new Date().getFullYear() + 543}</div>
          </div>

          {/* 4. Total Customers */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 transform group-hover:scale-110 transition-transform">
                  <Users className="w-20 h-20 text-orange-600"/>
              </div>
              <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Users className="w-5 h-5"/></div>
                  <span className="text-slate-500 text-sm font-medium">จำนวนลูกค้า</span>
              </div>
              <div className="text-2xl font-bold text-slate-800">{globalStats.totalCustomers.toLocaleString()}</div>
              <div className="text-xs text-slate-400 mt-2">ลูกค้าทั้งหมดในระบบ</div>
          </div>
      </div>

      {/* Main Charts / Calendar Area */}
      {viewMode === 'calendar' ? (
          <CalendarView />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      {chartType === 'area' ? <TrendingUp className="w-5 h-5 text-primary-500"/> : <BarChart2 className="w-5 h-5 text-primary-500"/>}
                      {getChartTitle()}
                  </h3>
                  <div className="flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary-500"></span> ยอดขาย</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> รับจริง</span>
                  </div>
              </div>
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'area' ? (
                        <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 12, fill: '#64748b'}} 
                                interval={filterType === 'monthly' ? 2 : 0} 
                                tickMargin={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 12, fill: '#64748b'}} 
                                tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
                            />
                            <Tooltip 
                                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} 
                                formatter={(val: number, name: string) => [
                                    `฿${val.toLocaleString()}`, 
                                    name === 'sales' ? 'ยอดขาย' : 'รับจริง'
                                ]}
                            />
                            <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" activeDot={{ r: 6 }} />
                            <Area type="monotone" dataKey="received" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorReceived)" />
                        </AreaChart>
                    ) : (
                        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 12, fill: '#64748b'}} 
                                interval={filterType === 'monthly' ? 2 : 0}
                                tickMargin={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 12, fill: '#64748b'}} 
                                tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
                            />
                            <Tooltip 
                                cursor={{fill: '#f8fafc'}}
                                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} 
                                formatter={(val: number, name: string) => [
                                    `฿${val.toLocaleString()}`, 
                                    name === 'sales' ? 'ยอดขาย' : 'รับจริง'
                                ]}
                            />
                            <Bar dataKey="sales" name="ยอดขาย" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                            <Bar dataKey="received" name="รับจริง" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        </BarChart>
                    )}
                </ResponsiveContainer>
              </div>
          </div>

          {/* Product Mix / Category */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-orange-500"/> สัดส่วนยอดขาย
              </h3>
              <div className="flex-1 min-h-[300px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={stats.categoryBreakdown}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                          >
                              {stats.categoryBreakdown.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                          </Pie>
                          <Tooltip formatter={(val: number) => `฿${val.toLocaleString()}`} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                      </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                      <span className="text-xs text-slate-400">Total</span>
                      <span className="font-bold text-slate-800 text-lg">100%</span>
                  </div>
              </div>
          </div>
      </div>
      )}

      {/* Transaction Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                  <h3 className="font-bold text-slate-800">รายการล่าสุด (Recent Transactions)</h3>
                  <p className="text-sm text-slate-500">ประวัติการขายและใบสั่งตัดแว่น</p>
              </div>
              <div className="px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                  {salesData.length} รายการ
              </div>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100">
                      <tr>
                          <th className="px-6 py-4">วันที่/เวลา</th>
                          <th className="px-6 py-4">ลูกค้า</th>
                          <th className="px-6 py-4">รายละเอียด</th>
                          <th className="px-6 py-4 text-center">สถานะ</th>
                          <th className="px-6 py-4 text-right">ยอดเงิน</th>
                          <th className="px-6 py-4 text-right"></th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                      {salesData.length > 0 ? salesData.map((sale, i) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-6 py-4">
                                  <div className="font-medium text-slate-700 text-sm">
                                      {new Date(sale.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                  </div>
                                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                                      {new Date(sale.date).toLocaleDateString('th-TH', { year: '2-digit' })}
                                  </div>
                              </td>
                              <td className="px-6 py-4">
                                  <div className="text-sm font-medium text-slate-800">{sale.customerName}</div>
                                  <div className="text-xs text-slate-400">{sale.type === 'Prescription' ? 'ตัดแว่น' : 'หน้าร้าน'}</div>
                              </td>
                              <td className="px-6 py-4">
                                  <div className="text-sm text-slate-600 max-w-[200px] truncate" title={sale.details}>
                                      {sale.details}
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                                      sale.status === 'ชำระครบ' || sale.status === 'สำเร็จ' 
                                      ? 'bg-green-50 text-green-700 border-green-100' 
                                      : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                                  }`}>
                                      {sale.status === 'ชำระครบ' || sale.status === 'สำเร็จ' ? <CreditCard className="w-3 h-3 mr-1"/> : <ClockIcon className="w-3 h-3 mr-1"/>}
                                      {sale.status}
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <div className="font-bold text-slate-800">฿{sale.amount.toLocaleString()}</div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <button 
                                    onClick={() => setDeleteConfig({ id: sale.id, type: sale.type })}
                                    className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    title="ลบรายการ"
                                  >
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </td>
                          </tr>
                      )) : (
                          <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                  <div className="flex flex-col items-center gap-2">
                                      <ShoppingBag className="w-10 h-10 opacity-20"/>
                                      <span>ไม่พบข้อมูลการขายในช่วงเวลานี้</span>
                                  </div>
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      <ConfirmationModal
        isOpen={!!deleteConfig}
        onClose={() => setDeleteConfig(null)}
        onConfirm={confirmDelete}
        title="ยืนยันการลบ"
        message={`คุณต้องการลบรายการขายนี้ใช่หรือไม่?\nข้อมูลสต็อกและแต้มสะสมจะถูกปรับปรุงกลับคืนอัตโนมัติ`}
        confirmText="ลบรายการ"
      />
    </div>
  );
};

export default Sales;
