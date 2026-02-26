
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Customer, Prescription, PaymentHistory, PointTransaction, Promotion } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';
import { 
  ChevronLeft, Plus, Printer, Trash2, Edit, Sparkles, 
  DollarSign, User, Phone, MapPin, Calendar, Clock, 
  CheckCircle2, AlertCircle, Eye, FileText, CreditCard, Check, Gift, Tag, RotateCcw, MinusCircle, PlusCircle,
  Award, ShieldCheck, Star, Crown, ArrowRight, Wand2, Loader2, X
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface Props {
  customerId: string;
  onBack: () => void;
  autoOpenAdd?: boolean;
}

const FRAME_STYLES = ['กรอบเต็ม', 'กรอบเซาะเอ็น', 'กรอบเซาะเหล็ก', 'กรอบเจาะ'];
const LENS_TYPES = ['Single Vision', '2 ชั้น KIPTOP', '2 ชั้น FATTOP', 'Progressive'];
const LENS_FEATURES = [
  'CR-39', 
  'CR-39 เคลือบสี', 
  'MULTICOAT', 
  'BLUEBLOCK', 
  'AUTO LENS', 
  'BLUE BLOCK AUTO LENS'
];
const LENS_INDEXES = ['1.56', '1.61', '1.67', '1.74'];
const USAGE_TYPES = ['มองไกล', 'มองใกล้', 'มองไกลและใกล้'];

const TIERS = [
    { name: 'Bronze', points: 0, color: 'bg-orange-50 border-orange-200 text-orange-700', icon: Award },
    { name: 'Silver', points: 101, color: 'bg-slate-50 border-slate-200 text-slate-700', icon: ShieldCheck },
    { name: 'Gold', points: 501, color: 'bg-yellow-50 border-yellow-200 text-yellow-700', icon: Star },
    { name: 'Platinum', points: 1001, color: 'bg-purple-50 border-purple-200 text-purple-700', icon: Crown }
];

const CustomerDetail = ({ customerId, onBack, autoOpenAdd }: Props) => {
  const { 
    customers, 
    prescriptions, 
    paymentHistory, 
    pointTransactions,
    settings,
    updateCustomer,
    addPrescription, 
    updatePrescription, 
    deletePrescription, 
    addPayment, 
    updatePayment,
    deletePayment,
    adjustPoints,
    recalculatePoints,
    calculateAvailablePromotions,
    addJob
  } = useData();
  
  const { addToast } = useToast();

  const customer = customers.find(c => String(c.id) === String(customerId));
  // Ensure arrays are valid to prevent crashes if data is missing
  const customerPrescriptions = (prescriptions || []).filter(p => String(p.customerId) === String(customerId));
  const customerPayments = (paymentHistory || []).filter(p => String(p.customerId) === String(customerId));
  const customerPoints = (pointTransactions || []).filter(p => String(p.customerId) === String(customerId)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Logic for Membership Tier
  const { currentTier, nextTier, progress } = useMemo(() => {
      const pts = customer?.points || 0;
      const sortedTiers = [...TIERS].sort((a, b) => b.points - a.points);
      const current = sortedTiers.find(t => pts >= t.points) || TIERS[sortedTiers.length - 1];
      
      const next = [...TIERS].sort((a, b) => a.points - b.points).find(t => t.points > pts);
      
      let prog = 0;
      if (next) {
          const range = next.points - current.points;
          const gained = pts - current.points;
          prog = Math.min(100, Math.max(0, (gained / range) * 100));
      } else {
          prog = 100; // Max tier
      }

      return { currentTier: current, nextTier: next, progress: prog };
  }, [customer?.points]);

  // State
  const [activeTab, setActiveTab] = useState<'prescriptions' | 'payments' | 'points'>('prescriptions');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Modals
  const [isEditCustomerModalOpen, setIsEditCustomerModalOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isPointAdjustModalOpen, setIsPointAdjustModalOpen] = useState(false); // New Modal State
  const [isSyncing, setIsSyncing] = useState(false);
  const [deleteConfig, setDeleteConfig] = useState<{ type: 'prescription' | 'payment', id: string } | null>(null);

  // AI State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ index: string, type: string, coating: string, reason: string } | null>(null);

  // Form Data
  const [editCustomerForm, setEditCustomerForm] = useState<Partial<Customer>>({});
  const [editingPrescriptionId, setEditingPrescriptionId] = useState<string | null>(null);
  const [pointAdjustForm, setPointAdjustForm] = useState({ type: 'add', amount: 0, note: '' }); // New Point Form State
  
  // Custom Input States for "Other" options
  const [customInputMap, setCustomInputMap] = useState({
      frameStyle: false,
      lensType: false,
      lensFeature: false,
      lensIndex: false,
      usageType: false
  });

  const [prescriptionForm, setPrescriptionForm] = useState<Partial<Prescription>>({
    date: new Date().toISOString().split('T')[0],
    vision: {
      right: { sph: 0, cyl: 0, axis: 0, add: 0, pd: 0, sh: 0 },
      left: { sph: 0, cyl: 0, axis: 0, add: 0, pd: 0, sh: 0 }
    },
    frame: { size: '', width: undefined, height: undefined, diagonal: undefined, bridge: undefined, style: '', brand: '' },
    lens: { type: '', features: '', index: '' },
    payment: { framePrice: 0, lensPrice: 0, discount: 0, pointsUsed: 0, deposit: 0, remaining: 0 },
    lifestyle: '',
    pickupDate: '',
    usageType: ''
  });

  const [pointsToUse, setPointsToUse] = useState(0);
  const [selectedPromotion, setSelectedPromotion] = useState<{ promo: Promotion, discountAmount: number } | null>(null);
  const [availablePromos, setAvailablePromos] = useState<{ promo: Promotion, discountAmount: number }[]>([]);

  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState<Partial<PaymentHistory>>({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0,5),
    amount: 0,
    method: 'เงินสด',
    note: ''
  });
  const [selectedPrescriptionForPayment, setSelectedPrescriptionForPayment] = useState<string>('');

  const openAddPrescription = () => {
      setEditingPrescriptionId(null);
      setPointsToUse(0);
      setSelectedPromotion(null);
      setCustomInputMap({ frameStyle: false, lensType: false, lensFeature: false, lensIndex: false, usageType: false });
      setPrescriptionForm({
        date: new Date().toISOString().split('T')[0],
        vision: {
          right: { sph: 0, cyl: 0, axis: 0, add: 0, pd: 0, sh: 0 },
          left: { sph: 0, cyl: 0, axis: 0, add: 0, pd: 0, sh: 0 }
        },
        frame: { size: '', width: undefined, height: undefined, diagonal: undefined, bridge: undefined, style: '', brand: '' },
        lens: { type: '', features: '', index: '' },
        payment: { framePrice: 0, lensPrice: 0, discount: 0, pointsUsed: 0, deposit: 0, remaining: 0 },
        lifestyle: '',
        pickupDate: '',
        usageType: ''
      });
      setIsPrescriptionModalOpen(true);
  };

  useEffect(() => {
    if (autoOpenAdd) {
        openAddPrescription();
    }
  }, [autoOpenAdd]);

  // Effects - Auto select latest item when tab changes or data loads
  useEffect(() => {
    if (activeTab === 'prescriptions') {
        const exists = customerPrescriptions.find(p => p.id === selectedId);
        if (!exists) {
            if (customerPrescriptions.length > 0) {
                // Select the last one (assuming it's the latest)
                setSelectedId(customerPrescriptions[customerPrescriptions.length - 1].id);
            } else {
                setSelectedId(null);
            }
        }
    } else if (activeTab === 'payments') {
        const exists = customerPayments.find(p => p.id === selectedId);
        if (!exists) {
            if (customerPayments.length > 0) {
                setSelectedId(customerPayments[customerPayments.length - 1].id);
            } else {
                setSelectedId(null);
            }
        }
    } else {
        // For other tabs like points, we don't need selection
        setSelectedId(null);
    }
  }, [activeTab, customerPrescriptions, customerPayments]);

  // Recalculate available promotions when prices change in the form
  useEffect(() => {
      if (isPrescriptionModalOpen && !editingPrescriptionId) {
          const frameP = Number(prescriptionForm.payment?.framePrice) || 0;
          const lensP = Number(prescriptionForm.payment?.lensPrice) || 0;
          const brand = prescriptionForm.frame?.brand || ''; 
          
          const promos = calculateAvailablePromotions(customerId, frameP, lensP, brand);
          setAvailablePromos(promos);
          
          // Sync Selected Promotion with new calculation
          if (selectedPromotion) {
              const updatedPromo = promos.find(p => p.promo.id === selectedPromotion.promo.id);
              if (updatedPromo) {
                  // Update if discount amount changed (e.g. percentage based or threshold met)
                  if (updatedPromo.discountAmount !== selectedPromotion.discountAmount) {
                      setSelectedPromotion(updatedPromo);
                  }
              } else {
                  // Selected promo is no longer valid (e.g. price dropped below min spend)
                  setSelectedPromotion(null);
              }
          } else if (promos.length > 0 && !selectedPromotion) {
             // Optional: Auto-select best promo logic can go here
          }
      }
  }, [prescriptionForm.payment?.framePrice, prescriptionForm.payment?.lensPrice, prescriptionForm.frame?.brand, isPrescriptionModalOpen, editingPrescriptionId]);


  if (!customer) return <div className="p-8 text-center">ไม่พบข้อมูลลูกค้า</div>;

  // --- Handlers ---

  const handleSyncPoints = async () => {
      if (isSyncing) return;
      setIsSyncing(true);
      try {
          await recalculatePoints(customerId);
          addToast('ซิงค์ข้อมูลสำเร็จ', 'คำนวณแต้มสะสมใหม่เรียบร้อยแล้ว');
      } catch (error) {
          addToast('เกิดข้อผิดพลาด', 'ไม่สามารถคำนวณแต้มได้', 'error');
      } finally {
          setIsSyncing(false);
      }
  };

  // Auto-sync points if balance is 0 but has history
  useEffect(() => {
      if (settings.enablePoints && customer.points === 0 && !isSyncing) {
          const hasEarnings = customerPayments.length > 0 || customerPrescriptions.some(p => p.payment.deposit > 0);
          if (hasEarnings) {
              handleSyncPoints();
          }
      }
  }, [customerId, customer.points]);

  const handleEditCustomer = () => {
      setEditCustomerForm({ ...customer });
      setIsEditCustomerModalOpen(true);
  };

  const handleCustomerSubmit = (e: React.FormEvent) => {
      e.preventDefault();

      // Check duplicates (excluding current customer)
      const inputName = editCustomerForm.name?.trim() || '';
      const duplicateName = customers.find(c => (c.name || '').trim() === inputName && c.id !== customerId);
      if (duplicateName) {
          addToast('ข้อมูลซ้ำ', `ชื่อ "${inputName}" มีอยู่ในระบบแล้ว`, 'error');
          return;
      }

      const inputPhone = editCustomerForm.phone?.trim() || '';
      if (inputPhone) {
          const duplicatePhone = customers.find(c => (c.phone || '').trim() === inputPhone && c.id !== customerId);
          if (duplicatePhone) {
              addToast('ข้อมูลซ้ำ', `เบอร์โทรศัพท์ "${inputPhone}" มีอยู่ในระบบแล้ว`, 'error');
              return;
          }
      }

      updateCustomer(customerId, editCustomerForm);
      addToast('อัปเดตแล้ว', 'แก้ไขข้อมูลส่วนตัวลูกค้าสำเร็จ');
      setIsEditCustomerModalOpen(false);
  };

  const handlePointAdjustSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const amount = Number(pointAdjustForm.amount);
      
      // Validate for add/subtract only
      if (pointAdjustForm.type !== 'set' && amount <= 0) {
          addToast('ข้อมูลไม่ถูกต้อง', 'กรุณาระบุจำนวนแต้มให้ถูกต้อง', 'error');
          return;
      }
      
      // Calculate Delta
      let finalPoints = 0;
      let description = pointAdjustForm.note || 'ปรับปรุงแต้มโดยผู้ดูแลระบบ';

      if (pointAdjustForm.type === 'set') {
          const currentPoints = customer.points || 0;
          finalPoints = amount - currentPoints; // Delta
          if (finalPoints === 0) {
              setIsPointAdjustModalOpen(false);
              return; // No change
          }
          description = pointAdjustForm.note || `Admin ตั้งค่าแต้มเป็น ${amount}`;
      } else {
          finalPoints = pointAdjustForm.type === 'add' ? amount : -amount;
      }
      
      try {
          await adjustPoints(customerId, finalPoints, 'adjust', description);
          addToast('บันทึกสำเร็จ', 'ปรับปรุงแต้มสะสมเรียบร้อยแล้ว');
          setIsPointAdjustModalOpen(false);
          setPointAdjustForm({ type: 'add', amount: 0, note: '' });
      } catch (error) {
          addToast('เกิดข้อผิดพลาด', 'ไม่สามารถปรับปรุงแต้มได้', 'error');
      }
  };

  const handlePrescriptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const manualDiscount = Number(prescriptionForm.payment?.discount) || 0;
    const pointsDiscount = pointsToUse * settings.redeemRate;
    const promoDiscount = selectedPromotion ? selectedPromotion.discountAmount : 0;
    
    const totalDiscount = manualDiscount + pointsDiscount + promoDiscount;
    
    const total = (Number(prescriptionForm.payment?.framePrice) + Number(prescriptionForm.payment?.lensPrice)) - totalDiscount;
    const deposit = Number(prescriptionForm.payment?.deposit);
    
    // Construct frame size string for display consistency if needed
    const frameSizeString = [
        prescriptionForm.frame?.width,
        prescriptionForm.frame?.bridge,
        // We could add temple here if collected
    ].filter(Boolean).join('-');

    // Construct payload
    const payload = {
        ...prescriptionForm,
        frame: {
            ...prescriptionForm.frame!,
            size: frameSizeString || prescriptionForm.frame?.size || ''
        },
        payment: {
            ...prescriptionForm.payment!,
            discount: totalDiscount,
            pointsUsed: pointsToUse, 
            promotionId: selectedPromotion?.promo.id,
            remaining: Math.max(0, total - deposit)
        }
    };

    if (editingPrescriptionId) {
        updatePrescription(editingPrescriptionId, payload);
        addToast('อัปเดตแล้ว', 'แก้ไขข้อมูลใบวัดสายตาเรียบร้อย');
    } else {
        addPrescription({
            ...payload,
            customerId,
            recordedBy: 'admin'
        } as any);
        
        // Auto-create Job Link
        addJob({
            customerId,
            orderDate: new Date().toISOString().split('T')[0],
            pickupDate: payload.pickupDate || new Date().toISOString().split('T')[0],
            status: 'รอเลนส์',
            items: [
                `กรอบ: ${payload.frame?.brand || ''} ${payload.frame?.style || ''}`.trim(),
                `เลนส์: ${payload.lens?.type || ''} ${payload.lens?.features || ''}`.trim()
            ].filter(Boolean)
        });
        
        // Deduct points if used
        if (pointsToUse > 0) {
            adjustPoints(customerId, -pointsToUse, 'redeem', 'ใช้เป็นส่วนลดตัดแว่น');
        }

        addToast('บันทึกเรียบร้อย', 'เพิ่มใบวัดสายตาและสร้างงานติดตามแล้ว');
    }
    
    setIsPrescriptionModalOpen(false);
    setActiveTab('prescriptions');
  };

  const openEditPrescription = (p: Prescription) => {
      setEditingPrescriptionId(p.id);
      setPrescriptionForm(p);
      setPointsToUse(0); 
      setSelectedPromotion(null); 
      
      // Determine if custom inputs are needed
      setCustomInputMap({
          frameStyle: !FRAME_STYLES.includes(p.frame.style) && !!p.frame.style,
          lensType: !LENS_TYPES.includes(p.lens.type) && !!p.lens.type,
          lensFeature: !LENS_FEATURES.includes(p.lens.features) && !!p.lens.features,
          lensIndex: !LENS_INDEXES.includes(p.lens.index) && !!p.lens.index,
          usageType: !USAGE_TYPES.includes(p.usageType || '') && !!p.usageType,
      });

      setIsPrescriptionModalOpen(true);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPaymentId) {
        updatePayment(editingPaymentId, {
            ...paymentForm,
            amount: Number(paymentForm.amount)
        });
        addToast('อัปเดตแล้ว', 'แก้ไขข้อมูลการชำระเงินเรียบร้อย');
    } else {
        if (!selectedPrescriptionForPayment) return;
        addPayment({
            customerId,
            prescriptionId: selectedPrescriptionForPayment,
            date: paymentForm.date!,
            time: paymentForm.time!,
            amount: Number(paymentForm.amount),
            method: paymentForm.method!,
            type: 'partial',
            note: paymentForm.note,
            recordedBy: 'admin'
        });
        addToast('บันทึกเรียบร้อย', 'เพิ่มรายการชำระเงินแล้ว');
    }
    setIsPaymentModalOpen(false);
    setActiveTab('payments');
  };

  const openAddPayment = () => {
      const p = [...customerPrescriptions].reverse().find(cp => cp.payment.remaining > 0);
      if(p) setSelectedPrescriptionForPayment(p.id);
      else if (customerPrescriptions.length > 0) setSelectedPrescriptionForPayment(customerPrescriptions[customerPrescriptions.length - 1].id);
      
      setEditingPaymentId(null);
      setPaymentForm({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0,5),
        amount: p ? p.payment.remaining : 0,
        method: 'เงินสด',
        note: ''
      });
      setIsPaymentModalOpen(true);
  };

  const openEditPayment = (pay: PaymentHistory) => {
      setEditingPaymentId(pay.id);
      setPaymentForm(pay);
      setIsPaymentModalOpen(true);
  };

  const confirmDelete = () => {
    if (deleteConfig) {
        if (deleteConfig.type === 'prescription') {
            deletePrescription(deleteConfig.id);
            if (selectedId === deleteConfig.id) setSelectedId(null);
            addToast('ลบข้อมูลแล้ว', 'ลบใบวัดสายตาออกจากระบบแล้ว');
        } else {
            deletePayment(deleteConfig.id);
            if (selectedId === deleteConfig.id) setSelectedId(null);
            addToast('ลบข้อมูลแล้ว', 'ลบรายการชำระเงินออกจากระบบแล้ว');
        }
        setDeleteConfig(null);
    }
  };

  const handlePrintReceipt = (p: Prescription) => {
    const customer = customers.find(c => c.id === p.customerId);
    if (!customer) return;

    const totalAmount = p.payment.framePrice + p.payment.lensPrice;
    const netAmount = totalAmount - p.payment.discount;
    const deposit = p.payment.deposit;
    const remaining = Math.max(0, netAmount - deposit);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>ใบเสร็จรับเงิน และ ใบสั่งตัดแว่น - ${customer.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
            body { font-family: 'Sarabun', sans-serif; padding: 40px; line-height: 1.5; color: #222; font-size: 14px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .shop-name { font-size: 26px; font-weight: bold; color: #000; margin-bottom: 5px; }
            .shop-info { font-size: 14px; color: #444; }
            .doc-title { font-size: 20px; font-weight: bold; margin-top: 15px; text-transform: uppercase; letter-spacing: 1px; }
            
            .section { margin-bottom: 20px; }
            .section-title { font-size: 16px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; color: #000; }
            
            .meta { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .customer-info, .doc-info { width: 48%; }
            .info-row { display: flex; margin-bottom: 4px; }
            .info-label { width: 90px; font-weight: 600; color: #333; }
            .info-val { flex: 1; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            th { background-color: #f4f4f4; font-weight: bold; color: #000; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            
            .vision-table th { background-color: #eef2f5; }
            .vision-table td { font-weight: 600; }
            
            .item-table th { background-color: #f8f9fa; }
            .item-table td { vertical-align: top; }
            
            .total-section { width: 100%; display: flex; justify-content: flex-end; margin-top: 20px; }
            .total-table { width: 50%; border-collapse: collapse; }
            .total-table td { padding: 6px 8px; border: none; border-bottom: 1px solid #eee; }
            .total-row { font-weight: bold; font-size: 15px; border-top: 2px solid #333 !important; border-bottom: 2px solid #333 !important; background-color: #f8f9fa; }
            
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
            .signature-area { display: flex; justify-content: space-between; margin-top: 50px; padding: 0 30px; }
            .signature-line { border-top: 1px solid #000; width: 200px; margin-top: 40px; }
            .signature-block { text-align: center; }
            
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
              @page { margin: 1.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="shop-name">${settings.shopName}</div>
            <div class="shop-info">${settings.shopAddress}</div>
            <div class="shop-info">โทร: ${settings.shopPhone} ${settings.taxId ? `| เลขประจำตัวผู้เสียภาษี: ${settings.taxId}` : ''}</div>
            <div class="doc-title">ใบเสร็จรับเงิน / ใบสั่งตัดแว่น<br><span style="font-size: 14px; font-weight: normal;">RECEIPT / PRESCRIPTION</span></div>
          </div>
          
          <div class="meta">
            <div class="customer-info">
              <div class="info-row"><span class="info-label">ชื่อลูกค้า:</span> <span class="info-val">${customer.name}</span></div>
              <div class="info-row"><span class="info-label">อายุ/เพศ:</span> <span class="info-val">${customer.age || '-'} ปี / ${customer.gender === 'M' ? 'ชาย' : customer.gender === 'F' ? 'หญิง' : 'อื่นๆ'}</span></div>
              <div class="info-row"><span class="info-label">ที่อยู่:</span> <span class="info-val">${customer.address || '-'}</span></div>
              <div class="info-row"><span class="info-label">เบอร์โทร:</span> <span class="info-val">${customer.phone || '-'}</span></div>
            </div>
            <div class="doc-info text-right">
              <div class="info-row" style="justify-content: flex-end"><span class="info-label">วันที่:</span> <span>${new Date(p.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
              <div class="info-row" style="justify-content: flex-end"><span class="info-label">เลขที่เอกสาร:</span> <span>${String(p.id).substring(0, 8).toUpperCase()}</span></div>
              <div class="info-row" style="justify-content: flex-end"><span class="info-label">ผู้ออกเอกสาร:</span> <span>${p.recordedBy || 'Admin'}</span></div>
              <div class="info-row" style="justify-content: flex-end"><span class="info-label">กำหนดรับ:</span> <span>${p.dueDate ? new Date(p.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">ค่าสายตา (Prescription)</div>
            <table class="vision-table">
              <thead>
                <tr>
                  <th style="width: 10%">ตา (Eye)</th>
                  <th style="width: 15%">SPH (สั้น/ยาว)</th>
                  <th style="width: 15%">CYL (เอียง)</th>
                  <th style="width: 15%">AXIS (องศา)</th>
                  <th style="width: 15%">ADD (อ่านหนังสือ)</th>
                  <th style="width: 15%">PD (ระยะห่างตา)</th>
                  <th style="width: 15%">VA (ความคมชัด)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="background-color: #f9f9f9;"><strong>ขวา (OD)</strong></td>
                  <td>${p.vision.right.sph || '-'}</td>
                  <td>${p.vision.right.cyl || '-'}</td>
                  <td>${p.vision.right.axis || '-'}</td>
                  <td>${p.vision.right.add || '-'}</td>
                  <td>${p.vision.right.pd || '-'}</td>
                  <td>${p.vision.right.va || '-'}</td>
                </tr>
                <tr>
                  <td style="background-color: #f9f9f9;"><strong>ซ้าย (OS)</strong></td>
                  <td>${p.vision.left.sph || '-'}</td>
                  <td>${p.vision.left.cyl || '-'}</td>
                  <td>${p.vision.left.axis || '-'}</td>
                  <td>${p.vision.left.add || '-'}</td>
                  <td>${p.vision.left.pd || '-'}</td>
                  <td>${p.vision.left.va || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">รายการสินค้า (Items)</div>
            <table class="item-table">
              <thead>
                <tr>
                  <th style="width: 5%">#</th>
                  <th style="width: 55%" class="text-left">รายการ (Description)</th>
                  <th style="width: 15%">จำนวน</th>
                  <th style="width: 25%" class="text-right">จำนวนเงิน (Baht)</th>
                </tr>
              </thead>
              <tbody>
                ${p.payment.framePrice > 0 ? `
                <tr>
                  <td>1</td>
                  <td class="text-left">
                    <strong>กรอบแว่น (Frame)</strong><br>
                    <span style="font-size: 12px; color: #555;">
                      แบรนด์: ${p.frame.brand || '-'} | ทรง: ${p.frame.style || '-'} | สี: ${p.frame.color || '-'} | ขนาด: ${p.frame.width || '-'}
                    </span>
                  </td>
                  <td>1</td>
                  <td class="text-right">${p.payment.framePrice.toLocaleString()}</td>
                </tr>` : ''}
                ${p.payment.lensPrice > 0 ? `
                <tr>
                  <td>${p.payment.framePrice > 0 ? '2' : '1'}</td>
                  <td class="text-left">
                    <strong>เลนส์ (Lens)</strong><br>
                    <span style="font-size: 12px; color: #555;">
                      ชนิด: ${p.lens.type || '-'} | คุณสมบัติ: ${p.lens.features || '-'} | Index: ${p.lens.index || '-'}
                    </span>
                  </td>
                  <td>1</td>
                  <td class="text-right">${p.payment.lensPrice.toLocaleString()}</td>
                </tr>` : ''}
              </tbody>
            </table>
          </div>

          <div class="total-section">
            <table class="total-table">
              <tr>
                <td class="text-left">รวมเป็นเงิน (Subtotal)</td>
                <td class="text-right">${totalAmount.toLocaleString()}</td>
              </tr>
              ${p.payment.discount > 0 ? `
              <tr>
                <td class="text-left" style="color: #d9534f;">หักส่วนลด (Discount)</td>
                <td class="text-right" style="color: #d9534f;">-${p.payment.discount.toLocaleString()}</td>
              </tr>` : ''}
              <tr class="total-row">
                <td class="text-left">ยอดสุทธิ (Net Amount)</td>
                <td class="text-right">${netAmount.toLocaleString()}</td>
              </tr>
              <tr>
                <td class="text-left">ชำระแล้ว (Paid) ${p.payment.method ? `(${p.payment.method})` : ''}</td>
                <td class="text-right">${deposit.toLocaleString()}</td>
              </tr>
              <tr>
                <td class="text-left"><strong>ยอดคงเหลือ (Balance)</strong></td>
                <td class="text-right"><strong>${remaining.toLocaleString()}</strong></td>
              </tr>
            </table>
          </div>

          <div class="signature-area">
             <div class="signature-block">
                <div class="signature-line"></div>
                <div>ผู้รับเงิน / Cashier</div>
             </div>
             <div class="signature-block">
                <div class="signature-line"></div>
                <div>ลูกค้า / Customer</div>
             </div>
          </div>

          <div class="footer">
            <p>${settings.receiptFooter || 'ขอบคุณที่ใช้บริการ / Thank you'}</p>
          </div>
          
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Helper to render select with "Other" option
  const renderSelectWithCustom = (
      label: string, 
      value: string, 
      onChange: (val: string) => void, 
      options: string[], 
      isCustom: boolean, 
      setCustom: (v: boolean) => void
  ) => {
      return (
          <div className="space-y-1.5">
              <label className="text-xs text-slate-500 block">{label}</label>
              <div className="flex gap-2">
                  <select 
                      className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                      value={isCustom ? '__other__' : value || ''}
                      onChange={(e) => {
                          if (e.target.value === '__other__') {
                              setCustom(true);
                              onChange('');
                          } else {
                              setCustom(false);
                              onChange(e.target.value);
                          }
                      }}
                  >
                      <option value="" disabled>-- เลือก{label} --</option>
                      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      <option value="__other__">อื่นๆ (ระบุเอง)</option>
                  </select>
              </div>
              {isCustom && (
                  <input 
                      type="text" 
                      placeholder={`ระบุ${label}...`}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors"
                      value={value}
                      autoFocus
                      onChange={(e) => onChange(e.target.value)}
                  />
              )}
          </div>
      );
  };

  // Helper for Tier
  const getTierInfo = (pts: number) => {
      if (pts > 1000) return { name: 'Platinum', min: 1001, color: 'text-purple-700 bg-purple-50 border-purple-200', icon: Crown };
      if (pts > 500) return { name: 'Gold', min: 501, color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: Star };
      if (pts > 100) return { name: 'Silver', min: 101, color: 'text-slate-700 bg-slate-50 border-slate-200', icon: ShieldCheck };
      return { name: 'Bronze', min: 0, color: 'text-orange-700 bg-orange-50 border-orange-200', icon: Award };
  };

  const handleAiAnalyze = async () => {
      if (!customer?.age || !prescriptionForm.vision) {
          addToast('ข้อมูลไม่ครบ', 'ต้องมีข้อมูลอายุและค่าสายตาเพื่อวิเคราะห์', 'error');
          return;
      }

      setIsAiLoading(true);
      setAiResult(null);

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const vision = prescriptionForm.vision;
          const prompt = `
            Analyze vision data for a ${customer.age} year old patient.
            Right Eye (OD): SPH ${vision.right.sph}, CYL ${vision.right.cyl}, AXIS ${vision.right.axis}, ADD ${vision.right.add}
            Left Eye (OS): SPH ${vision.left.sph}, CYL ${vision.left.cyl}, AXIS ${vision.left.axis}, ADD ${vision.left.add}
            
            Recommend suitable lens specifications in JSON format:
            {
                "index": "suggested index (e.g. 1.60)",
                "type": "lens type (e.g. Progressive, Single Vision)",
                "coating": "coating/feature (e.g. Blue Cut, Multicoat)",
                "reason": "brief reason in Thai language"
            }
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt,
              config: {
                  responseMimeType: 'application/json'
              }
          });

          if (response.text) {
              const result = JSON.parse(response.text);
              setAiResult(result);
          }
      } catch (error) {
          console.error("AI Analysis Failed:", error);
          addToast('AI ขัดข้อง', 'ไม่สามารถวิเคราะห์ข้อมูลได้ในขณะนี้', 'error');
      } finally {
          setIsAiLoading(false);
      }
  };

  const applyAiSuggestion = () => {
      if (!aiResult) return;
      
      setPrescriptionForm(prev => ({
          ...prev,
          lens: {
              type: aiResult.type || prev.lens?.type || '',
              features: aiResult.coating || prev.lens?.features || '',
              index: aiResult.index || prev.lens?.index || ''
          }
      }));
      
      setIsAiModalOpen(false);
      addToast('นำไปใช้สำเร็จ', 'ปรับปรุงข้อมูลเลนส์ตามคำแนะนำ AI เรียบร้อย');
  };

  // --- Render Helpers ---

  const calculateTotal = () => {
      const p = prescriptionForm.payment;
      if (!p) return 0;
      const manualDiscount = Number(p.discount) || 0;
      const pointsDiscount = pointsToUse * settings.redeemRate;
      const promoDiscount = selectedPromotion ? selectedPromotion.discountAmount : 0;
      
      const totalDiscount = manualDiscount + pointsDiscount + promoDiscount;
      return (Number(p.framePrice) + Number(p.lensPrice)) - totalDiscount - Number(p.deposit);
  };

  const getPrescriptionSummary = (p: Prescription) => {
      const remaining = p.payment.remaining;
      const isSelected = selectedId === p.id && activeTab === 'prescriptions';
      return (
          <div 
            key={p.id} 
            onClick={() => { setSelectedId(p.id); setActiveTab('prescriptions'); }}
            className={`cursor-pointer p-4 rounded-xl border transition-all relative group ${isSelected ? 'bg-white border-green-500 shadow-md ring-1 ring-green-500' : 'bg-white border-slate-100 hover:border-green-300'}`}
          >
              <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-2 py-1 rounded-md shadow-sm z-10 backdrop-blur-sm">
                  <button 
                    onClick={(e) => { e.stopPropagation(); openEditPrescription(p); }}
                    className="text-yellow-600 hover:text-yellow-700 p-1 hover:bg-yellow-50 rounded"
                    title="แก้ไข"
                  >
                      <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDeleteConfig({ type: 'prescription', id: p.id }); }}
                    className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                    title="ลบ"
                  >
                      <Trash2 className="w-4 h-4" />
                  </button>
              </div>

              <div className="flex justify-between items-start mb-2 pr-16">
                  <span className="font-bold text-slate-800">{new Date(p.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric'})}</span>
                  {remaining > 0 ? (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-lg font-medium border border-orange-200">
                          ค้าง ฿{remaining.toLocaleString()}
                      </span>
                  ) : (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg font-medium border border-green-200 flex items-center gap-1">
                          <Check className="w-3 h-3"/> ชำระครบ
                      </span>
                  )}
              </div>
              <div className="text-xs text-slate-600 font-mono mb-2">
                  OD: {p.vision.right.sph} / {p.vision.right.cyl} / {p.vision.right.axis} <br/>
                  OS: {p.vision.left.sph} / {p.vision.left.cyl} / {p.vision.left.axis}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                  <FileText className="w-3 h-3" /> {p.frame.style} {p.frame.width ? `(${p.frame.width})` : ''} - {p.lens.type}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <User className="w-3 h-3" /> บันทึกโดย: {p.recordedBy || 'admin'}
              </div>
          </div>
      );
  };

  const getPaymentSummary = (p: PaymentHistory) => {
      const isSelected = selectedId === p.id && activeTab === 'payments';
      return (
          <div 
            key={p.id} 
            onClick={() => { setSelectedId(p.id); setActiveTab('payments'); }}
            className={`cursor-pointer p-4 rounded-xl border transition-all relative group ${isSelected ? 'bg-white border-green-500 shadow-md ring-1 ring-green-500' : 'bg-white border-slate-100 hover:border-green-300'}`}
          >
              <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-2 py-1 rounded-md shadow-sm z-10 backdrop-blur-sm">
                  <button 
                    onClick={(e) => { e.stopPropagation(); openEditPayment(p); }}
                    className="text-yellow-600 hover:text-yellow-700 p-1 hover:bg-yellow-50 rounded"
                    title="แก้ไข"
                  >
                      <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDeleteConfig({ type: 'payment', id: p.id }); }}
                    className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                    title="ลบ"
                  >
                      <Trash2 className="w-4 h-4" />
                  </button>
              </div>

              <div className="flex justify-between items-start mb-2 pr-16">
                  <span className="font-bold text-slate-800">{new Date(p.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric'})}</span>
                  <span className={`text-xs px-2 py-1 rounded-lg font-medium border ${p.type === 'deposit' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                      {p.type === 'deposit' ? 'มัดจำ' : 'ชำระ'}
                  </span>
              </div>
              <div className="text-xl font-bold text-slate-800 mb-1">
                  ฿{p.amount.toLocaleString()}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                  <CreditCard className="w-3 h-3" /> {p.method} {p.time ? `• ${p.time} น.` : ''}
              </div>
               <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <User className="w-3 h-3" /> รับโดย: {p.recordedBy || 'admin'} 
                  {p.time && <span className="opacity-75">• {p.time} น.</span>}
              </div>
          </div>
      );
  };

  const getPointHistory = (t: PointTransaction) => {
      return (
          <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center">
             <div>
                 <div className="text-sm font-bold text-slate-800">{t.note || (t.type === 'earn' ? 'ได้รับแต้ม' : 'แลกแต้ม')}</div>
                 <div className="text-xs text-slate-500 mt-0.5">
                     {new Date(t.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric'})} • {new Date(t.date).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                 </div>
             </div>
             <div className={`font-bold ${t.type === 'redeem' ? 'text-red-600' : 'text-green-600'}`}>
                 {t.type === 'redeem' ? '-' : '+'}{t.points}
             </div>
          </div>
      );
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-6 p-2 overflow-hidden">
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteConfig}
        onClose={() => setDeleteConfig(null)}
        onConfirm={confirmDelete}
        title={deleteConfig?.type === 'prescription' ? 'ลบใบวัดสายตา' : 'ลบรายการชำระเงิน'}
        message={deleteConfig?.type === 'prescription' 
            ? "คุณต้องการลบใบวัดสายตานี้ใช่หรือไม่?\n\nหากมีการใช้แต้มแลกส่วนลด ระบบจะคืนแต้มให้ลูกค้าอัตโนมัติ"
            : "คุณต้องการลบรายการชำระเงินนี้ใช่หรือไม่?\n\nหากมีการได้รับแต้มจากการชำระเงินนี้ ระบบจะหักแต้มคืนอัตโนมัติ"}
        confirmText="ลบข้อมูล"
      />

      {/* LEFT COLUMN: Profile & List */}
      <div className="w-full md:w-5/12 lg:w-4/12 flex flex-col gap-4 h-full overflow-hidden">
        
        {/* Profile Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-shrink-0 relative">
            <button onClick={onBack} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 md:hidden">
                <ChevronLeft />
            </button>
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={onBack}
                        className="hidden md:flex p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors -ml-2"
                        title="ย้อนกลับไปหน้ารายชื่อ"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{customer.name}</h2>
                        <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                            <User className="w-3 h-3"/> บันทึกโดย: {customer.recordedBy || 'admin'}
                            <span className="mx-1 text-slate-300">|</span>
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3"/> {new Date(customer.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                            </span>
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <button onClick={handleEditCustomer} className="text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1">
                        <Edit className="w-3 h-3" /> แก้ไข
                    </button>
                </div>
            </div>
            
            {settings.enablePoints && (
                <div className="mb-5 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <currentTier.icon className="w-16 h-16 text-slate-900" />
                    </div>
                    
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${currentTier.color} bg-white shadow-sm mb-2`}>
                                <currentTier.icon className="w-3 h-3" /> {currentTier.name} Member
                            </div>
                            <div className="text-2xl font-bold text-slate-800 flex items-baseline gap-1">
                                {customer.points?.toLocaleString() || 0} 
                                <span className="text-xs font-medium text-slate-500">แต้ม</span>
                            </div>
                        </div>
                        <div className="flex gap-1">
                             <button 
                                onClick={handleSyncPoints}
                                disabled={isSyncing}
                                className={`p-1.5 rounded-lg bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-primary-600 transition-colors ${isSyncing ? 'animate-spin' : ''}`}
                                title="คำนวณแต้มใหม่"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => setIsPointAdjustModalOpen(true)}
                                className="p-1.5 rounded-lg bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-primary-600 transition-colors"
                                title="ปรับปรุงแต้ม"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {nextTier && (
                        <div className="mt-3 relative z-10">
                            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-primary-500 to-indigo-500 transition-all duration-500" 
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between mt-1.5 text-[10px] font-medium text-slate-500">
                                <span>ขาดอีก {(nextTier.points - (customer.points || 0)).toLocaleString()} แต้ม</span>
                                <span className="flex items-center gap-1">
                                    สู่ระดับ {nextTier.name} <nextTier.icon className="w-3 h-3" />
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                <div className="text-slate-600">เพศ: <span className="text-slate-800 font-medium">{customer.gender}</span></div>
                <div className="text-slate-600">อายุ: <span className="text-slate-800 font-medium">{customer.age} ปี</span></div>
                <div className="col-span-2 text-slate-600 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono text-slate-800">{customer.phone}</span>
                </div>
                <div className="col-span-2 text-slate-600 flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                    <span className="text-slate-800 truncate">{customer.address}</span>
                </div>
            </div>
        </div>

        {/* Timeline Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-100 p-2 gap-2 bg-slate-50/50">
                <button 
                    onClick={() => setActiveTab('prescriptions')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'prescriptions' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-500 hover:bg-white hover:shadow-sm'}`}
                >
                    วัดสายตา
                </button>
                <button 
                    onClick={() => setActiveTab('payments')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'payments' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-500 hover:bg-white hover:shadow-sm'}`}
                >
                    ชำระเงิน
                </button>
                {settings.enablePoints && (
                    <button 
                        onClick={() => setActiveTab('points')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'points' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-500 hover:bg-white hover:shadow-sm'}`}
                    >
                        แต้มสะสม
                    </button>
                )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/30">
                {activeTab === 'prescriptions' ? (
                    customerPrescriptions.length > 0 ? (
                        [...customerPrescriptions].reverse().map(getPrescriptionSummary)
                    ) : (
                        <div className="text-center py-10 text-slate-400">ยังไม่มีประวัติการวัดสายตา</div>
                    )
                ) : activeTab === 'payments' ? (
                    customerPayments.length > 0 ? (
                        [...customerPayments].reverse().map(getPaymentSummary)
                    ) : (
                        <div className="text-center py-10 text-slate-400">ยังไม่มีประวัติการชำระเงิน</div>
                    )
                ) : (
                    customerPoints.length > 0 ? (
                        customerPoints.map(getPointHistory)
                    ) : (
                        <div className="text-center py-10 text-slate-400">ไม่มีประวัติแต้มสะสม</div>
                    )
                )}
            </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Details (Same as existing, just ensuring structure is kept) */}
      <div className="w-full md:w-7/12 lg:w-8/12 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
            <div>
                <h3 className="text-lg font-bold text-slate-800">รายละเอียด</h3>
                <p className="text-slate-500 text-xs mt-0.5">
                    {activeTab === 'prescriptions' ? 'ข้อมูลสายตาและสินค้า' : activeTab === 'payments' ? 'รายละเอียดการชำระเงิน' : 'ประวัติคะแนนสะสม'}
                </p>
            </div>
            <div className="flex gap-2">
                {activeTab === 'prescriptions' && (
                    <button 
                        onClick={openAddPrescription}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4" /> เพิ่มใบวัดสายตา
                    </button>
                )}
                {activeTab === 'payments' && (
                    <button 
                        onClick={openAddPayment}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4" /> เพิ่มการชำระเงิน
                    </button>
                )}
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'prescriptions' && selectedId ? (() => {
                const p = prescriptions.find(item => item.id === selectedId);
                if (!p) return <div className="text-center text-slate-400 mt-20">ไม่พบข้อมูล</div>;
                
                return (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        {/* Vision Data Section - No Changes here, keeping as is */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 text-blue-700 p-2 rounded-lg">
                                        <Eye className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">ข้อมูลสายตา</h4>
                                        <p className="text-xs text-slate-500">บันทึกเมื่อ: {new Date(p.date).toLocaleDateString('th-TH', { dateStyle: 'long' })}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handlePrintReceipt(p)} className="text-white bg-slate-700 hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                                        <Printer className="w-4 h-4" /> พิมพ์ใบเสร็จ
                                    </button>
                                    <button onClick={() => openEditPrescription(p)} className="text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50 p-2 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                                    <button onClick={() => setDeleteConfig({ type: 'prescription', id: p.id })} className="text-red-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full text-center">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                            <th className="py-3 px-2 font-semibold border-b">Eye</th>
                                            <th className="py-3 px-2 font-semibold border-b">SPH</th>
                                            <th className="py-3 px-2 font-semibold border-b">CYL</th>
                                            <th className="py-3 px-2 font-semibold border-b">AXIS</th>
                                            <th className="py-3 px-2 font-semibold border-b">ADD</th>
                                            <th className="py-3 px-2 font-semibold border-b">PD</th>
                                            <th className="py-3 px-2 font-semibold border-b">SH</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                        <tr>
                                            <td className="py-3 px-2 font-bold bg-slate-50/30">ขวา (OD)</td>
                                            <td className="py-3 px-2">{p.vision.right.sph}</td>
                                            <td className="py-3 px-2">{p.vision.right.cyl}</td>
                                            <td className="py-3 px-2">{p.vision.right.axis}</td>
                                            <td className="py-3 px-2">{p.vision.right.add > 0 ? `+${p.vision.right.add}` : '-'}</td>
                                            <td className="py-3 px-2">{p.vision.right.pd}</td>
                                            <td className="py-3 px-2">{p.vision.right.sh || '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-3 px-2 font-bold bg-slate-50/30">ซ้าย (OS)</td>
                                            <td className="py-3 px-2">{p.vision.left.sph}</td>
                                            <td className="py-3 px-2">{p.vision.left.cyl}</td>
                                            <td className="py-3 px-2">{p.vision.left.axis}</td>
                                            <td className="py-3 px-2">{p.vision.left.add > 0 ? `+${p.vision.left.add}` : '-'}</td>
                                            <td className="py-3 px-2">{p.vision.left.pd}</td>
                                            <td className="py-3 px-2">{p.vision.left.sh || '-'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Product Info */}
                            <div>
                                <h4 className="font-bold text-slate-800 mb-4 border-b pb-2">ข้อมูลกรอบและเลนส์</h4>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between items-center"><span className="text-slate-500">ยี่ห้อ:</span> <span className="font-medium text-slate-700">{p.frame.brand || '-'}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-slate-500">การใช้งาน:</span> <span className="font-medium text-slate-700">{p.usageType || '-'}</span></div>
                                    
                                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                                        <div><span className="text-slate-400">ขนาด:</span> {p.frame.width || '-'}</div>
                                        <div><span className="text-slate-400">สูง:</span> {p.frame.height || '-'}</div>
                                        <div><span className="text-slate-400">ทแยง:</span> {p.frame.diagonal || '-'}</div>
                                        <div><span className="text-slate-400">สะพาน:</span> {p.frame.bridge || '-'}</div>
                                    </div>
                                    <div className="flex justify-between items-center"><span className="text-slate-500">ชนิดเลนส์:</span> <span className="font-medium text-slate-700">{p.lens.type}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-slate-500">คุณสมบัติ:</span> <span className="font-medium text-slate-700">{p.lens.features}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-slate-500">INDEX:</span> <span className="font-medium text-slate-700">{p.lens.index}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-slate-500">รูปแบบ:</span> <span className="font-medium text-slate-700">{p.frame.style}</span></div>
                                </div>
                                
                                <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="text-xs text-slate-500 mb-1">วันที่นัดรับ</div>
                                    <div className="font-medium text-slate-800 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-primary-500"/> 
                                        {p.pickupDate ? new Date(p.pickupDate).toLocaleDateString('th-TH') : '-'}
                                    </div>
                                    {p.lifestyle && (
                                        <>
                                            <div className="text-xs text-slate-500 mt-3 mb-1">หมายเหตุ</div>
                                            <div className="text-sm text-slate-700">{p.lifestyle}</div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Payment Info */}
                            <div>
                                <h4 className="font-bold text-slate-800 mb-4 border-b pb-2">การชำระเงิน</h4>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between"><span className="text-slate-500">ราคากรอบ:</span> <span>฿{p.payment.framePrice.toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">ราคาเลนส์:</span> <span>฿{p.payment.lensPrice.toLocaleString()}</span></div>
                                    <div className="flex justify-between text-green-600"><span className="text-slate-500">ส่วนลด:</span> <span>-฿{p.payment.discount.toLocaleString()}</span></div>
                                    {p.payment.pointsUsed && p.payment.pointsUsed > 0 && (
                                         <div className="flex justify-between text-purple-600 text-xs px-2"><span>(ใช้แต้มสะสม {p.payment.pointsUsed} แต้ม)</span></div>
                                    )}
                                    <div className="flex justify-between font-bold text-slate-800 pt-2 border-t"><span className="text-slate-500 font-normal">ยอดรวม:</span> <span>฿{(p.payment.framePrice + p.payment.lensPrice - p.payment.discount).toLocaleString()}</span></div>
                                    <div className="flex justify-between text-blue-600"><span className="text-slate-500">ชำระแล้ว:</span> <span>฿{p.payment.deposit.toLocaleString()}</span></div>
                                    
                                    <div className={`mt-4 p-4 rounded-xl flex justify-between items-center ${p.payment.remaining > 0 ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                        <span className="font-medium">ยอดคงเหลือ</span>
                                        <span className="text-xl font-bold">฿{p.payment.remaining.toLocaleString()}</span>
                                    </div>

                                    {p.payment.remaining > 0 && (
                                        <button 
                                            onClick={() => {
                                                setSelectedPrescriptionForPayment(p.id);
                                                setPaymentForm(prev => ({ ...prev, amount: p.payment.remaining }));
                                                setIsPaymentModalOpen(true);
                                            }}
                                            className="w-full mt-2 bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-lg text-sm font-medium shadow-sm transition-all flex justify-center items-center gap-2"
                                        >
                                            <CreditCard className="w-4 h-4" /> ชำระเงินเพิ่ม
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })() : activeTab === 'payments' && selectedId ? (() => {
                const pay = paymentHistory.find(item => item.id === selectedId);
                const relatedPrescription = prescriptions.find(p => p.id === pay?.prescriptionId);
                
                if (!pay) return <div className="text-center text-slate-400 mt-20">ไม่พบข้อมูล</div>;

                const totalAmount = relatedPrescription 
                    ? (relatedPrescription.payment.framePrice + relatedPrescription.payment.lensPrice - relatedPrescription.payment.discount)
                    : 0;
                const totalPaid = relatedPrescription ? relatedPrescription.payment.deposit : 0;
                const paidPercent = totalAmount > 0 ? Math.min(100, (totalPaid / totalAmount) * 100) : 0;
                
                // Calculate earned points for display
                const earnedPoints = (settings.enablePoints && settings.earnRate > 0) ? Math.floor(pay.amount / settings.earnRate) : 0;

                return (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-green-600" /> รายละเอียดการชำระเงิน
                                </h4>
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4 relative">
                                    {earnedPoints > 0 && (
                                        <div className="absolute top-4 right-4 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold border border-purple-200 flex items-center gap-1">
                                            <Gift className="w-3 h-3" /> +{earnedPoints} แต้ม
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 text-sm">วันที่ชำระ</span>
                                        <span className="font-medium text-slate-800">{new Date(pay.date).toLocaleDateString('th-TH', { dateStyle: 'long' })}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 text-sm">เวลา</span>
                                        <span className="font-medium text-slate-800">{pay.time}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 text-sm">จำนวนเงิน</span>
                                        <span className="text-2xl font-bold text-slate-900">฿{pay.amount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 text-sm">ประเภท</span>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${pay.type === 'deposit' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                            {pay.type === 'deposit' ? 'มัดจำ' : 'ชำระ'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 text-sm">วิธีชำระ</span>
                                        <span className="font-medium text-slate-800">{pay.method}</span>
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-4 justify-end border border-blue-200 p-2 rounded-lg">
                                    <button onClick={() => openEditPayment(pay)} className="px-4 py-2 text-sm text-yellow-600 hover:text-yellow-700 font-medium transition-colors">แก้ไข</button>
                                    <button onClick={() => setDeleteConfig({ type: 'payment', id: pay.id })} className="px-4 py-2 text-sm text-red-600 hover:text-red-700 font-medium transition-colors">ลบรายการ</button>
                                </div>
                            </div>

                            {/* Payment Status Card */}
                            <div>
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-blue-600" /> สถานะการชำระเงิน
                                </h4>
                                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 h-full flex flex-col justify-center">
                                    {relatedPrescription ? (
                                        <>
                                            <div className="space-y-2 mb-6">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-blue-600/80">วันที่ตรวจ</span>
                                                    <span className="font-medium text-blue-900">{new Date(relatedPrescription.date).toLocaleDateString('th-TH')}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-blue-600/80">ยอดรวม</span>
                                                    <span className="font-medium text-blue-900">฿{totalAmount.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-blue-600/80">ชำระแล้ว</span>
                                                    <span className="font-bold text-blue-900">฿{totalPaid.toLocaleString()} ({paidPercent.toFixed(1)}%)</span>
                                                </div>
                                            </div>
                                            
                                            <div className="relative pt-1">
                                                <div className="overflow-hidden h-3 mb-2 text-xs flex rounded-full bg-blue-200">
                                                    <div style={{ width: `${paidPercent}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-500"></div>
                                                </div>
                                                <div className="flex justify-between text-xs font-medium">
                                                    <span className="text-blue-600">เริ่มชำระ</span>
                                                    <span className={paidPercent >= 100 ? 'text-green-600' : 'text-blue-600'}>
                                                        {paidPercent >= 100 ? 'ชำระครบ ✓' : 'ยังไม่ครบ'}
                                                    </span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-center text-blue-400">ไม่พบข้อมูลใบวัดสายตาที่เกี่ยวข้อง</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })() : activeTab === 'points' ? (
                <div className="space-y-6">
                     <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 flex items-center justify-between">
                         <div>
                             <h4 className="font-bold text-purple-900">คะแนนสะสมคงเหลือ</h4>
                             <p className="text-purple-600 text-sm">ใช้เป็นส่วนลดในการซื้อครั้งถัดไป</p>
                         </div>
                         <div className="flex items-center gap-4">
                             <div className="text-4xl font-bold text-purple-700">{customer.points || 0}</div>
                             <button 
                                onClick={handleSyncPoints}
                                disabled={isSyncing}
                                className={`p-2 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-700 transition-colors ${isSyncing ? 'animate-spin' : ''}`}
                                title="คำนวณแต้มใหม่"
                             >
                                <RotateCcw className="w-5 h-5" />
                             </button>
                         </div>
                     </div>
                     <div className="space-y-2">
                         <h5 className="font-bold text-slate-700 text-sm">ประวัติคะแนน</h5>
                         {customerPoints.length > 0 ? (
                            customerPoints.map(getPointHistory)
                         ) : (
                            <div className="text-center py-8 text-slate-400">ไม่มีรายการ</div>
                         )}
                     </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                    <p>เลือกรายการจากด้านซ้ายเพื่อดูรายละเอียด</p>
                </div>
            )}
        </div>
      </div>

      {/* --- MODALS --- */}
      {/* Include existing modals (Edit Customer, Point Adjust, etc.) - truncated for brevity as they are unchanged except for layout context */}
      
      {isEditCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">แก้ไขข้อมูลลูกค้า</h3>
            </div>
            <form onSubmit={handleCustomerSubmit} className="p-6 space-y-4">
              {/* Form fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
                <input required type="text" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500 outline-none" 
                  value={editCustomerForm.name || ''} onChange={e => setEditCustomerForm({...editCustomerForm, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เพศ</label>
                  <select className="w-full border rounded-lg p-2 outline-none" 
                    value={editCustomerForm.gender || 'ชาย'} onChange={e => setEditCustomerForm({...editCustomerForm, gender: e.target.value})}>
                    <option value="ชาย">ชาย</option>
                    <option value="หญิง">หญิง</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">อายุ</label>
                  <input required type="number" className="w-full border rounded-lg p-2 outline-none" 
                    value={editCustomerForm.age || ''} onChange={e => setEditCustomerForm({...editCustomerForm, age: parseInt(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                <input required type="tel" className="w-full border rounded-lg p-2 outline-none" 
                  value={editCustomerForm.phone || ''} onChange={e => setEditCustomerForm({...editCustomerForm, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่</label>
                <textarea className="w-full border rounded-lg p-2 outline-none" rows={3}
                  value={editCustomerForm.address || ''} onChange={e => setEditCustomerForm({...editCustomerForm, address: e.target.value})} />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsEditCustomerModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">ยกเลิก</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Point Adjustment Modal */}
      {isPointAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-800">ปรับปรุงแต้มสะสม</h3>
             </div>
             <form onSubmit={handlePointAdjustSubmit} className="p-6 space-y-4">
                 <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทรายการ</label>
                     <div className="grid grid-cols-3 gap-2">
                         <button 
                            type="button" 
                            onClick={() => setPointAdjustForm({...pointAdjustForm, type: 'add'})}
                            className={`py-2 rounded-lg border font-medium text-xs flex flex-col items-center justify-center gap-1 ${pointAdjustForm.type === 'add' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-500'}`}
                         >
                             <PlusCircle className="w-4 h-4"/> เพิ่ม (+)
                         </button>
                         <button 
                            type="button" 
                            onClick={() => setPointAdjustForm({...pointAdjustForm, type: 'subtract'})}
                            className={`py-2 rounded-lg border font-medium text-xs flex flex-col items-center justify-center gap-1 ${pointAdjustForm.type === 'subtract' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 text-gray-500'}`}
                         >
                             <MinusCircle className="w-4 h-4"/> ลด (-)
                         </button>
                         <button 
                            type="button" 
                            onClick={() => setPointAdjustForm({...pointAdjustForm, type: 'set'})}
                            className={`py-2 rounded-lg border font-medium text-xs flex flex-col items-center justify-center gap-1 ${pointAdjustForm.type === 'set' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}
                         >
                             <Edit className="w-4 h-4"/> ตั้งค่า (Set)
                         </button>
                     </div>
                 </div>
                 
                 {pointAdjustForm.type === 'set' && (
                     <div className="grid grid-cols-4 gap-2 mb-2">
                         {TIERS.map(tier => (
                             <button
                                type="button"
                                key={tier.name}
                                onClick={() => setPointAdjustForm({ ...pointAdjustForm, amount: tier.points })}
                                className={`text-[10px] py-1.5 rounded border font-medium ${tier.color} hover:opacity-80 transition-opacity`}
                             >
                                 {tier.name}
                             </button>
                         ))}
                     </div>
                 )}

                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {pointAdjustForm.type === 'set' ? 'แต้มสุทธิที่ต้องการ' : 'จำนวนแต้ม'}
                    </label>
                    <input required type="number" min="0" className="w-full border rounded-lg p-2 outline-none" 
                       value={pointAdjustForm.amount || ''} onChange={e => setPointAdjustForm({...pointAdjustForm, amount: parseInt(e.target.value)})} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                    <input type="text" className="w-full border rounded-lg p-2 outline-none" placeholder="เช่น แก้ไขข้อผิดพลาด, ให้รางวัลพิเศษ"
                       value={pointAdjustForm.note} onChange={e => setPointAdjustForm({...pointAdjustForm, note: e.target.value})} />
                 </div>
                 <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setIsPointAdjustModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">ยกเลิก</button>
                    <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">บันทึก</button>
                 </div>
             </form>
          </div>
        </div>
      )}

      {/* Add/Edit Prescription Modal */}
      {isPrescriptionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-bold text-slate-800">{editingPrescriptionId ? 'แก้ไขใบวัดสายตา' : 'เพิ่มใบวัดสายตาใหม่'}</h3>
                <button type="button" onClick={() => setIsAiModalOpen(true)} className="text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-colors">
                    <Sparkles className="w-4 h-4"/> AI แนะนำ
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <form id="prescription-form" onSubmit={handlePrescriptionSubmit}>
                    {/* Vision Grid */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-slate-700 flex items-center gap-2"><Eye className="w-4 h-4"/> ข้อมูลสายตา</h4>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div className="grid grid-cols-7 gap-3 text-center items-center mb-2">
                                <div className="text-xs font-bold text-slate-400 uppercase">Eye</div>
                                {['SPH', 'CYL', 'AXIS', 'ADD', 'PD', 'SH'].map(h => (
                                    <div key={h} className="text-xs font-bold text-slate-400 uppercase">{h}</div>
                                ))}
                            </div>
                            {['right', 'left'].map((eye) => (
                                <div key={eye} className="grid grid-cols-7 gap-3 items-center mb-3 last:mb-0">
                                    <div className="font-bold text-slate-700 text-sm uppercase">{eye === 'right' ? 'OD (ขวา)' : 'OS (ซ้าย)'}</div>
                                    {['sph','cyl','axis','add','pd','sh'].map(field => (
                                        <input 
                                            key={`${eye}-${field}`}
                                            type="number" step="0.25" 
                                            className="w-full p-2 border border-slate-200 rounded-lg text-center text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                                            value={(prescriptionForm.vision as any)[eye][field]}
                                            onChange={e => setPrescriptionForm({
                                                ...prescriptionForm,
                                                vision: {
                                                    ...prescriptionForm.vision!,
                                                    [eye]: { ...prescriptionForm.vision![eye as 'right'|'left'], [field]: Number(e.target.value) }
                                                }
                                            })}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 mt-6">
                        <div className="space-y-4">
                            <h4 className="font-bold text-slate-700">ข้อมูลสินค้า</h4>
                            <div className="space-y-3">
                                <input type="text" placeholder="ยี่ห้อ/รุ่น (เช่น RayBan)" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
                                    value={prescriptionForm.frame?.brand || ''} onChange={e => setPrescriptionForm({...prescriptionForm, frame: {...prescriptionForm.frame!, brand: e.target.value}})} />
                                
                                <div className="grid grid-cols-4 gap-2">
                                    <input type="number" placeholder="ขนาดกรอบ" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-center"
                                        title="Lens Width" value={prescriptionForm.frame?.width || ''} onChange={e => setPrescriptionForm({...prescriptionForm, frame: {...prescriptionForm.frame!, width: Number(e.target.value)}})} />
                                    <input type="number" placeholder="สูง" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-center"
                                        title="Lens Height" value={prescriptionForm.frame?.height || ''} onChange={e => setPrescriptionForm({...prescriptionForm, frame: {...prescriptionForm.frame!, height: Number(e.target.value)}})} />
                                    <input type="number" placeholder="ทแยง" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-center"
                                        title="Diagonal (ED)" value={prescriptionForm.frame?.diagonal || ''} onChange={e => setPrescriptionForm({...prescriptionForm, frame: {...prescriptionForm.frame!, diagonal: Number(e.target.value)}})} />
                                    <input type="number" placeholder="สะพาน" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-center"
                                        title="Bridge" value={prescriptionForm.frame?.bridge || ''} onChange={e => setPrescriptionForm({...prescriptionForm, frame: {...prescriptionForm.frame!, bridge: Number(e.target.value)}})} />
                                </div>

                                {renderSelectWithCustom(
                                    "การใช้งาน (Usage)", 
                                    prescriptionForm.usageType || '', 
                                    (val) => setPrescriptionForm({...prescriptionForm, usageType: val}),
                                    USAGE_TYPES,
                                    customInputMap.usageType,
                                    (v) => setCustomInputMap({...customInputMap, usageType: v})
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    {renderSelectWithCustom(
                                        "ชนิดเลนส์", 
                                        prescriptionForm.lens?.type || '', 
                                        (val) => setPrescriptionForm({...prescriptionForm, lens: {...prescriptionForm.lens!, type: val}}),
                                        LENS_TYPES,
                                        customInputMap.lensType,
                                        (v) => setCustomInputMap({...customInputMap, lensType: v})
                                    )}
                                    {renderSelectWithCustom(
                                        "คุณสมบัติเลนส์", 
                                        prescriptionForm.lens?.features || '', 
                                        (val) => setPrescriptionForm({...prescriptionForm, lens: {...prescriptionForm.lens!, features: val}}),
                                        LENS_FEATURES,
                                        customInputMap.lensFeature,
                                        (v) => setCustomInputMap({...customInputMap, lensFeature: v})
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {renderSelectWithCustom(
                                        "INDEX", 
                                        prescriptionForm.lens?.index || '', 
                                        (val) => setPrescriptionForm({...prescriptionForm, lens: {...prescriptionForm.lens!, index: val}}),
                                        LENS_INDEXES,
                                        customInputMap.lensIndex,
                                        (v) => setCustomInputMap({...customInputMap, lensIndex: v})
                                    )}
                                    {renderSelectWithCustom(
                                        "รูปแบบกรอบ", 
                                        prescriptionForm.frame?.style || '', 
                                        (val) => setPrescriptionForm({...prescriptionForm, frame: {...prescriptionForm.frame!, style: val}}),
                                        FRAME_STYLES,
                                        customInputMap.frameStyle,
                                        (v) => setCustomInputMap({...customInputMap, frameStyle: v})
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-bold text-slate-700">การชำระเงิน</h4>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">ราคากรอบ</label>
                                        <input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={prescriptionForm.payment?.framePrice} 
                                            onChange={e => setPrescriptionForm({...prescriptionForm, payment: {...prescriptionForm.payment!, framePrice: Number(e.target.value)}})} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">ราคาเลนส์</label>
                                        <input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={prescriptionForm.payment?.lensPrice} 
                                            onChange={e => setPrescriptionForm({...prescriptionForm, payment: {...prescriptionForm.payment!, lensPrice: Number(e.target.value)}})} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">ส่วนลด (บาท)</label>
                                        <input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-sm text-red-600" value={prescriptionForm.payment?.discount} 
                                            onChange={e => setPrescriptionForm({...prescriptionForm, payment: {...prescriptionForm.payment!, discount: Number(e.target.value)}})} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 mb-1 block">มัดจำ (เริ่มต้น)</label>
                                        <input disabled={!!editingPrescriptionId} type="number" className="w-full p-2 border border-slate-200 rounded-lg text-sm text-blue-600 font-medium bg-gray-50" value={prescriptionForm.payment?.deposit} 
                                            onChange={e => setPrescriptionForm({...prescriptionForm, payment: {...prescriptionForm.payment!, deposit: Number(e.target.value)}})} />
                                    </div>
                                    {settings.enablePoints && !editingPrescriptionId && (
                                        <div className="col-span-2 mt-2 pt-2 border-t border-slate-200">
                                            <label className="text-xs text-purple-600 font-bold mb-1 block flex justify-between">
                                                <span>ใช้แต้มสะสม (มี {customer.points || 0})</span>
                                                <span>-{pointsToUse * settings.redeemRate} บาท</span>
                                            </label>
                                            <input 
                                                type="number" max={customer.points} min="0" 
                                                className="w-full p-2 border border-purple-200 rounded-lg text-sm bg-purple-50 text-purple-700 font-medium" 
                                                placeholder="ระบุจำนวนแต้มที่ต้องการใช้"
                                                value={pointsToUse || ''}
                                                onChange={e => {
                                                    const val = Math.min(Number(e.target.value), customer.points || 0);
                                                    setPointsToUse(val);
                                                }}
                                            />
                                            <p className="text-[10px] text-slate-400 mt-1">อัตราแลกเปลี่ยน: {settings.redeemRate} บาท / 1 แต้ม</p>
                                        </div>
                                    )}
                                    {!editingPrescriptionId && (
                                        <div className="col-span-2 mt-2 pt-2 border-t border-slate-200">
                                            <label className="text-xs text-indigo-600 font-bold mb-1 block flex justify-between">
                                                <span>โปรโมชั่น</span>
                                                <span>{selectedPromotion ? `-${selectedPromotion.discountAmount.toLocaleString()} บาท` : ''}</span>
                                            </label>
                                            <select 
                                                className="w-full p-2 border border-indigo-200 rounded-lg text-sm bg-indigo-50 text-indigo-700 font-medium"
                                                value={selectedPromotion?.promo.id || ''}
                                                onChange={e => {
                                                    const promo = availablePromos.find(p => p.promo.id === e.target.value);
                                                    setSelectedPromotion(promo || null);
                                                }}
                                            >
                                                <option value="">ไม่ใช้โปรโมชั่น</option>
                                                {availablePromos.map(p => (
                                                    <option key={p.promo.id} value={p.promo.id}>
                                                        {p.promo.name} (-{p.discountAmount}฿)
                                                    </option>
                                                ))}
                                            </select>
                                            {availablePromos.length === 0 && <p className="text-[10px] text-slate-400 mt-1">ไม่มีโปรโมชั่นที่ใช้ได้ในขณะนี้</p>}
                                        </div>
                                    )}
                                </div>
                                <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                                    <span className="font-medium text-slate-700">คงเหลือสุทธิ</span>
                                    <span className="text-xl font-bold text-slate-900">฿{calculateTotal().toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-6 grid md:grid-cols-2 gap-8">
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">วันที่นัดรับ</label>
                            <input type="date" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" 
                                value={prescriptionForm.pickupDate} onChange={e => setPrescriptionForm({...prescriptionForm, pickupDate: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">หมายเหตุ</label>
                            <input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" placeholder="ระบุหมายเหตุเพิ่มเติม..."
                                value={prescriptionForm.lifestyle} onChange={e => setPrescriptionForm({...prescriptionForm, lifestyle: e.target.value})} />
                        </div>
                    </div>
                </form>
            </div>

            <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
                <button type="button" onClick={() => setIsPrescriptionModalOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all font-medium">ยกเลิก</button>
                <button form="prescription-form" type="submit" className="px-6 py-2.5 bg-primary-600 text-white hover:bg-primary-700 rounded-lg shadow-lg shadow-primary-200 transition-all font-medium">บันทึกข้อมูล</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Payment Modal and AI Modal omitted but present in implementation */}
      {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b bg-slate-50">
                      <h3 className="text-lg font-bold text-slate-800">{editingPaymentId ? 'แก้ไขการชำระเงิน' : 'บันทึกการชำระเงิน'}</h3>
                  </div>
                  <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">ยอดชำระ (บาท)</label>
                          <input type="number" required min="1" className="w-full p-3 border border-slate-200 rounded-xl text-xl font-bold text-primary-600 focus:ring-2 focus:ring-primary-500 outline-none"
                              value={paymentForm.amount || ''} onChange={e => setPaymentForm({...paymentForm, amount: Number(e.target.value)})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">วันที่</label>
                              <input type="date" required className="w-full p-2.5 border border-slate-200 rounded-lg"
                                  value={paymentForm.date} onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">เวลา</label>
                              <input type="time" required className="w-full p-2.5 border border-slate-200 rounded-lg"
                                  value={paymentForm.time} onChange={e => setPaymentForm({...paymentForm, time: e.target.value})} />
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">ช่องทางชำระ</label>
                          <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-white"
                              value={paymentForm.method} onChange={e => setPaymentForm({...paymentForm, method: e.target.value})}>
                              <option value="เงินสด">เงินสด</option>
                              <option value="โอนเงิน">โอนเงิน</option>
                              <option value="บัตรเครดิต">บัตรเครดิต</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ</label>
                          <textarea rows={2} className="w-full p-2.5 border border-slate-200 rounded-lg"
                              value={paymentForm.note} onChange={e => setPaymentForm({...paymentForm, note: e.target.value})} />
                      </div>
                      
                      <div className="flex gap-3 pt-4">
                          <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium">ยกเลิก</button>
                          <button type="submit" className="flex-1 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-lg font-medium shadow-lg shadow-green-200">ยืนยัน</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* AI Suggestion Modal */}
      {isAiModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-2xl p-0 w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-indigo-50 bg-indigo-50/50 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                              <Sparkles className="w-5 h-5" />
                          </div>
                          <div>
                              <h3 className="font-bold text-slate-800">AI Lens Analyzer</h3>
                              <p className="text-xs text-slate-500">วิเคราะห์ค่าสายตาด้วย AI อัจฉริยะ</p>
                          </div>
                      </div>
                      <button onClick={() => setIsAiModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                          <X className="w-5 h-5"/>
                      </button>
                  </div>
                  
                  <div className="p-6">
                      {!isAiLoading && !aiResult && (
                          <div className="text-center py-8">
                              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                  <Wand2 className="w-10 h-10 text-indigo-400" />
                              </div>
                              <h4 className="text-lg font-medium text-slate-800 mb-2">พร้อมวิเคราะห์ข้อมูล</h4>
                              <p className="text-slate-500 mb-8 max-w-xs mx-auto">ระบบจะประมวลผลค่าสายตาและอายุ เพื่อแนะนำเลนส์ที่เหมาะสมที่สุด</p>
                              <button 
                                  onClick={handleAiAnalyze}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2 mx-auto"
                              >
                                  <Sparkles className="w-5 h-5"/> เริ่มวิเคราะห์
                              </button>
                          </div>
                      )}

                      {isAiLoading && (
                          <div className="text-center py-12">
                              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
                              <p className="text-slate-600 font-medium">AI กำลังประมวลผล...</p>
                              <p className="text-xs text-slate-400 mt-2">กรุณารอสักครู่</p>
                          </div>
                      )}

                      {aiResult && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                  <h5 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                                      <CheckCircle2 className="w-5 h-5 text-indigo-600"/> ผลการวิเคราะห์
                                  </h5>
                                  <div className="space-y-3 text-sm">
                                      <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
                                          <span className="text-indigo-700">Lens Index</span>
                                          <span className="font-bold text-indigo-900 bg-white px-2 py-0.5 rounded">{aiResult.index}</span>
                                      </div>
                                      <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
                                          <span className="text-indigo-700">Lens Type</span>
                                          <span className="font-bold text-indigo-900 bg-white px-2 py-0.5 rounded">{aiResult.type}</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                          <span className="text-indigo-700">Coating</span>
                                          <span className="font-bold text-indigo-900 bg-white px-2 py-0.5 rounded">{aiResult.coating}</span>
                                      </div>
                                  </div>
                              </div>

                              <div className="space-y-2">
                                  <h5 className="text-sm font-bold text-slate-700">เหตุผลประกอบ (AI Reason)</h5>
                                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed italic">
                                      "{aiResult.reason}"
                                  </p>
                              </div>

                              <div className="flex gap-3 pt-2">
                                  <button onClick={() => setIsAiModalOpen(false)} className="flex-1 py-2.5 text-slate-500 hover:bg-slate-100 rounded-lg font-medium transition-colors">ปิด</button>
                                  <button 
                                      onClick={applyAiSuggestion}
                                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md transition-colors flex items-center justify-center gap-2"
                                  >
                                      ใช้คำแนะนำนี้ <ArrowRight className="w-4 h-4"/>
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default CustomerDetail;
