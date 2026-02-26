import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { LogOut, Clock, MousePointerClick } from 'lucide-react';

const AutoLogoutHandler = () => {
    const { logout, user } = useAuth();
    const { settings, logManualActivity } = useData();
    const { addToast } = useToast();
    
    // Config from settings or defaults (default 10 mins)
    const isEnabled = settings.autoLogoutEnabled !== false; // Default true if undefined
    const timeoutMinutes = settings.autoLogoutMinutes || 10;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = 60 * 1000; // Warn 1 minute before

    const [showWarning, setShowWarning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isActive, setIsActive] = useState(false);

    // Use refs to avoid interval stale closures
    const logoutTimerRef = useRef<any>(null);
    const activityListenerAdded = useRef(false);

    // Update activity timestamp in localStorage
    const updateActivity = () => {
        if (!user) return;
        localStorage.setItem('jtoptic_last_activity', Date.now().toString());
        // Also hide warning if it's showing
        setShowWarning(false);
    };

    // Throttle activity updates to avoid spamming localStorage
    const throttleUpdate = () => {
        if (!isActive) {
            setIsActive(true);
            updateActivity();
            setTimeout(() => setIsActive(false), 2000); // Only update max once every 2s
        }
    };

    // Main Logic Effect
    useEffect(() => {
        if (!user || !isEnabled) {
            // Cleanup if disabled or logged out
            if (logoutTimerRef.current) clearInterval(logoutTimerRef.current);
            return;
        }

        // Initialize timestamp if missing
        if (!localStorage.getItem('jtoptic_last_activity')) {
            updateActivity();
        }

        // Add Event Listeners
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
        const handleEvent = () => throttleUpdate();

        events.forEach(evt => window.addEventListener(evt, handleEvent));
        activityListenerAdded.current = true;

        // Interval Check
        logoutTimerRef.current = setInterval(() => {
            const lastActivity = parseInt(localStorage.getItem('jtoptic_last_activity') || '0', 10);
            const now = Date.now();
            const diff = now - lastActivity;

            if (diff > timeoutMs) {
                // Time expired -> Logout
                clearInterval(logoutTimerRef.current);
                performLogout();
            } else if (diff > (timeoutMs - warningMs)) {
                // Warning threshold -> Show Modal
                setShowWarning(true);
                setTimeLeft(Math.ceil((timeoutMs - diff) / 1000));
            } else {
                // Safe zone -> Ensure modal hidden
                if (showWarning) setShowWarning(false);
            }
        }, 1000);

        return () => {
            events.forEach(evt => window.removeEventListener(evt, handleEvent));
            if (logoutTimerRef.current) clearInterval(logoutTimerRef.current);
        };
    }, [user, isEnabled, timeoutMs, showWarning]); // Re-run if settings change

    const performLogout = () => {
        // Log activity before logout
        logManualActivity('LOGOUT', 'AUTH', 'Auto logout due to inactivity', user?.uid);
        logout();
        addToast('หมดเวลาการใช้งาน', 'ระบบออกจากระบบอัตโนมัติเนื่องจากไม่มีการใช้งาน', 'error');
        setShowWarning(false);
    };

    const handleStayLoggedIn = () => {
        updateActivity();
        setShowWarning(false);
    };

    if (!showWarning || !user || !isEnabled) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center border-t-4 border-red-500">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <Clock className="w-8 h-8 text-red-600" />
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-2">หมดเวลาการใช้งาน?</h3>
                <p className="text-gray-500 text-sm mb-6">
                    ระบบจะออกจากระบบอัตโนมัติในอีก <span className="font-bold text-red-600 text-lg">{timeLeft}</span> วินาที 
                    เนื่องจากไม่มีการใช้งาน
                </p>
                
                <div className="flex gap-3">
                    <button 
                        onClick={performLogout}
                        className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-4 h-4"/> ออกจากระบบ
                    </button>
                    <button 
                        onClick={handleStayLoggedIn}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-200 transition-colors flex items-center justify-center gap-2"
                    >
                        <MousePointerClick className="w-4 h-4"/> ใช้งานต่อ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AutoLogoutHandler;