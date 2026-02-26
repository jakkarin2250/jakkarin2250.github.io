
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, ActivityLog, LogActionType, LogModule } from '../types';
import { auth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, updateProfile, db, ref, push, set, setPersistence, browserSessionPersistence, browserLocalPersistence } from '../services/firebase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => void;
  loading: boolean;
  updateProfileName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Use the new logging structure directly here
  const logAuthActivity = (actionType: LogActionType, description: string, userId: string, userName: string, oldData?: any, newData?: any) => {
      try {
          const newRef = push(ref(db, 'activity_logs'));
          const logEntry: ActivityLog = {
              id: newRef.key as string,
              timestamp: new Date().toISOString(),
              userId: userId || 'unknown',
              userName: userName || 'Unknown',
              role: 'admin', // Placeholder
              actionType,
              module: 'AUTH',
              description: description || '',
              oldData: oldData,
              newData: newData,
              userAgent: navigator.userAgent || ''
          };

          // CRITICAL FIX: Remove undefined values using JSON serialization
          // Firebase throws error if any value is undefined.
          const payload = JSON.parse(JSON.stringify(logEntry));

          set(newRef, payload);
      } catch (error) {
          console.error("Failed to log auth action", error);
      }
  };

  // 1. Auto Logout on Tab Close / Browser Close / Reload
  useEffect(() => {
    const handleUnload = (event: BeforeUnloadEvent) => {
      // เรียก signOut ทันทีเมื่อเกิด event unload
      // หมายเหตุ: การทำงานนี้เป็น asynchronous แต่อาจช่วยเคลียร์ session ในบาง browser ได้ทันที
      signOut(auth).catch((error) => {
        console.error("Auto-logout failed during unload:", error);
      });
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: any) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'Admin User'
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Create default admin user if not exists
    const setupDefaultUser = async () => {
        try {
            await createUserWithEmailAndPassword(auth, 'admin@jtoptic.local', 'admin123');
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { displayName: 'Administrator' });
            }
        } catch (e) {
            // User likely exists, ignore
        }
    };
    setupDefaultUser();

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string, remember: boolean = false) => {
    const finalEmail = email.includes('@') ? email : `${email}@jtoptic.local`;
    
    // 2. Enforce Session Persistence Only
    // ป้องกัน session ค้างใน localStorage โดยบังคับใช้ browserSessionPersistence เสมอ
    // แม้ผู้ใช้จะกด Remember Me ก็จะไม่มีผลในระยะยาวเมื่อปิด browser ตามเงื่อนไขความปลอดภัย
    await setPersistence(auth, browserSessionPersistence);

    const result = await signInWithEmailAndPassword(auth, finalEmail, password);
    
    if (result.user) {
        logAuthActivity('LOGIN', 'User logged into the system', result.user.uid, result.user.displayName || 'User');
    }
  };

  const logout = async () => {
    if (auth.currentUser) {
        // Capture details before signing out
        const uid = auth.currentUser.uid;
        const name = auth.currentUser.displayName || 'User';
        logAuthActivity('LOGOUT', 'User logged out', uid, name);
    }
    await signOut(auth);
  };

  const updateProfileName = async (name: string) => {
    if (auth.currentUser) {
        const oldName = auth.currentUser.displayName;
        await updateProfile(auth.currentUser, { displayName: name });
        setUser(prev => prev ? { ...prev, displayName: name } : null);
        
        logAuthActivity(
            'UPDATE', 
            `Changed profile name from ${oldName} to ${name}`, 
            auth.currentUser.uid, 
            name,
            { displayName: oldName },
            { displayName: name }
        );
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateProfileName }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
