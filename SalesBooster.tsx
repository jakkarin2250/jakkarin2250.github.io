import React, { useState } from 'react';
import { 
    Rocket, Zap, Clock, Users, Copy, Check, TrendingUp, Target, 
    Gift, Sparkles, MessageCircle, ArrowRight, ShieldAlert, BarChart3, Plus, Save, X, Calendar, Wand2, Loader2, DollarSign, Edit, Trash2, Tag
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import { Promotion } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import ConfirmationModal from '../components/ConfirmationModal';

interface Strategy {
    id: string;
    title: string;
    description: string;
    icon: any;
    color: string;
    psychology: string;
    duration: string;
    offer: string;
    adCopy: {
        headline: string;
        body: string;
        cta: string;
    };
    upsell: string;
    kpi: string[];
    suggestedType: string; // Map to system promotion type
    isAiGenerated?: boolean;
}

const STRATEGIES: Strategy[] = [
    {
        id: 'flash-clearance',
        title: '3-Day Flash Sale (ล้างสต็อก)',
        description: 'ระบายกรอบแว่นรุ่นเก่า หรือสินค้าค้างสต็อกด้วยความเร่งด่วน',
        icon: Zap,
        color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        psychology: 'Scarcity (ความขาดแคลน) & Urgency (ความเร่งด่วน): กระตุ้นความกลัวที่จะพลาดโอกาส (FOMO)',
        duration: '3 วันเท่านั้น (แนะนำ ศุกร์-อาทิตย์)',
        offer: 'กรอบแว่นแบรนด์... ลด 70% เหลือ 50 ตัวสุดท้าย / ซื้อ 1 แถม 1',
        adCopy: {
            headline: '🔥 3 วันเท่านั้น! หมดแล้วหมดเลย! แว่นตาแบรนด์ดัง ลดสูงสุด 70%',
            body: 'โอกาสสุดท้ายสำหรับคนอยากได้แว่นใหม่ราคาเบาๆ\n✅ กรอบแว่นสต็อกเดิม คุณภาพเยี่ยม\n✅ เริ่มต้นเพียง 990.- (ปกติ 3,xxx)\n✅ มีแค่ 50 ตัวเท่านั้น หมดแล้วปิดโปรทันที!',
            cta: 'ทักแชทจองสิทธิ์ด่วน ก่อนของหมด!'
        },
        upsell: 'เสนอเลนส์ Blue Cut หรือ Auto ในราคาพิเศษเมื่อซื้อกรอบ Clearance (+500-900 บาท)',
        kpi: ['จำนวนกรอบที่ขายได้', 'ยอดขายรวมใน 3 วัน', 'Conversion Rate จากลูกค้าที่ทักมา'],
        suggestedType: 'spend_save'
    },
    {
        id: 'lens-upgrade',
        title: 'Free Upgrade (เพิ่มยอดต่อบิล)',
        description: 'ดึงดูดด้วยความคุ้มค่า ให้ลูกค้าตัดสินใจตัดเลนส์แพงขึ้นง่ายขึ้น',
        icon: TrendingUp,
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        psychology: 'Perceived Value (มูลค่าที่ได้รับ): ลูกค้ารู้สึกว่าได้กำไรจากการอัปเกรดฟรี',
        duration: '7-14 วัน',
        offer: 'ซื้อเลนส์มัลติโค้ต อัปเกรดเป็นเลนส์บลูฟรี! หรือ ซื้อเลนส์บลู อัปเกรดเป็นออโต้ฟรี!',
        adCopy: {
            headline: '✨ ตัดแว่นทั้งที ต้องดีที่สุด! โปรลับ อัปเกรดเลนส์ฟรี 0 บาท',
            body: 'ทำงานหน้าคอม ออกแดดแสบตา? ไม่ต้องเลือก!\n👓 ตัดเลนส์กรองแสงคอมวันนี้... เราอัปเกรดเป็น "เลนส์เปลี่ยนสี" ให้ฟรี!\n🛡️ ปกป้อง 2 เท่า ในราคาเท่าเดิม\n💰 ประหยัดทันที 1,500 บาท',
            cta: 'รับสิทธิ์อัปเกรดฟรี คลิกเลย'
        },
        upsell: 'เสนอขายกรอบแว่นรุ่นใหม่ล่าสุด หรือ เคลือบโค้ทกันรอยขีดข่วนเพิ่ม',
        kpi: ['% การเลือกเลนส์ราคาสูงขึ้น', 'ยอดขายเฉลี่ยต่อบิล (AOV)', 'ความพึงพอใจลูกค้า'],
        suggestedType: 'bundle_frame_lens'
    },
    {
        id: 'early-bird',
        title: 'Early Bird (จองคิวล่วงหน้า)',
        description: 'สร้างยอดขายล่วงหน้า และบริหารจัดการคิวร้านให้เต็ม',
        icon: Clock,
        color: 'bg-green-50 text-green-700 border-green-200',
        psychology: 'Commitment (การผูกมัด): เมื่อลูกค้าจ่ายมัดจำหรือจองแล้ว มีโอกาสซื้อจริงสูงมาก',
        duration: 'ตลอดเดือน (จำกัดวันละ 5 คิว)',
        offer: 'จองคิวตรวจวัดสายตาล่วงหน้า รับส่วนลด On-top 500 บาท',
        adCopy: {
            headline: '🤫 แจกส่วนลด 500.- เพียงจองคิวล่วงหน้า (รับวันละ 5 ท่าน)',
            body: 'ไม่ต้องรอนาน แถมได้ลดเพิ่ม!\nเพียงนัดหมายตรวจวัดสายตากับนักทัศนมาตรของเราล่วงหน้า\n✅ ตรวจละเอียด 12 ขั้นตอน ฟรี\n✅ ลดค่ากรอบหรือเลนส์เพิ่มทันที 500 บาท\n❌ Walk-in ไม่ได้ราคานี้นะครับ',
            cta: 'จองคิวรับส่วนลด ที่นี่'
        },
        upsell: 'ขายแพ็กเกจตรวจสุขภาพตาเบื้องต้น หรือ น้ำยาเช็ดเลนส์พกพา',
        kpi: ['จำนวนนัดหมายที่เพิ่มขึ้น', 'Show-up rate (ลูกค้ามาตามนัด)', 'ยอดขายจากลูกค้าจอง'],
        suggestedType: 'time_based'
    },
    {
        id: 'birthday-exclusive',
        title: 'Birthday Special (CRM)',
        description: 'ดึงลูกค้าเก่าหรือลูกค้าเกิดเดือนนี้กลับมาซื้อซ้ำ',
        icon: Gift,
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        psychology: 'Personalization & Reciprocity: ลูกค้ารู้สึกพิเศษและอยากตอบแทน',
        duration: 'ตลอดทั้งเดือนเกิด',
        offer: 'ลดตามอายุ (สูงสุด 50%) หรือ รับ Gift Set มูลค่า 500 บาทฟรี',
        adCopy: {
            headline: '🎂 Happy Birthday! ของขวัญพิเศษสำหรับคุณโดยเฉพาะ',
            body: 'เดือนเกิดปีนี้ ให้เราดูแลสายตาคุณนะ\n🎁 รับส่วนลดค่ากรอบแว่น 50% ทันที\n🎁 หรือ รับฟรี! ชุดดูแลแว่นตามูลค่า 500.-\nเพียงโชว์บัตรประชาชนที่ร้าน',
            cta: 'เช็คสิทธิ์วันเกิด'
        },
        upsell: 'ชวนพาเพื่อน/แฟนมาตัดแว่นคู่ รับส่วนลดเพิ่มอีกต่อ',
        kpi: ['จำนวนลูกค้าเก่าที่กลับมา', 'ยอดขายจากโปรเดือนเกิด', 'การบอกต่อ (Referral)'],
        suggestedType: 'tier_discount' // Or custom
    }
];

const SalesBooster = () => {
    const { addToast } = useToast();
    const { addPromotion, updatePromotion, deletePromotion, promotions } = useData();
    const [selectedStrategy, setSelectedStrategy] = useState<Strategy>(STRATEGIES[0]);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Management State
    const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    
    // AI State
    const [isAiInputOpen, setIsAiInputOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiGenerating, setIsAiGenerating] = useState(false);
    const [aiStrategy, setAiStrategy] = useState<Strategy | null>(null);

    // Promo Creation Form
    const [promoForm, setPromoForm] = useState<Partial<Promotion>>({
        name: '',
        description: '',
        conditionText: '',
        startDate: '',
        endDate: '',
        isActive: true,
        type: 'other',
        conditions: {}
    });

    const activePromotions = promotions.filter(p => p.isActive);

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        addToast('คัดลอกแล้ว', 'นำข้อความไปใช้โพสต์ได้เลย');
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleApplyStrategy = () => {
        setEditingPromoId(null);
        const today = new Date();
        const nextMonth = new Date();
        nextMonth.setDate(today.getDate() + 30);

        setPromoForm({
            name: selectedStrategy.title,
            description: selectedStrategy.description,
            conditionText: selectedStrategy.offer,
            startDate: today.toISOString().split('T')[0],
            endDate: nextMonth.toISOString().split('T')[0],
            isActive: true,
            type: selectedStrategy.suggestedType,
            conditions: {
                minSpend: 0 // Default to 0
            }
        });
        setIsModalOpen(true);
    };

    const handleEditPromo = (promo: Promotion) => {
        setEditingPromoId(promo.id);
        setPromoForm({
            ...promo,
            conditions: promo.conditions || {}
        });
        setIsModalOpen(true);
    };

    const handleDeletePromo = () => {
        if(deleteId) {
            deletePromotion(deleteId);
            addToast('ลบข้อมูลแล้ว', 'ลบโปรโมชั่นออกจากระบบเรียบร้อย');
            setDeleteId(null);
            // Close modal if deleting from modal
            if (isModalOpen) setIsModalOpen(false);
        }
    };

    const handleSavePromo = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingPromoId) {
                updatePromotion(editingPromoId, promoForm);
                addToast('แก้ไขสำเร็จ', 'อัปเดตข้อมูลโปรโมชั่นเรียบร้อย');
            } else {
                addPromotion(promoForm as any);
                addToast('สร้างโปรโมชั่นสำเร็จ', 'ระบบได้บันทึกโปรโมชั่นจากกลยุทธ์นี้แล้ว');
            }
            setIsModalOpen(false);
            setEditingPromoId(null);
        } catch (error) {
            addToast('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกโปรโมชั่นได้', 'error');
        }
    };

    const handleGenerateAi = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!(aiPrompt || '').trim()) return;

        setIsAiGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            
            const schema = {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "Catchy promotion title" },
                    description: { type: Type.STRING, description: "Short description" },
                    psychology: { type: Type.STRING, description: "Sales psychology principle used (Thai)" },
                    duration: { type: Type.STRING, description: "Suggested duration" },
                    offer: { type: Type.STRING, description: "The core offer details" },
                    adCopy: {
                        type: Type.OBJECT,
                        properties: {
                            headline: { type: Type.STRING },
                            body: { type: Type.STRING },
                            cta: { type: Type.STRING },
                        }
                    },
                    upsell: { type: Type.STRING, description: "Upselling technique" },
                    kpi: { type: Type.ARRAY, items: { type: Type.STRING } },
                    suggestedType: { type: Type.STRING, enum: ['bundle_frame_lens', 'tier_discount', 'spend_save', 'time_based', 'brand_discount', 'other'] }
                }
            };

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Act as a creative marketing expert for an optical shop. 
                Generate a sales strategy based on this requirement: "${aiPrompt}". 
                Use Thai language for all user-facing text. Make it modern, trendy, and high-converting.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema
                }
            });

            if (response.text) {
                const data = JSON.parse(response.text);
                const newStrategy: Strategy = {
                    id: `ai-${Date.now()}`,
                    title: data.title,
                    description: data.description,
                    icon: Sparkles,
                    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    psychology: data.psychology,
                    duration: data.duration,
                    offer: data.offer,
                    adCopy: data.adCopy,
                    upsell: data.upsell,
                    kpi: data.kpi,
                    suggestedType: data.suggestedType,
                    isAiGenerated: true
                };
                setAiStrategy(newStrategy);
                setSelectedStrategy(newStrategy);
                setIsAiInputOpen(false);
                addToast('AI คิดให้แล้ว!', 'กลยุทธ์ใหม่พร้อมใช้งาน');
            }
        } catch (error) {
            console.error(error);
            addToast('เกิดข้อผิดพลาด', 'AI ไม่สามารถสร้างข้อมูลได้ในขณะนี้', 'error');
        } finally {
            setIsAiGenerating(false);
        }
    };

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Rocket className="w-7 h-7 text-orange-500" /> ตัวช่วยเร่งยอดขาย (Sales Booster)
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">คลังไอเดียโปรโมชั่นและเทคนิคการขายเพื่อเพิ่มยอดภายใน 30 วัน</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Strategy Selector */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Active Promotions List */}
                    {activePromotions.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-3 bg-green-50 border-b border-green-100 flex items-center gap-2">
                                <Tag className="w-4 h-4 text-green-600" />
                                <h3 className="font-bold text-green-800 text-sm">แคมเปญที่กำลังใช้งาน ({activePromotions.length})</h3>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {activePromotions.map(promo => (
                                    <div key={promo.id} className="p-3 hover:bg-slate-50 transition-colors group">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0 pr-2">
                                                <div className="font-medium text-slate-800 text-sm truncate">{promo.name}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                    <Calendar className="w-3 h-3"/> 
                                                    {new Date(promo.endDate).toLocaleDateString('th-TH')}
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button 
                                                    onClick={() => handleEditPromo(promo)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="แก้ไข"
                                                >
                                                    <Edit className="w-3.5 h-3.5"/>
                                                </button>
                                                <button 
                                                    onClick={() => setDeleteId(promo.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="ลบ"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5"/>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <Target className="w-5 h-5"/> เลือกกลยุทธ์ที่ต้องการ
                        </h3>
                        
                        {/* AI Button */}
                        <button
                            onClick={() => setIsAiInputOpen(true)}
                            className="w-full text-left p-4 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-all group relative overflow-hidden mb-2"
                        >
                            <div className="flex items-start gap-3 relative z-10">
                                <div className="p-2.5 rounded-lg bg-indigo-500 text-white shadow-md group-hover:scale-110 transition-transform">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-indigo-900">
                                        {aiStrategy ? 'กลยุทธ์จาก AI (ล่าสุด)' : 'ให้ AI ช่วยคิดโปรฯ (AI Magic)'}
                                    </h4>
                                    <p className="text-xs text-indigo-700 mt-1">
                                        {aiStrategy ? 'คลิกเพื่อดูรายละเอียดที่สร้างไว้' : 'พิมพ์โจทย์ที่คุณต้องการ แล้วให้ AI จัดการ'}
                                    </p>
                                </div>
                            </div>
                        </button>

                        <div className="grid gap-3">
                            {/* Display AI Strategy if exists and selected */}
                            {aiStrategy && (
                                <div className="relative group">
                                    <button
                                        onClick={() => setSelectedStrategy(aiStrategy)}
                                        className={`w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden ${
                                            selectedStrategy.id === aiStrategy.id 
                                            ? `bg-white border-2 border-primary-500 shadow-md ring-1 ring-primary-200` 
                                            : 'bg-white border-slate-200 hover:border-primary-300 hover:shadow-sm'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3 relative z-10">
                                            <div className={`p-2.5 rounded-lg ${aiStrategy.color}`}>
                                                <aiStrategy.icon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className={`font-bold ${selectedStrategy.id === aiStrategy.id ? 'text-primary-700' : 'text-slate-700'}`}>
                                                    {aiStrategy.title}
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-1 line-clamp-2 pr-6">
                                                    {aiStrategy.description}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="absolute right-0 top-0 p-2">
                                            <span className="bg-indigo-100 text-indigo-600 text-[10px] px-1.5 py-0.5 rounded font-bold">AI</span>
                                        </div>
                                    </button>
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            setAiStrategy(null); 
                                            if (selectedStrategy.id === aiStrategy.id) setSelectedStrategy(STRATEGIES[0]);
                                        }}
                                        className="absolute bottom-2 right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all z-20"
                                        title="ลบกลยุทธ์นี้"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {STRATEGIES.map(strategy => (
                                <button
                                    key={strategy.id}
                                    onClick={() => setSelectedStrategy(strategy)}
                                    className={`text-left p-4 rounded-xl border transition-all relative overflow-hidden group ${
                                        selectedStrategy.id === strategy.id 
                                        ? `bg-white border-2 border-primary-500 shadow-md ring-1 ring-primary-200` 
                                        : 'bg-white border-slate-200 hover:border-primary-300 hover:shadow-sm'
                                    }`}
                                >
                                    <div className="flex items-start gap-3 relative z-10">
                                        <div className={`p-2.5 rounded-lg ${strategy.color}`}>
                                            <strategy.icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className={`font-bold ${selectedStrategy.id === strategy.id ? 'text-primary-700' : 'text-slate-700'}`}>
                                                {strategy.title}
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                {strategy.description}
                                            </p>
                                        </div>
                                    </div>
                                    {selectedStrategy.id === strategy.id && (
                                        <div className="absolute right-0 top-0 p-2">
                                            <span className="flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
                                            </span>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-5 text-white shadow-lg mt-6">
                            <div className="flex items-center gap-3 mb-3">
                                <Sparkles className="w-6 h-6 text-yellow-300" />
                                <h4 className="font-bold text-lg">Pro Tip</h4>
                            </div>
                            <p className="text-sm text-indigo-100 leading-relaxed mb-3">
                                "ความสม่ำเสมอคือกุญแจสำคัญ" ลองสลับใช้กลยุทธ์ 1-2 อย่างต่อเดือน เพื่อไม่ให้ลูกค้าเกิดความชินชากับการลดราคา แต่รู้สึกตื่นเต้นกับข้อเสนอใหม่ๆ เสมอ
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Strategy Detail */}
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className={`p-6 border-b border-slate-100 ${selectedStrategy.color.replace('text-', 'bg-').replace('bg-', 'bg-opacity-10 ')}`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg bg-white shadow-sm ${selectedStrategy.color}`}>
                                        <selectedStrategy.icon className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-800">{selectedStrategy.title}</h2>
                                    {selectedStrategy.isAiGenerated && (
                                        <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1 border border-indigo-200">
                                            <Sparkles className="w-3 h-3"/> AI Generated
                                        </span>
                                    )}
                                </div>
                                <button 
                                    onClick={handleApplyStrategy}
                                    className="bg-white hover:bg-slate-50 text-slate-700 font-bold py-2 px-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-2 transition-all active:scale-95"
                                >
                                    <Rocket className="w-4 h-4 text-orange-500" />
                                    เปิดใช้งานโปรโมชั่นนี้
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-3 mt-4">
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-slate-600 text-xs font-medium border border-slate-200 shadow-sm">
                                    <Clock className="w-3 h-3" /> ระยะเวลา: {selectedStrategy.duration}
                                </span>
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-slate-600 text-xs font-medium border border-slate-200 shadow-sm">
                                    <ShieldAlert className="w-3 h-3" /> จิตวิทยา: {selectedStrategy.psychology.split(':')[0]}
                                </span>
                            </div>
                        </div>

                        <div className="p-6 md:p-8 space-y-8">
                            
                            {/* 1. The Offer */}
                            <section>
                                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm">1</span>
                                    ข้อเสนอหลัก (Core Offer)
                                </h3>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-700 font-medium text-lg">
                                    {selectedStrategy.offer}
                                </div>
                            </section>

                            {/* 2. Ad Copy Generator */}
                            <section>
                                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm">2</span>
                                    ตัวอย่างคำโฆษณา (Ready-to-use Ad Copy)
                                </h3>
                                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                    <div className="p-4 space-y-4">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs text-slate-500 uppercase font-bold tracking-wider">
                                                <span>Headline (พาดหัวหยุดนิ้วโป้ง)</span>
                                                <button onClick={() => handleCopy(selectedStrategy.adCopy.headline, 'headline')} className="text-primary-600 hover:text-primary-700 flex items-center gap-1">
                                                    {copiedField === 'headline' ? <Check className="w-3 h-3"/> : <Copy className="w-3 h-3"/>} Copy
                                                </button>
                                            </div>
                                            <div className="p-3 bg-white border border-slate-200 rounded-lg text-slate-800 font-bold">
                                                {selectedStrategy.adCopy.headline}
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs text-slate-500 uppercase font-bold tracking-wider">
                                                <span>Body (เนื้อหาขยี้ใจ)</span>
                                                <button onClick={() => handleCopy(selectedStrategy.adCopy.body, 'body')} className="text-primary-600 hover:text-primary-700 flex items-center gap-1">
                                                    {copiedField === 'body' ? <Check className="w-3 h-3"/> : <Copy className="w-3 h-3"/>} Copy
                                                </button>
                                            </div>
                                            <div className="p-3 bg-white border border-slate-200 rounded-lg text-slate-700 whitespace-pre-line text-sm leading-relaxed">
                                                {selectedStrategy.adCopy.body}
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs text-slate-500 uppercase font-bold tracking-wider">
                                                <span>Call to Action (กระตุ้นให้กด)</span>
                                                <button onClick={() => handleCopy(selectedStrategy.adCopy.cta, 'cta')} className="text-primary-600 hover:text-primary-700 flex items-center gap-1">
                                                    {copiedField === 'cta' ? <Check className="w-3 h-3"/> : <Copy className="w-3 h-3"/>} Copy
                                                </button>
                                            </div>
                                            <div className="p-3 bg-white border border-slate-200 rounded-lg text-primary-700 font-bold text-center">
                                                {selectedStrategy.adCopy.cta}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-100 px-4 py-2 text-xs text-slate-500 flex items-center gap-2">
                                        <MessageCircle className="w-3 h-3" /> เหมาะสำหรับ Facebook Post, Line Broadcast, TikTok Caption
                                    </div>
                                </div>
                            </section>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* 3. Upsell Strategy */}
                                <section>
                                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm">3</span>
                                        เทคนิคเพิ่มยอด (Upsell)
                                    </h3>
                                    <div className="bg-green-50 p-4 rounded-xl border border-green-100 h-full">
                                        <div className="flex items-start gap-3">
                                            <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
                                            <div>
                                                <p className="text-sm text-green-800 font-medium">{selectedStrategy.upsell}</p>
                                                <p className="text-xs text-green-600 mt-2">
                                                    *แนะนำให้เสนอหลังจากลูกค้าตัดสินใจซื้อตัวหลักแล้ว (Timing is key)
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* 4. KPIs */}
                                <section>
                                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm">4</span>
                                        ตัววัดผล (KPIs)
                                    </h3>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 h-full">
                                        <ul className="space-y-2">
                                            {selectedStrategy.kpi.map((kpi, idx) => (
                                                <li key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                                                    <BarChart3 className="w-4 h-4 text-slate-400" />
                                                    {kpi}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </section>
                            </div>

                            {/* Why it works */}
                            <section className="pt-4 border-t border-slate-100">
                                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">ทำไมกลยุทธ์นี้ถึงได้ผล? (Psychology)</h4>
                                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                                    "{selectedStrategy.psychology}"
                                </p>
                            </section>

                        </div>
                    </div>
                </div>
            </div>

            {/* AI Input Modal */}
            {isAiInputOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 bg-indigo-50/50 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Sparkles className="w-6 h-6 text-indigo-500" /> AI Magic Strategy
                            </h3>
                            <button onClick={() => setIsAiInputOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleGenerateAi} className="p-6">
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                บอก AI ว่าคุณต้องการโปรโมชั่นแบบไหน?
                            </label>
                            <textarea 
                                autoFocus
                                required
                                rows={4}
                                className="w-full border border-slate-300 rounded-xl p-3 text-base focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder:text-slate-400"
                                placeholder="เช่น อยากได้โปรฯ วันวาเลนไทน์ สำหรับคู่รัก, โปรฯ ล้างสต็อกกรอบแว่นเก่า, หรือ โปรฯ เจาะกลุ่มนักเรียนเปิดเทอม..."
                                value={aiPrompt}
                                onChange={e => setAiPrompt(e.target.value)}
                            />
                            
                            <div className="mt-6 flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setIsAiInputOpen(false)} 
                                    className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                                >
                                    ยกเลิก
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isAiGenerating}
                                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 font-bold transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isAiGenerating ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" /> กำลังคิด...
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="w-5 h-5" /> สร้างกลยุทธ์
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create/Edit Promo Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Rocket className="w-5 h-5 text-primary-600"/> {editingPromoId ? 'แก้ไขโปรโมชั่น' : 'สร้างโปรโมชั่นใหม่'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSavePromo} className="p-6 space-y-4">
                            {!editingPromoId && (
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700 mb-4">
                                    ระบบดึงข้อมูลจากกลยุทธ์ <strong>"{selectedStrategy.title}"</strong> มาให้แล้ว กรุณาตรวจสอบวันที่และเงื่อนไขก่อนบันทึก
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อโปรโมชั่น</label>
                                <input required type="text" className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 outline-none" 
                                    value={promoForm.name} onChange={e => setPromoForm({...promoForm, name: e.target.value})} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">วันเริ่ม</label>
                                    <input required type="date" className="w-full border border-slate-200 rounded-lg p-2.5" 
                                        value={promoForm.startDate} onChange={e => setPromoForm({...promoForm, startDate: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">วันสิ้นสุด</label>
                                    <input required type="date" className="w-full border border-slate-200 rounded-lg p-2.5" 
                                        value={promoForm.endDate} onChange={e => setPromoForm({...promoForm, endDate: e.target.value})} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียด / เงื่อนไข</label>
                                <textarea rows={3} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 outline-none resize-none" 
                                    value={promoForm.conditionText} onChange={e => setPromoForm({...promoForm, conditionText: e.target.value})} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ประเภทระบบ (System Type)</label>
                                    <select className="w-full border border-slate-200 rounded-lg p-2.5 bg-white"
                                        value={promoForm.type} onChange={e => setPromoForm({...promoForm, type: e.target.value})} >
                                        <option value="bundle_frame_lens">ซื้อกรอบแถมเลนส์</option>
                                        <option value="tier_discount">ส่วนลดสมาชิก</option>
                                        <option value="spend_save">ซื้อครบ...ลด...</option>
                                        <option value="time_based">ช่วงเวลาพิเศษ (Happy Hour)</option>
                                        <option value="brand_discount">ลดเฉพาะแบรนด์</option>
                                        <option value="other">อื่นๆ (กำหนดเอง)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ยอดซื้อขั้นต่ำ (Min Spend)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">฿</span>
                                        <input 
                                            type="number" 
                                            min="0"
                                            className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500" 
                                            value={promoForm.conditions?.minSpend || ''} 
                                            onChange={e => setPromoForm({
                                                ...promoForm, 
                                                conditions: { ...promoForm.conditions, minSpend: Number(e.target.value) }
                                            })} 
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-4">
                                {editingPromoId ? (
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setDeleteId(editingPromoId);
                                            setIsModalOpen(false);
                                        }}
                                        className="text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 text-sm flex items-center gap-1 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" /> ลบโปรโมชั่นนี้
                                    </button>
                                ) : (
                                    <div></div>
                                )}
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">ยกเลิก</button>
                                    <button type="submit" className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-200 font-medium transition-colors flex items-center gap-2">
                                        <Save className="w-4 h-4"/> {editingPromoId ? 'บันทึกการแก้ไข' : 'บันทึกเข้าสู่ระบบ'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleDeletePromo}
                title="ลบโปรโมชั่น"
                message="คุณต้องการลบโปรโมชั่นนี้ออกจากระบบใช่หรือไม่?"
                confirmText="ลบข้อมูล"
            />
        </div>
    );
};

export default SalesBooster;