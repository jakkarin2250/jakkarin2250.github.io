
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { db, ref, onValue } from '../services/firebase';
import { Mail, Lock, Eye, EyeOff, Wifi, WifiOff, Glasses, Check } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const { addToast } = useToast();
  // Safe access to useData in case Login is rendered outside DataProvider context in some future refactor
  // But currently App structure wraps Login in DataProvider.
  let settings: any = { shopName: 'J.T. Optic', logo: '/logo.png' };
  try {
      const data = useData();
      if (data && data.settings) settings = data.settings;
  } catch (e) {
      // Ignore if context not available
  }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imgError, setImgError] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Monitor Firebase Connection Status
  useEffect(() => {
    const connectedRef = ref(db, ".info/connected");
    const unsubscribe = onValue(connectedRef, (snap) => {
      setIsConnected(!!snap.val());
    });
    return () => unsubscribe();
  }, []);

  // Load remembered email
  useEffect(() => {
      const savedEmail = localStorage.getItem('jtoptic_remember_email');
      if (savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
      }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Pass rememberMe boolean to login function to determine persistence
      await login(email, password, rememberMe);
      
      addToast('เข้าสู่ระบบสำเร็จ', 'ยินดีต้อนรับกลับสู่ระบบ');
      
      // Handle Remember Me (Email Autofill)
      if (rememberMe) {
          localStorage.setItem('jtoptic_remember_email', email);
      } else {
          localStorage.removeItem('jtoptic_remember_email');
      }
    } catch (err) {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  const logoSrc = settings.logo || '/logo.png';

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#C0E4F6]">
      
      {/* --- Premium Background (Radial Pastel Gradient) --- */}
      {/* Center: #ECF8F8 -> Edge: #C0E4F6 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#ECF8F8] to-[#C0E4F6]"></div>
      
      {/* Decorative Blobs (Adjusted for lighter background) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/60 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#A0D4F0]/30 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      <div className="absolute top-[40%] left-[60%] w-[25%] h-[25%] bg-white/40 rounded-full blur-[80px] animate-pulse delay-700"></div>

      {/* --- Login Card --- */}
      <div className="relative z-10 w-full max-w-md p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-[0_8px_40px_rgb(0,0,0,0.1)] border border-white/60 overflow-hidden relative">
          <div className="h-1.5 w-full bg-gradient-to-r from-[#C0E4F6] via-[#7DD3FC] to-[#C0E4F6]"></div>

          <div className="p-8 md:p-10">
            {/* Header / Logo */}
            <div className="text-center mb-8">
              <div className="flex flex-col items-center justify-center">
                {!imgError ? (
                  <img 
                    src={logoSrc} 
                    alt="Logo" 
                    className="h-20 w-auto object-contain mb-4 hover:scale-105 transition-transform duration-300 drop-shadow-sm"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  // Fallback Icon if logo fails
                  <div className="w-16 h-16 bg-[#C0E4F6] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-100">
                      <Glasses className="w-8 h-8 text-slate-600" />
                  </div>
                )}
                
                {/* Always show Shop Name text */}
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{settings.shopName}</h1>
              </div>
              <p className="text-slate-500 text-sm font-medium tracking-wide mt-2">Smart Optical Solution</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Username / Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#0EA5E9] transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] transition-all shadow-sm font-medium"
                    placeholder="Enter your username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#0EA5E9] transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full pl-11 pr-12 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] transition-all shadow-sm font-medium"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer group select-none">
                      <div className="relative flex items-center justify-center">
                          <input 
                              type="checkbox" 
                              className="peer sr-only" 
                              checked={rememberMe}
                              onChange={(e) => setRememberMe(e.target.checked)}
                          />
                          <div className={`w-5 h-5 border-2 rounded-md transition-all duration-200 ${rememberMe ? 'bg-[#0EA5E9] border-[#0EA5E9]' : 'bg-white border-slate-300 group-hover:border-[#0EA5E9]'}`}></div>
                          <Check className={`absolute w-3.5 h-3.5 text-white transition-all duration-200 ${rememberMe ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} strokeWidth={3} />
                      </div>
                      <span className={`text-sm font-medium transition-colors ${rememberMe ? 'text-[#0284C7]' : 'text-slate-500 group-hover:text-slate-700'}`}>
                          จดจำชื่อผู้ใช้
                      </span>
                  </label>
              </div>
              
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm animate-in fade-in slide-in-from-top-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></div>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] hover:from-[#0284C7] hover:to-[#0369A1] text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transform transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>
          </div>

          <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 text-center backdrop-blur-sm">
            {/* Connection Status Indicator */}
            <div className="flex justify-center mb-3">
                <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all duration-500 ${
                    isConnected 
                    ? 'bg-green-50 text-green-700 border border-green-100' 
                    : 'bg-red-50 text-red-700 border border-red-100 animate-pulse'
                }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    {isConnected ? (
                        <span className="flex items-center gap-1">Server Connected <Wifi className="w-3 h-3"/></span>
                    ) : (
                        <span className="flex items-center gap-1">Connecting... <WifiOff className="w-3 h-3"/></span>
                    )}
                </div>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              &copy; {new Date().getFullYear()} {settings.shopName || 'J.T. Optic System'} • v1.2.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
