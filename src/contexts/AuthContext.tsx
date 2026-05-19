import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { AppUser } from "../types";

const ADMIN_EMAIL = "darkangeldiaz@gmail.com";

interface AuthContextType {
  user: AppUser | null;
  appUser: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const savedUser = localStorage.getItem("tm_session");
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser) as AppUser;
          
          // Double check status/expiration in Firestore for security
          if (parsed.role !== "admin") {
            try {
              const userDoc = await getDoc(doc(db, "users", parsed.uid));
              if (userDoc.exists()) {
                const freshData = userDoc.data() as AppUser;
                const isExpired = freshData.expiresAt && Date.now() > freshData.expiresAt;
                if (isExpired || freshData.status === "expired") {
                  console.warn("Session expired during background check");
                  logout();
                  return;
                }
                setAppUser(freshData);
              } else {
                setAppUser(parsed);
              }
            } catch (err) {
              console.error("Firestore session validation failed:", err);
              setAppUser(parsed); // Fallback to cached session if offline/error
            }
          } else {
            setAppUser(parsed);
          }
        } catch (e) {
          localStorage.removeItem("tm_session");
        }
      }
      setLoading(false);
    };

    checkSession();
  }, []);

  const signIn = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    // 1. Check Hardcoded Admin
    const isAdminLogin = (
      cleanUsername.toLowerCase() === "admin" || 
      cleanUsername === "administración" || 
      cleanUsername === "administracion"
    ) && cleanPassword === "admin123";

    if (isAdminLogin) {
      console.log("Login successful as system admin");
      const adminUser: AppUser = {
        uid: "admin-id",
        email: "admin@thesis-master.ai",
        displayName: "Master Admin Core",
        role: "admin",
        expiresAt: null,
        createdAt: Date.now(),
        status: "active"
      };
      setAppUser(adminUser);
      localStorage.setItem("tm_session", JSON.stringify(adminUser));
      setLoading(false);
      return;
    }

    // 2. Check Firestore Users
    try {
      // Search by email as username or by UID as username
      const usersRef = collection(db, "users");
      // Check both UID and Email
      const qMail = query(usersRef, where("email", "==", cleanUsername));
      const qUid = query(usersRef, where("uid", "==", cleanUsername));
      
      const [snapMail, snapUid] = await Promise.all([getDocs(qMail), getDocs(qUid)]);
      const snapshot = !snapMail.empty ? snapMail : snapUid;

      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data() as AppUser;
        
        // Check password (simple comparison for prototype)
        if (userData.password === cleanPassword || (!userData.password && cleanPassword === "123456")) {
          // Check expiration
          const isExpired = userData.expiresAt && Date.now() > userData.expiresAt;
          if (isExpired || userData.status === "expired") {
             setError("Su acceso ha expirado. Contacte al administrador para renovar su licencia.");
          } else {
             console.log("Login successful as researcher:", userData.displayName);
             setAppUser(userData);
             localStorage.setItem("tm_session", JSON.stringify(userData));
          }
        } else {
          setError("Clave de acceso incorrecta para este protocolo.");
        }
      } else {
        setError("Identificador no reconocido en el sistema.");
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("Error crítico de sincronización con el servidor.");
    }
    
    setLoading(false);
  };

  const logout = async () => {
    localStorage.removeItem("tm_session");
    setAppUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user: appUser, 
      appUser, 
      loading, 
      isAdmin: appUser?.role === "admin", 
      signIn, 
      logout,
      error 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
