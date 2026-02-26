
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  PieChart, TrendingUp, TrendingDown, Book, 
  FileSpreadsheet, Lock, Unlock, DollarSign, Plus,
  ShieldCheck, ArrowRightLeft, X, Pencil, Trash2, Save, AlertCircle,
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, RotateCcw
} from 'lucide-react';
import { Account, JournalEntry, JournalLine } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';

type Tab = 'calendar' | 'dashboard' | 'journal' | 'reports';

// --- Extracted Components to prevent re-mounting issues ---

const AccountingFilterControls = ({ month, setMonth, year, setYear, years }: { month: number, setMonth: (m: number) => void, year: number, setYear: (y: number) => void, years: number[] }) => (
    <div className="flex justify-end mb-4">
       <div className="flex gap-3 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <select 
              className="bg-transparent text-sm font-medium text-slate-700 outline-none px-2 cursor-pointer"
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
          >
              {Array.from({length: 12}).map((_, i) => (
                  <option key={i+1} value={i+1}>เดือน {new Date(2000, i, 1).toLocaleDateString('th-TH', { month: 'long' })}</option>
              ))}
          </select>
          <div className="w-px bg-slate-200"></div>
          <select 
              className="bg-transparent text-sm font-medium text-slate-700 outline-none px-2 cursor-pointer"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
          >
              {years.map(y => (
                  <option key={y} value={y}>{y + 543} ({y})</option>
              ))}
          </select>
      </div>
    </div>
);

const StatCard = ({ title, value, color, icon: Icon }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
        <div>
            <p className="text-sm text-slate-500 mb-1">{title}</p>
            <h3 className={`text-2xl font-bold ${color}`}>฿{value.toLocaleString()}</h3>
        </div>
        <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('700', '50').replace('600', '50')}`}>
            <Icon className={`w-6 h-6 ${color}`} />
        </div>
    </div>
);

const Accounting = () => {
  const { journalEntries, accounts, accountingPeriods, addJournalEntry, updateJournalEntry, deleteJournalEntry, closeAccountingPeriod, reopenAccountingPeriod } = useData();
  const { addToast } = useToast();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<Tab>('calendar');
  
  // Filter State
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  // Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  // Management State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form State
  const [entryForm, setEntryForm] = useState<{
      date: string;
      reference: string;
      description: string;
      lines: JournalLine[];
  }>({
      date: new Date().toISOString().split('T')[0],
      reference: '',
      description: '',
      lines: [
          { accountId: '', accountName: '', debit: 0, credit: 0 },
          { accountId: '', accountName: '', debit: 0, credit: 0 }
      ]
  });

  // --- Computed Data ---

  // Available Years
  const availableYears = useMemo(() => {
      const currentYear = new Date().getFullYear();
      const years = new Set<number>();
      for (let i = 0; i <= 20; i++) years.add(currentYear - i);
      journalEntries.forEach(entry => {
          if (entry.date) {
              const y = new Date(entry.date).getFullYear();
              if (!isNaN(y)) years.add(y);
          }
      });
      return Array.from(years).sort((a, b) => b - a);
  }, [journalEntries]);

  // Statistics (Dashboard & Reports)
  const stats = useMemo(() => {
      const filtered = journalEntries.filter(j => {
          const d = new Date(j.date);
          return d.getMonth() + 1 === filterMonth && d.getFullYear() === filterYear;
      });

      let revenue = 0;
      let expenses = 0;
      let assetsChange = 0;
      let liabilitiesChange = 0;

      filtered.forEach(entry => {
          if (entry.status !== 'posted') return;
          entry.lines.forEach(line => {
              const acc = accounts.find(a => a.id === line.accountId);
              if (!acc) return;
              if (acc.type === 'Revenue') revenue += line.credit - line.debit;
              if (acc.type === 'Expense') expenses += line.debit - line.credit;
              if (acc.type === 'Asset') assetsChange += line.debit - line.credit;
              if (acc.type === 'Liability') liabilitiesChange += line.credit - line.debit;
          });
      });

      return { revenue, expenses, netProfit: revenue - expenses, assetsChange, liabilitiesChange, transactionCount: filtered.length };
  }, [journalEntries, accounts, filterMonth, filterYear]);

  // Calendar Data
  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();

  const dailyStats = useMemo(() => {
      const s: Record<number, { income: number, expense: number, count: number }> = {};
      journalEntries.forEach(entry => {
          const d = new Date(entry.date);
          if (d.getFullYear() === calendarYear && d.getMonth() === calendarMonth && entry.status === 'posted') {
              const day = d.getDate();
              if (!s[day]) s[day] = { income: 0, expense: 0, count: 0 };
              s[day].count++;
              entry.lines.forEach(line => {
                  const acc = accounts.find(a => a.id === line.accountId);
                  if (acc?.type === 'Revenue') s[day].income += (line.credit - line.debit);
                  if (acc?.type === 'Expense') s[day].expense += (line.debit - line.credit);
              });
          }
      });
      return s;
  }, [journalEntries, calendarYear, calendarMonth, accounts]);

  const selectedDayEntries = useMemo(() => {
      return journalEntries.filter(entry => {
          const d = new Date(entry.date);
          return d.getFullYear() === calendarYear && d.getMonth() === calendarMonth && d.getDate() === selectedDay;
      });
  }, [journalEntries, calendarYear, calendarMonth, selectedDay]);

  // Journal View Data
  const sortedEntries = useMemo(() => {
      return [...journalEntries].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [journalEntries]);

  // --- Handlers ---

  const handleOpenModal = (entry?: JournalEntry, dateOverride?: string) => {
      if (entry) {
          setEditingEntry(entry);
          setEntryForm({
              date: entry.date,
              reference: entry.reference,
              description: entry.description,
              lines: entry.lines.map(l => ({...l}))
          });
      } else {
          setEditingEntry(null);
          setEntryForm({
              date: dateOverride || new Date().toISOString().split('T')[0],
              reference: `JV-${Date.now().toString().substr(-6)}`,
              description: '',
              lines: [
                  { accountId: '', accountName: '', debit: 0, credit: 0 },
                  { accountId: '', accountName: '', debit: 0, credit: 0 }
              ]
          });
      }
      setIsModalOpen(true);
  };

  const handleLineChange = (index: number, field: keyof JournalLine, value: any) => {
      const newLines = [...entryForm.lines];
      if (field === 'accountId') {
          const acc = accounts.find(a => a.id === value);
          newLines[index].accountId = value;
          newLines[index].accountName = acc ? acc.name : '';
      } else {
          (newLines[index] as any)[field] = value;
      }
      setEntryForm({ ...entryForm, lines: newLines });
  };

  const handleAddLine = () => {
      setEntryForm({
          ...entryForm,
          lines: [...entryForm.lines, { accountId: '', accountName: '', debit: 0, credit: 0 }]
      });
  };

  const handleRemoveLine = (index: number) => {
      if (entryForm.lines.length <= 2) {
          addToast('แจ้งเตือน', 'ต้องมีอย่างน้อย 2 รายการ (เดบิต/เครดิต)', 'error');
          return;
      }
      const newLines = entryForm.lines.filter((_, i) => i !== index);
      setEntryForm({ ...entryForm, lines: newLines });
  };

  const handleSaveEntry = (e: React.FormEvent) => {
      e.preventDefault();
      const totalDebit = entryForm.lines.reduce((sum, l) => sum + Number(l.debit), 0);
      const totalCredit = entryForm.lines.reduce((sum, l) => sum + Number(l.credit), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
          addToast('ยอดไม่ดุล', `ยอดรวมเดบิต (${totalDebit.toLocaleString()}) ไม่เท่ากับเครดิต (${totalCredit.toLocaleString()})`, 'error');
          return;
      }

      if (entryForm.lines.some(l => !l.accountId)) {
          addToast('ข้อมูลไม่ครบ', 'กรุณาระบุบัญชีให้ครบทุกรายการ', 'error');
          return;
      }

      const payload = {
          date: entryForm.date,
          reference: entryForm.reference,
          description: entryForm.description,
          totalAmount: totalDebit,
          status: 'posted' as const,
          moduleSource: editingEntry ? editingEntry.moduleSource : 'manual' as const,
          lines: entryForm.lines.map(l => ({ ...l, debit: Number(l.debit), credit: Number(l.credit) }))
      };

      try {
          if (editingEntry) {
              updateJournalEntry(editingEntry.id, payload);
              addToast('สำเร็จ', 'แก้ไขรายการบัญชีเรียบร้อยแล้ว');
          } else {
              addJournalEntry(payload as any);
              addToast('สำเร็จ', 'บันทึกรายการบัญชีใหม่เรียบร้อยแล้ว');
          }
          setIsModalOpen(false);
      } catch (error: any) {
          addToast('เกิดข้อผิดพลาด', error.message, 'error');
      }
  };

  const handleDeleteEntry = () => {
      if (deleteId) {
          deleteJournalEntry(deleteId);
          addToast('ลบสำเร็จ', 'ลบรายการบัญชีเรียบร้อยแล้ว');
          setDeleteId(null);
      }
  };

  const handlePrevMonth = () => {
      setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1));
      setSelectedDay(1);
  };

  const handleNextMonth = () => {
      setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1));
      setSelectedDay(1);
  };

  // --- Render Functions (converted from inline components) ---

  const renderCalendarView = () => (
      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden animate-in fade-in duration-300">
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-indigo-600"/> ปฏิทินรายการบัญชี
                  </h3>
                  <div className="flex items-center gap-4 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                      <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded text-slate-500"><ChevronLeft className="w-5 h-5"/></button>
                      <span className="text-sm font-bold text-slate-700 min-w-[140px] text-center select-none">
                          {calendarDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                      </span>
                      <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded text-slate-500"><ChevronRight className="w-5 h-5"/></button>
                  </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto">
                  <div className="grid grid-cols-7 gap-2 mb-2">
                      {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => (
                          <div key={d} className="text-center text-xs font-bold text-slate-400 py-2">{d}</div>
                      ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2 auto-rows-fr">
                      {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="min-h-[80px]"></div>)}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                          const day = i + 1;
                          const stat = dailyStats[day];
                          const isSelected = day === selectedDay;
                          const isToday = new Date().getDate() === day && new Date().getMonth() === calendarMonth && new Date().getFullYear() === calendarYear;

                          return (
                              <div 
                                  key={day}
                                  onClick={() => setSelectedDay(day)}
                                  className={`
                                      min-h-[80px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group select-none
                                      ${isSelected ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 shadow-sm' : 'bg-white border-slate-100 hover:border-indigo-300 hover:shadow-sm'}
                                  `}
                              >
                                  <div className="flex justify-between items-start">
                                      <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-700'}`}>{day}</span>
                                      {stat && stat.count > 0 && (
                                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full border border-slate-200">{stat.count} รายการ</span>
                                      )}
                                  </div>
                                  {stat && (
                                      <div className="flex flex-col gap-1 mt-2 text-[10px] font-bold">
                                          {stat.income > 0 && (
                                              <div className="flex justify-between items-center text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                                  <span>รับ</span>
                                                  <span>฿{stat.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                              </div>
                                          )}
                                          {stat.expense > 0 && (
                                              <div className="flex justify-between items-center text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                                                   <span>จ่าย</span>
                                                   <span>฿{stat.expense.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                              </div>
                                          )}
                                      </div>
                                  )}
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>

          <div className="lg:w-96 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2">
                      <Book className="w-4 h-4"/> รายการวันที่ {selectedDay} {calendarDate.toLocaleDateString('th-TH', { month: 'long' })}
                  </h4>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                  {selectedDayEntries.length > 0 ? selectedDayEntries.map(entry => (
                      <div key={entry.id} className="p-3 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors bg-white shadow-sm group">
                          <div className="flex justify-between items-start mb-1.5">
                              <span className="font-bold text-slate-800 text-sm line-clamp-1">{entry.description}</span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleOpenModal(entry)} className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="แก้ไข"><Pencil className="w-3.5 h-3.5"/></button>
                                  <button onClick={() => setDeleteId(entry.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="ลบ"><Trash2 className="w-3.5 h-3.5"/></button>
                              </div>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1 rounded">{entry.reference}</span>
                              <span className="text-[10px] text-slate-400 bg-slate-100 px-1 rounded uppercase">{entry.moduleSource}</span>
                          </div>
                          
                          <div className="space-y-1 pt-2 border-t border-slate-100">
                              {entry.lines.map((line, idx) => {
                                  const acc = accounts.find(a => a.id === line.accountId);
                                  const isDebit = line.debit > 0;
                                  const color = acc?.type === 'Revenue' ? 'text-emerald-600' : acc?.type === 'Expense' ? 'text-rose-600' : 'text-slate-600';
                                  
                                  if (line.debit === 0 && line.credit === 0) return null;

                                  return (
                                      <div key={idx} className="flex justify-between text-xs items-center">
                                          <span className="text-slate-500 truncate max-w-[60%]">{line.accountName}</span>
                                          <span className={`font-mono font-medium ${color}`}>
                                              {isDebit ? `${line.debit.toLocaleString()}` : `(${line.credit.toLocaleString()})`}
                                          </span>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  )) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
                          <CalendarIcon className="w-12 h-12 mb-3 opacity-20" />
                          <p className="text-sm">ไม่มีรายการในวันนี้</p>
                      </div>
                  )}
              </div>
              <div className="p-4 border-t border-slate-100 bg-white">
                  <button 
                      onClick={() => {
                          const d = new Date(calendarYear, calendarMonth, selectedDay);
                          const yearStr = d.getFullYear();
                          const monthStr = String(d.getMonth() + 1).padStart(2, '0');
                          const dayStr = String(d.getDate()).padStart(2, '0');
                          const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
                          handleOpenModal(undefined, dateStr);
                      }}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-200"
                  >
                      <Plus className="w-4 h-4"/> เพิ่มรายการใหม่
                  </button>
              </div>
          </div>
      </div>
  );

  const renderDashboardView = () => {
      const isPeriodClosed = accountingPeriods.some(p => p.year === filterYear && p.month === filterMonth && p.isClosed);
      return (
          <div className="space-y-6 animate-in fade-in duration-300">
              <AccountingFilterControls month={filterMonth} setMonth={setFilterMonth} year={filterYear} setYear={setFilterYear} years={availableYears} />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="รายได้ (Revenue)" value={stats.revenue} color="text-green-600" icon={TrendingUp} />
                  <StatCard title="ค่าใช้จ่าย (Expense)" value={stats.expenses} color="text-red-600" icon={TrendingDown} />
                  <StatCard title="กำไรสุทธิ (Net Profit)" value={stats.netProfit} color="text-blue-600" icon={DollarSign} />
                  <StatCard title="รายการบันทึก (Transactions)" value={stats.transactionCount} color="text-purple-600" icon={Book} />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-100">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><PieChart className="w-5 h-5 text-indigo-500"/> สรุปสถานะการเงิน (Financial Health)</h3>
                      <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                              <span className="text-slate-600">สินทรัพย์หมุนเวียน (เพิ่มขึ้นในงวด)</span>
                              <span className="font-bold text-green-600">+฿{stats.assetsChange.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                              <span className="text-slate-600">หนี้สิน (เพิ่มขึ้นในงวด)</span>
                              <span className="font-bold text-red-600">+฿{stats.liabilitiesChange.toLocaleString()}</span>
                          </div>
                      </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-slate-100">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-indigo-500"/> สถานะทางบัญชี (Audit Status)</h3>
                      <div className="space-y-3">
                          {isPeriodClosed ? (
                              <div className="flex items-center gap-3 text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                                  <Lock className="w-5 h-5" /> 
                                  <div>
                                      <div className="font-bold">งวดบัญชีปิดแล้ว</div>
                                      <div className="text-xs">ไม่สามารถแก้ไขรายการย้อนหลังได้</div>
                                  </div>
                              </div>
                          ) : (
                              <div className="flex items-center gap-3 text-green-600 bg-green-50 p-3 rounded-lg border border-green-100">
                                  <Unlock className="w-5 h-5" /> 
                                  <div>
                                      <div className="font-bold">งวดบัญชีเปิดอยู่</div>
                                      <div className="text-xs">สามารถบันทึกรายการได้ตามปกติ</div>
                                  </div>
                              </div>
                          )}
                          
                          <div className="mt-4 flex flex-col gap-2">
                              <button 
                                  disabled={isPeriodClosed}
                                  onClick={() => {
                                      if(window.confirm(`คุณต้องการปิดงวดบัญชี ${filterMonth}/${filterYear} ใช่หรือไม่?`)) {
                                          closeAccountingPeriod(filterYear, filterMonth);
                                          addToast('สำเร็จ', 'ปิดงวดบัญชีเรียบร้อยแล้ว');
                                      }
                                  }}
                                  className={`w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                                      isPeriodClosed 
                                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                                      : 'bg-slate-800 hover:bg-slate-900 text-white shadow-md shadow-slate-300'
                                  }`}
                              >
                                  {isPeriodClosed ? (
                                      <><Lock className="w-4 h-4" /> ปิดงวดแล้ว (Closed)</>
                                  ) : (
                                      'ล็อกงวดบัญชี (Close Period)'
                                  )}
                              </button>
                              
                              {isPeriodClosed && (
                                  <button 
                                      onClick={() => {
                                          if(window.confirm(`ต้องการปลดล็อกงวดบัญชี ${filterMonth}/${filterYear} หรือไม่?`)) {
                                              reopenAccountingPeriod(filterYear, filterMonth);
                                              addToast('สำเร็จ', 'ปลดล็อกงวดบัญชีเรียบร้อยแล้ว');
                                          }
                                      }}
                                      className="text-xs text-slate-400 hover:text-slate-600 hover:underline flex items-center justify-center gap-1 py-1"
                                  >
                                      <RotateCcw className="w-3 h-3"/> ปลดล็อกงวดบัญชี (Re-open)
                                  </button>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderJournalView = () => (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col h-full animate-in fade-in duration-300">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-700">สมุดรายวันทั่วไป (General Journal)</h3>
              <button onClick={() => handleOpenModal()} className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4"/> สร้างรายการปรับปรุง (JV)
              </button>
          </div>
          <div className="overflow-auto flex-1 custom-scrollbar">
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs sticky top-0 z-10">
                      <tr>
                          <th className="px-6 py-4">วันที่</th>
                          <th className="px-6 py-4">อ้างอิง</th>
                          <th className="px-6 py-4">รายละเอียด</th>
                          <th className="px-6 py-4">บัญชี (Account)</th>
                          <th className="px-6 py-4 text-right">เดบิต (Dr)</th>
                          <th className="px-6 py-4 text-right">เครดิต (Cr)</th>
                          <th className="px-6 py-4 text-center">สถานะ</th>
                          <th className="px-6 py-4 text-right">จัดการ</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {sortedEntries.map(entry => (
                          <React.Fragment key={entry.id}>
                              {entry.lines.map((line, idx) => (
                                  <tr key={`${entry.id}-${idx}`} className={`hover:bg-slate-50 ${idx === 0 ? 'border-t border-slate-100' : ''}`}>
                                      {idx === 0 ? (
                                          <>
                                              <td className="px-6 py-2 align-top pt-4 font-medium text-slate-700" rowSpan={entry.lines.length}>
                                                  {new Date(entry.date).toLocaleDateString('th-TH')}
                                              </td>
                                              <td className="px-6 py-2 align-top pt-4 font-mono text-xs text-blue-600" rowSpan={entry.lines.length}>
                                                  {entry.reference}
                                              </td>
                                              <td className="px-6 py-2 align-top pt-4 text-slate-600" rowSpan={entry.lines.length}>
                                                  {entry.description}
                                                  <div className="text-[10px] text-slate-400 mt-1">Source: {entry.moduleSource}</div>
                                              </td>
                                          </>
                                      ) : null}
                                      <td className="px-6 py-1 text-slate-700 border-l border-slate-50">
                                          {line.accountName}
                                      </td>
                                      <td className="px-6 py-1 text-right font-mono text-slate-600">
                                          {line.debit > 0 ? line.debit.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}
                                      </td>
                                      <td className="px-6 py-1 text-right font-mono text-slate-600">
                                          {line.credit > 0 ? line.credit.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}
                                      </td>
                                      {idx === 0 ? (
                                          <>
                                           <td className="px-6 py-2 align-top pt-4 text-center" rowSpan={entry.lines.length}>
                                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                                                  entry.status === 'posted' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                                              }`}>
                                                  {entry.status}
                                              </span>
                                          </td>
                                          <td className="px-6 py-2 align-top pt-4 text-right" rowSpan={entry.lines.length}>
                                              <div className="flex justify-end gap-2">
                                                  <button 
                                                      onClick={() => handleOpenModal(entry)} 
                                                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                      title="แก้ไขรายการ"
                                                  >
                                                      <Pencil className="w-4 h-4" />
                                                  </button>
                                                  <button 
                                                      onClick={() => setDeleteId(entry.id)} 
                                                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                      title="ลบรายการ"
                                                  >
                                                      <Trash2 className="w-4 h-4" />
                                                  </button>
                                              </div>
                                          </td>
                                          </>
                                      ) : null}
                                  </tr>
                              ))}
                          </React.Fragment>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
  );

  const renderReportsView = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
          <AccountingFilterControls month={filterMonth} setMonth={setFilterMonth} year={filterYear} setYear={setFilterYear} years={availableYears} />
          <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm max-w-4xl mx-auto">
              <div className="text-center mb-8 border-b pb-6">
                  <h2 className="text-2xl font-bold text-slate-800">งบกำไรขาดทุน (Profit & Loss)</h2>
                  <p className="text-slate-500">สำหรับงวด {filterMonth}/{filterYear}</p>
              </div>
              
              <div className="space-y-6">
                  <div>
                      <h4 className="font-bold text-slate-700 mb-2">รายได้ (Revenue)</h4>
                      <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                              <span>รายได้จากการขาย</span>
                              <span>฿{stats.revenue.toLocaleString()}</span>
                          </div>
                      </div>
                      <div className="flex justify-between font-bold text-slate-800 pt-2 border-t mt-2">
                          <span>รวมรายได้</span>
                          <span>฿{stats.revenue.toLocaleString()}</span>
                      </div>
                  </div>

                  <div>
                      <h4 className="font-bold text-slate-700 mb-2">ค่าใช้จ่าย (Expenses)</h4>
                      <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                              <span>ต้นทุนขาย & ค่าใช้จ่ายดำเนินงาน</span>
                              <span>฿{stats.expenses.toLocaleString()}</span>
                          </div>
                      </div>
                      <div className="flex justify-between font-bold text-slate-800 pt-2 border-t mt-2">
                          <span>รวมค่าใช้จ่าย</span>
                          <span>฿{stats.expenses.toLocaleString()}</span>
                      </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg flex justify-between items-center border border-slate-200">
                      <span className="text-lg font-bold text-slate-900">กำไรสุทธิ (Net Profit)</span>
                      <span className={`text-xl font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ฿{stats.netProfit.toLocaleString()}
                      </span>
                  </div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <PieChart className="w-7 h-7 text-indigo-600" /> การเงินและบัญชี (Finance & Accounting)
          </h1>
          <p className="text-slate-500 text-sm mt-1">ระบบบัญชีอัตโนมัติมาตรฐาน Audit Ready</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
          {[
              { id: 'calendar', label: 'ปฏิทิน (Calendar)', icon: CalendarIcon },
              { id: 'dashboard', label: 'ภาพรวม (Dashboard)', icon: PieChart },
              { id: 'journal', label: 'สมุดรายวัน (Journal)', icon: Book },
              { id: 'reports', label: 'งบการเงิน (Reports)', icon: FileSpreadsheet },
          ].map(tab => (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id 
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-lg'
                  }`}
              >
                  <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
          ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'calendar' && renderCalendarView()}
          {activeTab === 'dashboard' && renderDashboardView()}
          {activeTab === 'journal' && renderJournalView()}
          {activeTab === 'reports' && renderReportsView()}
      </div>

      {/* Journal Entry Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          <Book className="w-5 h-5 text-indigo-600"/> {editingEntry ? 'แก้ไขรายการบัญชี' : 'บันทึกรายการรายวัน (Journal Entry)'}
                      </h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-5 h-5"/>
                      </button>
                  </div>
                  
                  <form onSubmit={handleSaveEntry} className="flex-1 flex flex-col overflow-hidden">
                      <div className="p-6 space-y-6 overflow-y-auto flex-1">
                          {/* Header Info */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">วันที่</label>
                                  <input type="date" required className="w-full border rounded-lg p-2.5 text-sm" 
                                      value={entryForm.date} onChange={e => setEntryForm({...entryForm, date: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">เลขอ้างอิง (Ref No.)</label>
                                  <input type="text" required className="w-full border rounded-lg p-2.5 text-sm font-mono" 
                                      value={entryForm.reference} onChange={e => setEntryForm({...entryForm, reference: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">คำอธิบายรายการ</label>
                                  <input type="text" required className="w-full border rounded-lg p-2.5 text-sm" 
                                      value={entryForm.description} onChange={e => setEntryForm({...entryForm, description: e.target.value})} />
                              </div>
                          </div>

                          {/* Lines Grid */}
                          <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                              <table className="w-full text-left text-sm">
                                  <thead className="bg-slate-100 text-slate-500 text-xs uppercase font-semibold">
                                      <tr>
                                          <th className="px-4 py-3">ชื่อบัญชี (Account)</th>
                                          <th className="px-4 py-3 w-32 text-right">เดบิต (Dr)</th>
                                          <th className="px-4 py-3 w-32 text-right">เครดิต (Cr)</th>
                                          <th className="px-4 py-3 w-10 text-center"></th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200 bg-white">
                                      {entryForm.lines.map((line, index) => (
                                          <tr key={index}>
                                              <td className="px-4 py-2">
                                                  <select 
                                                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                                                      value={line.accountId}
                                                      onChange={e => handleLineChange(index, 'accountId', e.target.value)}
                                                  >
                                                      <option value="">-- เลือกบัญชี --</option>
                                                      {accounts.map(acc => (
                                                          <option key={acc.id} value={acc.id}>
                                                              {acc.code} - {acc.name}
                                                          </option>
                                                      ))}
                                                  </select>
                                              </td>
                                              <td className="px-4 py-2">
                                                  <input 
                                                      type="number" min="0" step="0.01"
                                                      className="w-full p-2 border border-slate-200 rounded-lg text-right outline-none focus:border-indigo-500"
                                                      value={line.debit}
                                                      onChange={e => handleLineChange(index, 'debit', e.target.value)}
                                                      disabled={Number(line.credit) > 0}
                                                  />
                                              </td>
                                              <td className="px-4 py-2">
                                                  <input 
                                                      type="number" min="0" step="0.01"
                                                      className="w-full p-2 border border-slate-200 rounded-lg text-right outline-none focus:border-indigo-500"
                                                      value={line.credit}
                                                      onChange={e => handleLineChange(index, 'credit', e.target.value)}
                                                      disabled={Number(line.debit) > 0}
                                                  />
                                              </td>
                                              <td className="px-4 py-2 text-center">
                                                  <button 
                                                      type="button"
                                                      onClick={() => handleRemoveLine(index)}
                                                      className="text-slate-400 hover:text-red-500"
                                                  >
                                                      <X className="w-4 h-4" />
                                                  </button>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                                  <tfoot className="bg-slate-50 font-bold text-slate-700">
                                      <tr>
                                          <td className="px-4 py-3">
                                              <button 
                                                  type="button"
                                                  onClick={handleAddLine}
                                                  className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center gap-1"
                                              >
                                                  <Plus className="w-3 h-3"/> เพิ่มรายการ
                                              </button>
                                          </td>
                                          <td className="px-4 py-3 text-right">
                                              {entryForm.lines.reduce((s, l) => s + Number(l.debit), 0).toLocaleString()}
                                          </td>
                                          <td className="px-4 py-3 text-right">
                                              {entryForm.lines.reduce((s, l) => s + Number(l.credit), 0).toLocaleString()}
                                          </td>
                                          <td></td>
                                      </tr>
                                  </tfoot>
                              </table>
                          </div>
                          
                          {/* Balance Check */}
                          {(() => {
                              const dr = entryForm.lines.reduce((s, l) => s + Number(l.debit), 0);
                              const cr = entryForm.lines.reduce((s, l) => s + Number(l.credit), 0);
                              const diff = Math.abs(dr - cr);
                              if (diff > 0.01) {
                                  return (
                                      <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 text-sm font-medium">
                                          <AlertCircle className="w-5 h-5"/>
                                          ยอดไม่ดุล: ผลต่าง {diff.toLocaleString()} (Dr: {dr.toLocaleString()} / Cr: {cr.toLocaleString()})
                                      </div>
                                  );
                              }
                              return null;
                          })()}
                      </div>

                      <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all">ยกเลิก</button>
                          <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2">
                              <Save className="w-4 h-4"/> บันทึกรายการ
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDeleteEntry}
          title="ลบรายการบัญชี"
          message="คุณต้องการลบรายการบัญชีนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้"
          confirmText="ลบข้อมูล"
      />
    </div>
  );
};

export default Accounting;
