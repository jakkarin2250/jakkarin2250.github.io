
import React from 'react';
import { useData } from '../context/DataContext';
import { Users, Calendar, ShoppingBag, Clock } from 'lucide-react';

const Dashboard = ({ setModule }: { setModule: (m: string) => void }) => {
  const { customers, purchases, prescriptions, appointments, jobs } = useData();

  const today = new Date().toISOString().split('T')[0];

  // Calculate stats
  const todaySales = [...purchases, ...prescriptions]
    .filter(item => item.date === today)
    .reduce((sum, item) => {
        const val = 'total' in item ? item.total : ((item.payment?.framePrice || 0) + (item.payment?.lensPrice || 0) - (item.payment?.discount || 0));
        return sum + val;
    }, 0);

  const todayAppointments = appointments.filter(a => a.date === today).length;
  const pendingJobs = jobs.filter(j => j.status !== 'รับแล้ว').length;
  const totalCustomers = customers.length;

  const recentCustomers = [...customers]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const StatCard = ({ title, value, icon: Icon, color, bg, darkBg }: any) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex items-center transition-all duration-300">
      <div className={`p-4 rounded-full ${bg} ${darkBg} mr-4 transition-colors`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">แดชบอร์ด</h1>
          <p className="text-gray-500 dark:text-slate-400">ภาพรวมประจำวันที่ {new Date().toLocaleDateString('th-TH')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="ยอดขายวันนี้" value={`฿${todaySales.toLocaleString()}`} icon={ShoppingBag} color="text-green-600 dark:text-green-400" bg="bg-green-100" darkBg="dark:bg-green-900/30" />
        <StatCard title="นัดหมายวันนี้" value={todayAppointments} icon={Calendar} color="text-blue-600 dark:text-blue-400" bg="bg-blue-100" darkBg="dark:bg-blue-900/30" />
        <StatCard title="งานรอประกอบ" value={pendingJobs} icon={Clock} color="text-yellow-600 dark:text-yellow-400" bg="bg-yellow-100" darkBg="dark:bg-yellow-900/30" />
        <StatCard title="ลูกค้าทั้งหมด" value={totalCustomers} icon={Users} color="text-purple-600 dark:text-purple-400" bg="bg-purple-100" darkBg="dark:bg-purple-900/30" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Customers */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-all duration-300">
          <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800 dark:text-white">ลูกค้าล่าสุด</h3>
            <button onClick={() => setModule('customers')} className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700">ดูทั้งหมด</button>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-slate-700">
            {recentCustomers.map(customer => (
              <div key={customer.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors flex items-center">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-sm mr-3">
                  {(customer.name || '').charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800 dark:text-slate-100">{customer.name}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{customer.phone}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-400 dark:text-slate-500">{customer.gender}, {customer.age} ปี</p>
                </div>
              </div>
            ))}
            {recentCustomers.length === 0 && <div className="p-8 text-center text-gray-400 dark:text-slate-500">ไม่มีข้อมูลลูกค้า</div>}
          </div>
        </div>

        {/* Quick Actions / Status */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 transition-all duration-300">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-4">สถานะงานล่าสุด</h3>
            <div className="space-y-4">
                {jobs.slice(-5).reverse().map(job => {
                     const customer = customers.find(c => c.id === job.customerId);
                     let statusColor = 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300';
                     if (job.status === 'กำลังประกอบ') statusColor = 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
                     if (job.status === 'พร้อมรับ') statusColor = 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
                     if (job.status === 'รอเลนส์') statusColor = 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400';

                     return (
                        <div key={job.id} className="flex items-center justify-between border-b border-gray-50 dark:border-slate-700/50 pb-2 last:border-0 last:pb-0">
                            <div>
                                <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{customer?.name || 'ลูกค้าทั่วไป'}</p>
                                <p className="text-xs text-gray-500 dark:text-slate-400">{(Array.isArray(job.items) ? job.items : []).join(', ')}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                                {job.status}
                            </span>
                        </div>
                     );
                })}
                {jobs.length === 0 && <p className="text-center text-gray-400 dark:text-slate-500">ไม่มีงานในระบบ</p>}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
