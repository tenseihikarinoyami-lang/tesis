import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { 
  User, 
  Key, 
  Copy, 
  Check, 
  Calendar, 
  ArrowLeft, 
  Lock, 
  ShieldCheck, 
  Loader2, 
  AlertCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const ProfilePage: React.FC = () => {
  const { appUser, updateUserInContext } = useAuth();
  const navigate = useNavigate();

  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  if (!appUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-gray-500 font-medium">
         Cargando sesión de usuario...
      </div>
    );
  }

  const copyUID = () => {
    navigator.clipboard.writeText(appUser.uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const actualCurrentPassword = appUser.password || "123456";

    if (form.currentPassword.trim() !== actualCurrentPassword.trim()) {
      setError("La clave de acceso actual es incorrecta.");
      return;
    }

    if (form.newPassword.length < 4) {
      setError("La nueva clave de acceso debe tener al menos 4 caracteres.");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("La nueva clave de acceso y su confirmación no coinciden.");
      return;
    }

    if (form.newPassword === actualCurrentPassword) {
      setError("La nueva clave de acceso debe ser diferente a la clave actual.");
      return;
    }

    setLoading(true);

    try {
      // Admin might has a mock auth profile ("admin-id"), ignore for firestore update but update mock session
      if (appUser.uid !== "admin-id") {
        const userRef = doc(db, "users", appUser.uid);
        await updateDoc(userRef, {
          password: form.newPassword
        });
      }
      
      // Update session in context & local storage
      updateUserInContext({ password: form.newPassword });
      
      setSuccess("¡Su clave de acceso ha sido actualizada exitosamente!");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      console.error("Error updating password in Firestore:", err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `users/${appUser.uid}`);
      } catch (firestoreErr: any) {
        setError("Error de base de datos al guardar la clave.");
      }
    } finally {
      setLoading(false);
    }
  };

  const isExpired = appUser.expiresAt && Date.now() > appUser.expiresAt;
  const timeRemaining = appUser.expiresAt ? appUser.expiresAt - Date.now() : null;
  const daysRemaining = timeRemaining ? Math.max(0, Math.ceil(timeRemaining / (1000 * 60 * 60 * 24))) : null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-10 py-6"
    >
      {/* Back to workspace header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate("/")}
          className="px-6 py-3 bg-white text-gray-700 font-bold text-xs uppercase tracking-widest rounded-2xl border border-gray-100 shadow-sm hover:bg-gray-50 flex items-center gap-3 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Workspace
        </button>
        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-300">Perfil Científico v2.5</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Card: Identidad e Info */}
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
             {/* Gradient top bar */}
             <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-blue to-brand-indigo" />
             
             {/* First Character Avatar */}
             <div className="w-24 h-24 rounded-3xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-900 font-display font-black text-4xl shadow-md mb-6 mt-4">
                {appUser.displayName?.[0] || appUser.email?.[0] || "?"}
             </div>

             <h2 className="text-2xl font-display font-bold text-gray-900 tracking-tight leading-tight px-2">
               {appUser.displayName || "Usuario"}
             </h2>

             {/* Role Chip */}
             <div className="mt-3">
               <span className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest border uppercase ${
                 appUser.role === "admin" 
                   ? "bg-brand-indigo/10 text-brand-indigo border-brand-indigo/20" 
                   : "bg-brand-blue/10 text-brand-blue border-brand-blue/20"
               }`}>
                 {appUser.role === "admin" ? "Administrador Core" : "Investigador Activo"}
               </span>
             </div>

             <div className="w-full h-px bg-gray-50 my-8" />

             {/* Details list */}
             <div className="w-full text-left space-y-6">
                <div className="space-y-1">
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Correo de Registro</p>
                   <p className="text-sm font-semibold text-gray-800 break-all">{appUser.email}</p>
                </div>

                <div className="space-y-2">
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Identificador del Sistema (UID)</p>
                   <div className="flex items-center gap-2">
                      <code className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-mono font-bold text-gray-600 truncate flex-1">
                         {appUser.uid}
                      </code>
                      <button 
                        onClick={copyUID}
                        className={`p-2.5 rounded-xl border transition-all ${
                          copied 
                            ? "bg-green-50 border-green-200 text-green-600" 
                            : "bg-white border-gray-100 text-gray-400 hover:text-gray-900 hover:bg-gray-50"
                        }`}
                        title="Copiar UID"
                      >
                         {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                   </div>
                   <p className="text-[9px] text-gray-400 italic">Copie este ID y compártalo con el administrador si requiere renovar su acceso.</p>
                </div>
             </div>
          </div>

          {/* Validez/Expiración Info Card */}
          <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm space-y-5">
             <div className="flex items-center gap-4">
                <Calendar className="w-6 h-6 text-brand-blue" />
                <div>
                   <h3 className="text-sm font-bold text-gray-900 tracking-tight">Periodo de Validez</h3>
                   <p className="text-xs text-gray-400 italic">Control de licenciamiento científico.</p>
                </div>
             </div>
             
             <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                <div className="flex flex-col">
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha Límite</span>
                   <span className="text-sm font-bold text-gray-800 mt-1">
                      {appUser.expiresAt ? new Date(appUser.expiresAt).toLocaleDateString() : "Acceso Indefinido"}
                   </span>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estatus</span>
                   <span className={`text-xs font-bold uppercase tracking-wider mt-1 ${isExpired ? "text-red-500" : "text-green-600"}`}>
                      {isExpired ? "Expirado" : daysRemaining !== null ? `${daysRemaining} días` : "Ilimitado"}
                   </span>
                </div>
             </div>
          </div>
        </div>

        {/* Right Card: Cambiar Contraseña */}
        <div className="lg:col-span-7">
           <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 sm:p-14 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-indigo to-brand-blue" />
              
              <div className="flex items-center gap-5 mb-10">
                 <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 text-brand-indigo rounded-2xl flex items-center justify-center">
                    <Key className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-2xl font-display font-bold text-gray-900 tracking-tight leading-none">Clave de Acceso</h3>
                    <p className="text-gray-400 text-xs mt-1.5 italic font-medium">Reemplace la clave temporal provista por el administrador.</p>
                 </div>
              </div>

              {/* Status alerts */}
              <AnimatePresence mode="wait">
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-5 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-3 text-left mb-8 shadow-sm"
                  >
                    <ShieldCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-green-700 leading-relaxed font-semibold italic">{success}</p>
                  </motion.div>
                )}

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-left mb-8 shadow-sm"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 leading-relaxed font-semibold italic">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handlePasswordChange} className="space-y-8">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-4">Clave de Acceso Actual (o Temporal)</label>
                    <div className="relative group">
                       <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-brand-indigo transition-colors" />
                       <input 
                         required
                         type="password"
                         placeholder="Ingresa la clave que tienes actualmente..."
                         className="w-full pl-14 pr-6 py-5 bg-gray-50/50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-brand-indigo focus:ring-4 ring-brand-indigo/5 transition-all text-sm font-medium text-gray-800"
                         value={form.currentPassword}
                         onChange={(e) => setForm({...form, currentPassword: e.target.value})}
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-4">Nueva Clave Personalizada</label>
                    <div className="relative group">
                       <Key className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-brand-indigo transition-colors" />
                       <input 
                         required
                         type="password"
                         placeholder="Crea una clave segura y fácil de recordar..."
                         className="w-full pl-14 pr-6 py-5 bg-gray-50/50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-brand-indigo focus:ring-4 ring-brand-indigo/5 transition-all text-sm font-medium text-gray-800"
                         value={form.newPassword}
                         onChange={(e) => setForm({...form, newPassword: e.target.value})}
                       />
                    </div>
                 </div>

                 <div className="space-y-2 font-display">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-4">Confirmar Nueva Clave</label>
                    <div className="relative group">
                       <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-brand-indigo transition-colors" />
                       <input 
                         required
                         type="password"
                         placeholder="Re-escribe exactamente la nueva clave..."
                         className="w-full pl-14 pr-6 py-5 bg-gray-50/50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-brand-indigo focus:ring-4 ring-brand-indigo/5 transition-all text-sm font-medium text-gray-800"
                         value={form.confirmPassword}
                         onChange={(e) => setForm({...form, confirmPassword: e.target.value})}
                       />
                    </div>
                 </div>

                 <motion.button 
                   whileHover={{ scale: 1.01 }}
                   whileTap={{ scale: 0.99 }}
                   type="submit"
                   disabled={loading}
                   className="w-full py-6 bg-gray-900 text-white hover:bg-black rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-xl shadow-gray-200 mt-4 flex items-center justify-center gap-3 disabled:opacity-50"
                 >
                   {loading ? (
                     <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                   ) : (
                     <Key className="w-4 h-4" />
                   )}
                   {loading ? "Actualizando Servidores Core..." : "ESTABLECER MI CLAVE PERSONAL"}
                 </motion.button>
              </form>
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProfilePage;
