import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import DashboardPage from "./pages/DashboardPage";
import ProjectPage from "./pages/ProjectPage";
import ProfilePage from "./pages/ProfilePage";
import { LogOut, GraduationCap, Users, ShieldAlert, BookOpen, LayoutDashboard, Copy, CheckCircle2, Loader2, Lock, User } from "lucide-react";
import { motion } from "motion/react";

const ProtectedRoute: React.FC<{ children: React.ReactNode; requireAdmin?: boolean }> = ({ children, requireAdmin }) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-[#fdfdfc]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-600/20 rounded-full" />
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
        </div>
        <p className="text-gray-400 font-serif lowercase tracking-[0.2em] italic">Verificando credenciales...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  
  // Real-time expiration & block check
  if (user && user.role !== "admin") {
    const isExpired = user.expiresAt && Date.now() > user.expiresAt;
    if (isExpired || user.status === "expired") {
      return <Navigate to="/login" />;
    }
  }

  if (requireAdmin && !isAdmin) return <Navigate to="/" />;
  return <>{children}</>;
};

const LoginPage: React.FC = () => {
  const { signIn, user, loading, error } = useAuth();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");

  if (user) return <Navigate to="/" />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signIn(username, password);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-mesh relative overflow-hidden p-4 sm:p-6 lg:p-10">
      {/* Background Grid Accent */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      
      {/* Decorative Orbs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
          x: [0, 50, 0],
          y: [0, -20, 0]
        }}
        transition={{ duration: 15, repeat: Infinity }}
        className="absolute -top-[15%] -left-[10%] w-[50%] h-[50%] bg-brand-blue blur-[150px] rounded-full pointer-events-none" 
      />
      <motion.div 
        animate={{ 
          scale: [1.3, 1, 1.3],
          opacity: [0.1, 0.3, 0.1],
          x: [0, -50, 0],
          y: [0, 20, 0]
        }}
        transition={{ duration: 20, repeat: Infinity }}
        className="absolute -bottom-[15%] -right-[15%] w-[60%] h-[60%] bg-brand-indigo blur-[180px] rounded-full pointer-events-none" 
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[500px] glass-premium p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3rem] flex flex-col items-center relative z-10 my-auto shadow-2xl overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-blue via-brand-indigo to-brand-blue" />
        
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-20 h-20 bg-gray-900 rounded-[2rem] flex items-center justify-center text-white mb-8 shadow-2xl relative group"
        >
          <div className="absolute inset-0 bg-brand-blue rounded-[2rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
          <GraduationCap className="w-10 h-10 relative z-10" />
        </motion.div>

        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tighter text-gray-900 leading-[0.9] mb-4">
            Thesis<span className="font-serif italic text-brand-blue text-glow">Master</span>
          </h1>
          <p className="text-gray-400 text-sm font-medium tracking-[0.2em] uppercase">Auth Gateway v2.5</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="w-full p-4 bg-red-50/90 backdrop-blur-md border border-red-100 rounded-2xl flex items-start gap-3 text-left mb-8 shadow-sm shadow-red-900/5 group"
          >
            <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5 group-hover:animate-shake" />
            <p className="text-xs text-red-700 leading-relaxed font-semibold italic">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-4">Identificador Maestro</label>
            <div className="relative group">
              <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-brand-blue transition-colors" />
              <input 
                type="text" 
                required
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                className="w-full pl-14 pr-6 py-5 bg-gray-50/50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-brand-blue focus:ring-4 ring-brand-blue/5 transition-all font-display font-medium text-gray-900 placeholder:text-gray-300"
                placeholder="Ej: admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-4">Clave de Acceso</label>
            <div className="relative group">
              <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-brand-blue transition-colors" />
              <input 
                type="password" 
                required
                className="w-full pl-14 pr-6 py-5 bg-gray-50/50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-brand-blue focus:ring-4 ring-brand-blue/5 transition-all font-display font-medium text-gray-900 placeholder:text-gray-300"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            className="w-full py-6 bg-gray-900 text-white rounded-2xl font-bold text-sm tracking-[0.2em] uppercase hover:bg-brand-blue transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-4 group disabled:opacity-50 mt-4 overflow-hidden relative"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-white/50" />
            ) : (
              <span className="relative z-10">Acceso Master</span>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          </motion.button>
        </form>

        <div className="w-full pt-10 border-t border-gray-100/50 mt-10">
           <div className="flex items-center justify-between text-[8px] font-black tracking-widest text-gray-300 uppercase">
              <span>Scientific OS v2.5</span>
              <span>Encrypted Session</span>
           </div>
        </div>
      </motion.div>

      {/* Floating background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden touch-none select-none opacity-20">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%",
              opacity: 0 
            }}
            animate={{ 
              y: [null, "-40px", "40px"],
              opacity: [0, 1, 0]
            }}
            transition={{ 
              duration: 10 + Math.random() * 15, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
            className="absolute"
          >
             <div className="w-24 h-24 border border-brand-blue/30 rounded-full" />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, user, isAdmin } = useAuth();
  const [copied, setCopied] = React.useState(false);

  const copyUID = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-mesh selection:bg-brand-blue/10 selection:text-brand-blue relative">
      <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
      
      <nav className="border-b border-white/5 bg-gray-900 text-white sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 h-20 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-4 group">
              <div className="w-12 h-12 bg-white/10 rounded-[1.25rem] flex items-center justify-center text-white border border-white/5 group-hover:border-brand-blue transition-all backdrop-blur-xl group-hover:bg-brand-blue">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-xl font-bold tracking-tighter group-hover:text-brand-blue transition-colors">ThesisMaster</span>
                <span className="text-[7px] font-black uppercase tracking-[0.4em] text-white/30 -mt-1 pl-0.5">Scientific OS v2.5</span>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-2">
              <Link to="/" className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />
                WORKSPACE
              </Link>
              <Link to="/profile" className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all flex items-center gap-2">
                <User className="w-4 h-4" />
                MI PERFIL
              </Link>
              {isAdmin && (
                <Link to="/users" className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  RED DE USUARIOS
                </Link>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {user && (
              <div className="flex items-center gap-6 text-white">
                <Link to="/profile" className="flex items-center gap-4 px-4 py-2 hover:bg-white/10 rounded-[1.25rem] border border-white/5 transition-colors bg-white/5">
                   <div className="hidden sm:flex flex-col items-end">
                      <span className="text-[11px] font-bold tracking-tight">{user.displayName}</span>
                      <span className="text-[9px] text-white/40 font-medium tracking-tight truncate max-w-[120px] uppercase">{user.role}</span>
                   </div>
                   <div className="w-9 h-9 rounded-[0.8rem] bg-brand-blue/20 border border-brand-blue/30 flex items-center justify-center text-brand-blue font-bold">
                      {user.displayName?.[0] || "?"}
                   </div>
                </Link>

                <div className="h-6 w-px bg-white/10" />
                <button 
                  onClick={logout}
                  className="p-2.5 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10 group bg-transparent"
                  title="Finalizar Sesión"
                >
                  <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-12 px-6 sm:px-10 relative z-10">
        {children}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout><DashboardPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/project/:id" element={
            <ProtectedRoute>
              <Layout><ProjectPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute requireAdmin>
              <Layout><DashboardPage initialTab="users" /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout><ProfilePage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
