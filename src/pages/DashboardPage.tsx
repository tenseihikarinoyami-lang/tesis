import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { projectService } from "../services/projectService";
import { useAuth } from "../contexts/AuthContext";
import { ThesisProject, ProjectGenerationStatus, AppUser } from "../types";
import { 
  Plus, 
  Clock, 
  ChevronRight, 
  Search, 
  BookOpen, 
  LayoutGrid, 
  LayoutList,
  Sparkles,
  ArrowUpRight,
  Target,
  History,
  FileSearch,
  Library,
  Loader2,
  Trash2,
  X,
  GraduationCap,
  Users,
  ShieldCheck,
  UserPlus,
  Calendar,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

const EXPIRATION_OPTIONS = [
  { label: "3 días", value: 3 * 24 * 60 * 60 * 1000 },
  { label: "5 días", value: 5 * 24 * 60 * 60 * 1000 },
  { label: "7 días", value: 7 * 24 * 60 * 60 * 1000 },
  { label: "15 días", value: 15 * 24 * 60 * 60 * 1000 },
  { label: "30 días", value: 30 * 24 * 60 * 60 * 1000 },
  { label: "Indefinido", value: 0 },
];

const DashboardPage: React.FC<{ initialTab?: "projects" | "users" }> = ({ initialTab = "projects" }) => {
  const { user, isAdmin, appUser } = useAuth();
  const [projects, setProjects] = useState<ThesisProject[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"projects" | "users">(initialTab);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const [newProject, setNewProject] = useState({
    title: "",
    university: "IUTA" as const,
    hypothesis: ""
  });

  const [newUser, setNewUser] = useState({
    email: "",
    uid: "",
    name: "",
    password: "",
    role: "researcher" as const,
    duration: EXPIRATION_OPTIONS[2].value
  });

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user, activeTab]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      if (activeTab === "projects") {
        const data = await projectService.getAllProjects(user!.uid);
        setProjects(data);
      } else if (activeTab === "users" && isAdmin) {
        const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        setUsers(snapshot.docs.map(doc => doc.data() as AppUser));
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isCreating) return;
    setIsCreating(true);
    try {
      const newP = await projectService.createProject(user.uid, newProject);
      navigate(`/project/${newP.id}`);
    } catch (error) {
      console.error("Error creating project:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.uid || !newUser.email) return;

    const expiresAt = newUser.duration === 0 ? null : Date.now() + newUser.duration;
    
    const userToCreate: AppUser = {
      uid: newUser.uid || `user-${Date.now()}`,
      email: newUser.email,
      displayName: newUser.name || newUser.email.split("@")[0],
      password: newUser.password || "123456", // Default temp password
      role: newUser.role,
      expiresAt,
      createdAt: Date.now(),
      status: "active"
    };

    try {
      await setDoc(doc(db, "users", userToCreate.uid), userToCreate);
      setIsUserModalOpen(false);
      setNewUser({ email: "", uid: "", name: "", password: "", role: "researcher", duration: EXPIRATION_OPTIONS[2].value });
      loadInitialData();
    } catch (error) {
      console.error("Error creating user:", error);
      alert("Error al crear usuario.");
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("¿Estás seguro de eliminar esta investigación?")) return;
    try {
      await projectService.deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
    } catch (err) {
      console.error("Error deleting project:", err);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!confirm("¿Estás seguro de eliminar este acceso?")) return;
    try {
      await deleteDoc(doc(db, "users", uid));
      setUsers(users.filter(u => u.uid !== uid));
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && projects.length === 0 && users.length === 0) return (
    <div className="flex flex-col items-center justify-center py-40 gap-8">
      <div className="relative">
        <div className="w-24 h-24 border-4 border-brand-blue/20 rounded-full" />
        <div className="w-24 h-24 border-4 border-brand-blue border-t-transparent rounded-full animate-spin absolute top-0 left-0 shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
      </div>
      <div className="text-center space-y-2">
        <p className="text-brand-blue font-display font-medium text-xl animate-pulse tracking-[0.2em] uppercase">Sincronizando Core Master</p>
        <p className="text-gray-500 text-xs tracking-widest uppercase opacity-50">Protocolo de Integridad Activo</p>
      </div>
    </div>
  );

  // Time remaining calculation
  const getDaysLeft = () => {
    if (isAdmin || !appUser?.expiresAt) return null;
    const diff = appUser.expiresAt - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const daysLeft = getDaysLeft();

  return (
    <div className="space-y-8 sm:space-y-12 pb-20 px-4 sm:px-8 lg:px-10">
      {/* Premium Notification Bar for Researchers */}
      {!isAdmin && daysLeft !== null && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-4 rounded-3xl border flex items-center justify-between gap-4 shadow-xl shadow-blue-900/5",
            daysLeft < 2 ? "bg-red-50 border-red-100 text-red-700" : "bg-blue-50 border-blue-100 text-blue-700"
          )}
        >
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-bold tracking-tight">
              {daysLeft <= 0 ? "Tu acceso ha expirado." : `Tienes ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'} de acceso restante.`}
            </p>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Protocolo IUTA/IUTAR</div>
        </motion.div>
      )}

      {/* Hero Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-4 py-2 bg-brand-blue/10 border border-brand-blue/20 rounded-2xl w-fit backdrop-blur-md">
             <div className="w-2 h-2 rounded-full bg-brand-blue animate-ping" />
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-blue">
               {isAdmin ? "SISTEMA DE CONTROL ADMINISTRATIVO" : "NÚCLEO DE INVESTIGACIÓN ACTIVO"}
             </span>
          </div>
          
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-display font-bold tracking-tighter text-gray-900 leading-[0.85] filter drop-shadow-xl">
            {activeTab === "projects" ? (
              <>Potenciando tu <br /><span className="font-serif italic text-brand-blue text-glow">descubrimiento.</span></>
            ) : (
              <>Gestión de <br /><span className="font-serif italic text-brand-indigo text-glow">investigadores.</span></>
            )}
          </h1>
          
          <p className="text-gray-500 text-lg sm:text-xl max-w-2xl font-light leading-relaxed text-balance">
            {activeTab === "projects" 
              ? "Herramientas de vanguardia para la orquestación de tesis doctorales, manuscritos científicos y reportes académicos de alto impacto."
              : "Administración centralizada de identidades, privilegios de acceso y protocolos de seguridad para la red de investigación."}
          </p>
        </div>

        {/* Action Buttons & Tab Switcher */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {isAdmin && (
            <div className="flex bg-gray-900/5 backdrop-blur-xl p-1.5 rounded-3xl border border-gray-900/10 w-full sm:w-auto shadow-inner">
              <button 
                onClick={() => setActiveTab("projects")}
                className={cn(
                  "flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all",
                  activeTab === "projects" ? "bg-white text-gray-900 shadow-xl scale-105" : "text-gray-400 hover:text-gray-700"
                )}
              >
                <Library className="w-4 h-4" />
                WORKSPACE
              </button>
              <button 
                onClick={() => setActiveTab("users")}
                className={cn(
                  "flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all",
                  activeTab === "users" ? "bg-white text-brand-indigo shadow-xl scale-105" : "text-gray-400 hover:text-gray-700"
                )}
              >
                <Users className="w-4 h-4" />
                NETWORK
              </button>
            </div>
          )}

          <button 
            onClick={() => activeTab === "projects" ? setIsModalOpen(true) : setIsUserModalOpen(true)}
            className={cn(
              "w-full sm:w-auto flex items-center justify-center gap-4 px-10 py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-2xl group cursor-pointer relative overflow-hidden",
              activeTab === "projects" ? "bg-gray-900 text-white" : "bg-brand-indigo text-white"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            {activeTab === "projects" ? (
              <><Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> Iniciar Investigación</>
            ) : (
              <><UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" /> Habilitar Nodo</>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "projects" ? (
          <motion.div 
            key="projects-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            {/* Stats Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-gray-900 rounded-[3rem] p-10 text-white relative overflow-hidden group shadow-2xl shadow-brand-blue/20 border border-white/5">
                 <div className="absolute -right-20 -top-20">
                    <Target className="w-64 h-64 text-brand-blue/5 group-hover:scale-110 transition-transform duration-[5s]" />
                 </div>
                 <div className="relative z-10 space-y-6">
                    <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center border border-brand-blue/20">
                       <Target className="w-6 h-6 text-brand-blue" />
                    </div>
                    <div>
                      <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] mb-1">Métricas de Investigación</p>
                      <p className="text-7xl font-display font-bold">{projects.length}</p>
                      <p className="text-xs text-brand-blue font-bold tracking-widest mt-4 uppercase opacity-60 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />
                        Nodos Sincronizados
                      </p>
                    </div>
                 </div>
              </div>
              
              <div className="glass-premium rounded-[3rem] p-10 flex flex-col justify-between shadow-premium border-white/40 hover:border-brand-blue/30 transition-all duration-700 group relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                 <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-brand-blue border border-gray-100 group-hover:bg-brand-blue group-hover:text-white transition-all shadow-inner">
                    <Sparkles className="w-7 h-7" />
                 </div>
                 <div className="space-y-4 mt-8 relative z-10">
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Optimización IA Core</p>
                    <p className="text-5xl font-display font-bold text-gray-900 tracking-tighter">98.4<span className="text-lg text-brand-blue ml-1 hover:animate-pulse">%</span></p>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-6 shadow-inner">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "98.4%" }}
                        transition={{ duration: 2, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-brand-blue to-brand-indigo rounded-full shadow-[0_0_10px_rgba(59,130,246,0.3)]" 
                       />
                    </div>
                 </div>
              </div>

              <div className="glass-premium rounded-[3rem] p-10 flex flex-col justify-between shadow-premium border-white/40 hover:border-brand-indigo/30 transition-all duration-700 group relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-br from-brand-indigo/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                 <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-brand-indigo border border-gray-100 group-hover:bg-brand-indigo group-hover:text-white transition-all shadow-inner">
                    <Library className="w-7 h-7" />
                 </div>
                 <div className="space-y-4 mt-8 relative z-10">
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Protocolo Académico</p>
                    <p className="text-5xl font-display font-bold text-gray-900 tracking-tighter">OS <span className="font-serif italic text-brand-indigo">v2.5</span></p>
                    <div className="flex items-center gap-3 mt-4">
                       <div className="flex -space-x-2">
                          {[1,2,3].map(i => (
                            <div key={i} className="w-6 h-6 rounded-lg bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center text-[8px] font-black">{i}</div>
                          ))}
                       </div>
                       <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">Multi-Node Active</span>
                    </div>
                 </div>
              </div>
            </div>

            {/* List Header & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pt-16 border-t border-gray-900/5">
               <div className="flex flex-col sm:flex-row sm:items-center gap-8">
                  <div className="space-y-1">
                    <h3 className="text-3xl font-display font-bold text-gray-900 tracking-tight">Investigaciones en Curso</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">Entorno de alta disponibilidad</p>
                  </div>
                  <div className="flex bg-gray-900/5 p-1 rounded-2xl border border-gray-900/5">
                    <button onClick={() => setViewMode("grid")} className={cn("px-4 py-2 rounded-xl transition-all flex items-center gap-2 font-bold text-[10px]", viewMode === "grid" ? "bg-white shadow-xl text-brand-blue" : "text-gray-400")}>
                      <LayoutGrid className="w-4 h-4" /> GRID
                    </button>
                    <button onClick={() => setViewMode("list")} className={cn("px-4 py-2 rounded-xl transition-all flex items-center gap-2 font-bold text-[10px]", viewMode === "list" ? "bg-white shadow-xl text-brand-blue" : "text-gray-400")}>
                      <LayoutList className="w-4 h-4" /> LIST
                    </button>
                  </div>
               </div>
               <div className="relative w-full md:w-96 group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-brand-blue to-brand-indigo rounded-[1.5rem] blur opacity-0 group-focus-within:opacity-20 transition-opacity" />
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-brand-blue transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Filtrar por arquitectura de título..."
                    className="w-full pl-14 pr-6 py-5 bg-gray-50/50 backdrop-blur-xl border border-gray-100 focus:bg-white focus:border-brand-blue/30 rounded-[1.5rem] outline-none text-sm transition-all shadow-inner relative z-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>
            </div>

            {/* Projects Content */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((p, idx) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05, type: "spring", damping: 15 }}
                    >
                      <Link 
                        to={`/project/${p.id}`}
                        className="block group h-full glass-premium border-white/40 rounded-[2.5rem] p-8 sm:p-10 hover:shadow-[0_40px_80px_-20px_rgba(59,130,246,0.15)] hover:border-brand-blue/30 transition-all duration-700 relative overflow-hidden active:scale-[0.98]"
                      >
                        <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0 z-20">
                          <button 
                            onClick={(e) => handleDeleteProject(e, p.id)}
                            className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="h-full flex flex-col justify-between gap-10">
                           <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                 <div className="w-12 h-12 bg-white/50 rounded-2xl flex items-center justify-center text-brand-blue border border-white group-hover:bg-brand-blue group-hover:text-white transition-all transform group-hover:rotate-6 shadow-sm">
                                    <BookOpen className="w-6 h-6" />
                                 </div>
                                 <span className="text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 bg-gray-50 rounded-full text-gray-400 group-hover:bg-brand-blue/5 group-hover:text-brand-blue transition-colors">
                                   {p.university}
                                 </span>
                              </div>
                              <h4 className="text-2xl font-display font-bold text-gray-900 group-hover:text-brand-blue transition-colors leading-tight tracking-tight line-clamp-3">
                                {p.title}
                              </h4>
                              <p className="text-gray-400 text-sm line-clamp-2 font-medium leading-relaxed opacity-70">
                                {p.hypothesis || "Base de investigación preliminar sin hipótesis definida."}
                              </p>
                           </div>

                           <div className="flex items-center justify-between pt-8 border-t border-gray-100/50">
                              <div className="flex items-center gap-3">
                                 <div className={cn(
                                   "w-2 h-2 rounded-full",
                                   p.generationStatus === ProjectGenerationStatus.COMPLETED ? "bg-green-500 animate-pulse" : "bg-gray-200"
                                 )} />
                                 <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                   {p.generationStatus === ProjectGenerationStatus.COMPLETED ? "FINALIZADO" : "BORRADOR"}
                                 </span>
                              </div>
                              <div className="w-12 h-12 rounded-2xl bg-gray-900/5 flex items-center justify-center group-hover:bg-gray-900 group-hover:text-white transition-all transform group-hover:translate-x-1 group-hover:-translate-y-1 shadow-inner">
                                 <ArrowUpRight className="w-6 h-6" />
                              </div>
                           </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full py-32 text-center border-2 border-dashed border-gray-100 rounded-[4rem]">
                    <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-gray-100 shadow-inner">
                      <FileSearch className="w-12 h-12 text-gray-200" />
                    </div>
                    <h3 className="text-3xl font-serif italic text-gray-900 mb-2">Sin hallazgos</h3>
                    <p className="text-gray-400 font-light italic">Refina tu búsqueda o crea una nueva investigación.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-[3rem] overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-50">
                      <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Investigación</th>
                      <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Institución</th>
                      <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Estatus</th>
                      <th className="px-10 py-6"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 italic">
                    {filteredProjects.map((p) => (
                      <tr key={p.id} onClick={() => navigate(`/project/${p.id}`)} className="group hover:bg-blue-50/30 cursor-pointer transition-colors">
                        <td className="px-10 py-8">
                           <p className="text-lg font-serif font-medium text-gray-900">{p.title}</p>
                           <p className="text-[10px] font-black tracking-widest text-gray-300 uppercase mt-1">ID: {p.id.slice(0, 8)}</p>
                        </td>
                        <td className="px-10 py-8 text-gray-500 font-bold tracking-widest text-xs uppercase">{p.university}</td>
                        <td className="px-10 py-8">
                           <span className={cn(
                             "px-3 py-1 rounded-full text-[10px] font-black tracking-widest border",
                             p.generationStatus === ProjectGenerationStatus.COMPLETED ? "bg-green-50 text-green-700 border-green-100" : "bg-gray-50 text-gray-400 border-gray-100"
                           )}>
                             {p.generationStatus === ProjectGenerationStatus.COMPLETED ? "FINALIZADO" : "PENDIENTE"}
                           </span>
                        </td>
                        <td className="px-10 py-8 text-right pr-14">
                           <ChevronRight className="w-6 h-6 text-gray-200 group-hover:text-blue-600 group-hover:translate-x-2 transition-all inline-block" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="users-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-12"
          >
             {/* Users Stats Bento Grid */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="bg-gray-900 rounded-[3rem] p-10 text-white relative overflow-hidden group shadow-2xl shadow-brand-indigo/20 border border-white/5">
                   <div className="absolute -right-16 -top-16">
                      <Users className="w-56 h-56 text-brand-indigo/5 group-hover:scale-110 transition-transform duration-[5s]" />
                   </div>
                   <div className="relative z-10 space-y-6">
                      <div className="w-12 h-12 bg-brand-indigo/10 rounded-2xl flex items-center justify-center border border-brand-indigo/20">
                         <Users className="w-6 h-6 text-brand-indigo" />
                      </div>
                      <div>
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] mb-1">Red de Identidades</p>
                        <p className="text-7xl font-display font-bold">{users.length}</p>
                        <p className="text-xs text-brand-indigo font-bold tracking-widest mt-4 uppercase opacity-60">Nodos Registrados</p>
                      </div>
                   </div>
                </div>

                <div className="md:col-span-3 glass-premium rounded-[3rem] p-10 flex flex-col sm:flex-row items-center justify-between gap-10 shadow-premium border-white/40 relative overflow-hidden group">
                   <div className="absolute inset-0 bg-gradient-to-br from-brand-indigo/5 to-white/5 pointer-events-none" />
                   <div className="flex-1 space-y-6 relative z-10 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-4">
                         <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-green-500 border border-green-100 shadow-inner group-hover:bg-green-500 group-hover:text-white transition-all transform group-hover:rotate-6">
                            <ShieldCheck className="w-8 h-8" />
                         </div>
                         <div className="space-y-1">
                            <h3 className="text-2xl font-display font-bold text-gray-900 tracking-tight">Estado de Integridad</h3>
                            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full w-fit mx-auto sm:mx-0">
                               <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                               <span className="text-[8px] font-black uppercase tracking-widest text-green-600">Protocolo Activo</span>
                            </div>
                         </div>
                      </div>
                      <p className="text-gray-500 text-sm leading-relaxed max-w-lg font-medium opacity-70">
                        Monitoreo algorítmico y control de accesos centralizado bajo el estándar de seguridad científico v2.5.
                      </p>
                   </div>
                   <div className="h-24 w-px bg-gray-100 hidden lg:block" />
                   <div className="text-center sm:pr-10 relative z-10">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Accesos Activos</p>
                      <p className="text-6xl font-display font-bold text-brand-blue tracking-tighter">
                        {users.filter(u => !u.expiresAt || Date.now() < u.expiresAt).length}
                      </p>
                      <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mt-4">
                         <div 
                          className="h-full bg-brand-blue rounded-full" 
                          style={{ width: `${(users.filter(u => !u.expiresAt || Date.now() < u.expiresAt).length / (users.length || 1)) * 100}%` }} 
                        />
                      </div>
                   </div>
                </div>
             </div>

             <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pt-16 border-t border-gray-900/5">
                <div className="space-y-1">
                  <h3 className="text-3xl font-display font-bold text-gray-900 tracking-tight">Sistema de Identidades</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">Terminal de Bio-Acceso Scientific OS</p>
                </div>
                <div className="relative w-full md:w-96 group">
                   <div className="absolute -inset-1 bg-gradient-to-r from-brand-indigo to-brand-blue rounded-[1.5rem] blur opacity-0 group-focus-within:opacity-20 transition-opacity" />
                   <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-brand-indigo transition-colors" />
                   <input 
                     type="text" 
                     placeholder="Escanear por nombre o identificador..."
                     className="w-full pl-14 pr-6 py-5 bg-gray-50/50 backdrop-blur-xl border border-gray-100 focus:bg-white focus:border-brand-indigo/30 rounded-[1.5rem] outline-none text-sm transition-all shadow-inner relative z-10"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                   />
                </div>
             </div>

             <div className="glass-premium border-white/40 rounded-[3rem] overflow-hidden shadow-2xl relative">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                       <tr className="bg-gray-900/5 border-b border-gray-100">
                          <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Investigador / ID</th>
                          <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Status de Privilegios</th>
                          <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Periodo de Validez</th>
                          <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Timestamp Registro</th>
                          <th className="px-10 py-8"></th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                       {filteredUsers.map((u, idx) => {
                         const isExpired = u.expiresAt && Date.now() > u.expiresAt;
                         return (
                          <motion.tr 
                            key={u.uid} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="group hover:bg-gray-900/[0.02] transition-colors"
                          >
                            <td className="px-10 py-10">
                               <div className="flex items-center gap-6">
                                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-gray-900 font-bold text-xl border border-gray-100 shadow-sm group-hover:bg-brand-indigo group-hover:text-white group-hover:scale-110 transition-all duration-500">
                                     {u.displayName[0]}
                                  </div>
                                  <div className="space-y-1">
                                     <p className="text-xl font-display font-bold text-gray-900 tracking-tight">{u.displayName}</p>
                                     <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.1em] flex items-center gap-2">
                                       <span className="w-1 h-1 rounded-full bg-gray-300" />
                                       {u.email}
                                     </p>
                                     {u.password && (
                                       <p className="text-[8px] text-indigo-400 font-bold uppercase tracking-widest mt-1">
                                          Clave: {u.password}
                                       </p>
                                     )}
                                  </div>
                               </div>
                            </td>
                            <td className="px-10 py-10">
                               <span className={cn(
                                 "px-5 py-2 rounded-full text-[10px] font-black tracking-widest border transition-all",
                                 u.role === "admin" 
                                  ? "bg-brand-indigo/10 text-brand-indigo border-brand-indigo/20 shadow-[0_0_15px_rgba(79,70,229,0.1)]" 
                                  : "bg-brand-blue/10 text-brand-blue border-brand-blue/20"
                               )}>
                                 {u.role === "admin" ? "ROOT ACCESS" : "STUDENT NODE"}
                               </span>
                            </td>
                            <td className="px-10 py-10">
                               <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-3">
                                     <Clock className={cn("w-4 h-4", isExpired ? "text-red-500 animate-pulse" : "text-brand-blue")} />
                                     <span className={cn("text-xs font-bold uppercase tracking-widest", isExpired ? "text-red-600" : "text-gray-900")}>
                                        {u.expiresAt ? new Date(u.expiresAt).toLocaleDateString() : "ETERNAL"}
                                     </span>
                                  </div>
                                  <div className="w-32 h-1 bg-gray-100 rounded-full overflow-hidden">
                                    <div className={cn("h-full rounded-full", isExpired ? "bg-red-500 w-full" : "bg-brand-blue w-2/3")} />
                                  </div>
                               </div>
                            </td>
                            <td className="px-10 py-10">
                               <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">{new Date(u.createdAt).toLocaleDateString()}</p>
                               <p className="text-[8px] text-gray-200 mt-1 uppercase font-bold">V-SYNC-OS</p>
                            </td>
                            <td className="px-10 py-10 text-right pr-14">
                               <button 
                                 onClick={() => handleDeleteUser(u.uid)}
                                 className="w-12 h-12 flex items-center justify-center text-gray-200 hover:text-red-500 hover:bg-red-50 hover:border-red-100 border border-transparent rounded-2xl transition-all opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0"
                               >
                                  <Trash2 className="w-6 h-6" />
                               </button>
                            </td>
                          </motion.tr>
                         );
                       })}
                    </tbody>
                  </table>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal - New Project */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white w-full max-w-3xl rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col"
            >
              <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600" />
              <div className="p-16">
                <div className="flex items-center justify-between mb-12">
                   <div className="flex items-center gap-6">
                     <div className="w-16 h-16 bg-brand-blue rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl shadow-brand-blue/30 transform rotate-3">
                       <Plus className="w-8 h-8" />
                     </div>
                     <div>
                       <h2 className="text-4xl font-display font-bold text-gray-900 tracking-tight leading-tight">Nuevo <span className="font-serif italic text-brand-blue">Manuscrito</span></h2>
                       <p className="text-gray-400 text-sm mt-1 italic font-medium">Diseña el futuro de tu investigación científica.</p>
                     </div>
                   </div>
                   <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all hover:bg-gray-100">
                     <X className="w-6 h-6" />
                   </button>
                </div>

                <form onSubmit={handleCreateProject} className="space-y-10">
                   <div className="space-y-8">
                     <div className="space-y-4">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] pl-4">Título del Trabajo de Grado</label>
                        <textarea 
                          required
                          rows={3}
                          placeholder="Ej: Estrategias de Innovación Tecnológica..."
                          className="w-full px-10 py-8 bg-gray-50/50 border border-gray-100 focus:bg-white focus:border-brand-blue/30 focus:ring-8 ring-brand-blue/5 rounded-[2.5rem] text-3xl font-display font-medium outline-none transition-all placeholder:text-gray-200 resize-none leading-tight shadow-inner"
                          value={newProject.title}
                          onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                        />
                     </div>

                     <div className="space-y-3">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-4">Idea Central / Hipótesis</label>
                         <textarea 
                           required
                           rows={2}
                           placeholder="¿Qué buscas demostrar u optimizar con esta investigación?"
                           className="w-full px-8 py-6 bg-gray-50 border border-gray-100 focus:bg-white focus:border-blue-200 rounded-[2rem] text-base font-medium outline-none transition-all placeholder:text-gray-300 resize-none"
                           value={newProject.hypothesis}
                           onChange={(e) => setNewProject({...newProject, hypothesis: e.target.value})}
                         />
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-3">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-4">Protocolo Regional</label>
                         <select 
                           className="w-full px-8 py-6 bg-gray-50 border border-gray-100 focus:bg-white focus:border-blue-200 rounded-[2rem] outline-none transition-all appearance-none font-bold text-gray-600 text-sm cursor-pointer shadow-sm text-sm"
                           value={newProject.university}
                           onChange={(e) => setNewProject({...newProject, university: e.target.value as any})}
                         >
                           <option value="IUTA">IUTA (Instituto Universitario de Tecnología de Administración)</option>
                           <option value="IUTAR">IUTAR (I.U. de Tecnología Rodolfo Loero Arismendi)</option>
                           <option value="UPTAEB">UPTAEB (U.P. Territorial Andrés Eloy Blanco)</option>
                         </select>
                       </div>
                       <div className="flex items-end">
                         <div className="w-full h-full p-6 bg-blue-50 rounded-[2rem] border border-blue-100 flex items-center justify-center gap-4">
                            <ShieldCheck className="w-6 h-6 text-blue-600" />
                            <div className="flex flex-col">
                               <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest leading-none">NORMATIVA APA 7ma</span>
                               <span className="text-[10px] text-blue-400 mt-1 font-bold">Protocolo validado v2024</span>
                            </div>
                         </div>
                       </div>
                     </div>
                   </div>

                   <button 
                     type="submit"
                     disabled={isCreating}
                     className="w-full py-8 bg-gray-900 text-white rounded-[2.5rem] font-bold hover:bg-black transition-all shadow-2xl shadow-blue-900/10 uppercase tracking-widest text-xs flex items-center justify-center gap-6 disabled:opacity-50"
                   >
                     {isCreating ? <Loader2 className="w-6 h-6 animate-spin text-blue-400" /> : <Library className="w-6 h-6" />}
                     {isCreating ? "Estableciendo parámetros base..." : "INICIAR REDACCIÓN ACADÉMICA"}
                   </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal - New User */}
      <AnimatePresence>
        {isUserModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUserModalOpen(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col"
            >
              <div className="h-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600" />
              <div className="p-16">
                 <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-indigo-500/30 transform -rotate-3">
                          <UserPlus className="w-8 h-8" />
                       </div>
                       <div>
                          <h2 className="text-4xl font-serif font-bold text-gray-900 italic tracking-tight">Habilitar Acceso</h2>
                          <p className="text-gray-400 text-sm mt-1 italic">Otorga credenciales de nivel investigativo.</p>
                       </div>
                    </div>
                    <button onClick={() => setIsUserModalOpen(false)} className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all hover:bg-gray-100">
                       <X className="w-6 h-6" />
                    </button>
                 </div>

                 <form onSubmit={handleAddUser} className="space-y-10">
                    <div className="space-y-8">
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-4">Identificador Único (UID)</label>
                          <div className="relative">
                             <Target className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                             <input 
                              required
                              type="text"
                              placeholder="ID proporcionado por el investigador..."
                              className="w-full pl-16 pr-8 py-6 bg-gray-50 border border-gray-100 focus:bg-white focus:border-indigo-200 focus:ring-8 ring-indigo-50 rounded-[2rem] outline-none transition-all font-mono text-sm"
                              value={newUser.uid}
                              onChange={(e) => setNewUser({...newUser, uid: e.target.value})}
                            />
                          </div>
                          <div className="flex items-start gap-2 pl-4">
                             <AlertCircle className="w-3 h-3 text-indigo-400 mt-0.5" />
                             <p className="text-[10px] text-gray-400 italic font-medium">El usuario debe solicitar su UID desde su perfil antes de ser habilitado.</p>
                          </div>
                       </div>

                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-4">Correo Institucional</label>
                          <input 
                            required
                            type="email"
                            placeholder="investigador@institucion.edu"
                            className="w-full px-8 py-6 bg-gray-50 border border-gray-100 focus:bg-white focus:border-indigo-200 rounded-[2rem] outline-none transition-all text-sm font-medium"
                            value={newUser.email}
                            onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                          />
                       </div>

                       <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-3">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-4">Período de Acceso</label>
                             <select 
                               className="w-full px-8 py-6 bg-gray-50 border border-gray-100 focus:bg-white focus:border-indigo-200 rounded-[2rem] outline-none transition-all appearance-none font-bold text-gray-600 text-sm cursor-pointer shadow-sm"
                               value={newUser.duration}
                               onChange={(e) => setNewUser({...newUser, duration: Number(e.target.value)})}
                             >
                               {EXPIRATION_OPTIONS.map(opt => (
                                 <option key={opt.value} value={opt.value}>{opt.label}</option>
                               ))}
                             </select>
                          </div>
                          <div className="space-y-3">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-4">Privilegios</label>
                             <select 
                               className="w-full px-8 py-6 bg-gray-50 border border-gray-100 focus:bg-white focus:border-indigo-200 rounded-[2rem] outline-none transition-all appearance-none font-bold text-gray-600 text-sm cursor-pointer shadow-sm"
                               value={newUser.role}
                               onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                             >
                               <option value="researcher">Investigador Estándar</option>
                               <option value="admin">Administrador General</option>
                             </select>
                          </div>
                       </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-8 bg-indigo-600 text-white rounded-[2.5rem] font-bold hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-900/10 uppercase tracking-widest text-xs flex items-center justify-center gap-6"
                    >
                      HABILITAR INVESTIGADOR
                    </button>
                 </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardPage;
