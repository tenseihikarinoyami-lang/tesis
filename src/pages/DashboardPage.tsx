import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Book, Clock, Trash2, ChevronRight, Loader2, LayoutDashboard } from "lucide-react";
import { projectService } from "../services/projectService";
import { useAuth } from "../contexts/AuthContext";
import { ThesisProject } from "../types";
import { cn, formatDate } from "../lib/utils";
import { motion } from "motion/react";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ThesisProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
    if (user) {
      loadProjects();
    }
  }, [user, authLoading, navigate]);

  const loadProjects = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await projectService.getProjects(user.uid);
      setProjects(data);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !user) return;
    try {
      const project = await projectService.createProject(user.uid, newTitle, newDesc);
      console.log("Proyecto creado con éxito:", project);
      setProjects(prev => [project, ...prev]);
      setShowNewModal(false);
      setNewTitle("");
      setNewDesc("");
    } catch (error: any) {
      console.error("Error detallado al crear proyecto:", error);
      alert(`Error al crear el proyecto: ${error.message || "Problema de conexión con la base de datos"}`);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("¿Estás seguro de eliminar este proyecto?")) {
      try {
        await projectService.deleteProject(id);
        setProjects(prev => prev.filter(p => p.id !== id));
      } catch (error) {
        alert("Error al eliminar.");
      }
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-accent">
            <LayoutDashboard className="h-3 w-3" /> Area de Trabajo
          </div>
          <h1 className="text-6xl font-black tracking-tighter uppercase italic text-gradient">Mis <span className="not-italic">Tesis</span></h1>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="group relative"
        >
          <div className="absolute inset-0 bg-accent blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="relative bg-white text-black px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-accent transition-all active:scale-95">
            <Plus className="h-5 w-5" />
            Nuevo Proyecto
          </div>
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {projects.length === 0 ? (
          <div className="col-span-full py-32 text-center glass rounded-[3rem]">
            <Book className="h-16 w-16 text-muted-foreground mx-auto mb-6 opacity-20" />
            <p className="text-muted-foreground italic serif text-xl">Tu terminal está vacía. Inicia una nueva investigación.</p>
          </div>
        ) : (
          projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/project/${project.id}`}
                className="group block p-10 rounded-[3rem] glass hover:bg-white/5 transition-all relative overflow-hidden h-full flex flex-col"
              >
                <div className="flex justify-between items-start mb-10">
                  <div className="bg-white/10 p-4 rounded-2xl group-hover:bg-accent group-hover:text-black transition-colors">
                    <Book className="h-6 w-6" />
                  </div>
                  <button 
                    onClick={(e) => handleDelete(project.id, e)}
                    className="p-3 text-muted-foreground hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
                <h3 className="text-2xl font-black uppercase italic mb-4 tracking-tight group-hover:text-accent transition-colors leading-none">{project.title}</h3>
                <p className="text-muted-foreground text-sm line-clamp-3 mb-10 italic serif flex-grow">{project.description}</p>
                
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground border-t pt-6 border-white/5">
                  <span className="flex items-center gap-1.5 italic">
                    <Clock className="h-3 w-3" /> {formatDate(project.updatedAt)}
                  </span>
                  <span className="flex items-center gap-1.5 text-accent group-hover:translate-x-1 transition-transform">
                    REDACTAR <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>

      {showNewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass rounded-[3rem] p-12 max-w-xl w-full shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-10 opacity-5">
              <Plus className="h-32 w-32" />
            </div>
            <h2 className="text-4xl font-black uppercase italic italic mb-8 tracking-tighter">Nueva <span className="text-accent underline">Arquitectura</span></h2>
            <form onSubmit={handleCreate} className="space-y-8">
              <div className="space-y-4">
                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-accent">Título de la Investigación</label>
                <input
                  autoFocus
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Paradigmas Cuánticos en la Red..."
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-1 focus:ring-accent transition-all font-sans text-lg placeholder:text-white/10"
                />
              </div>
              <div className="space-y-4">
                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-accent">Misión / Resumen</label>
                <textarea
                  rows={4}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Define el alcance de tu tesis..."
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-1 focus:ring-accent transition-all font-sans italic serif text-lg placeholder:text-white/10"
                />
              </div>
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 px-8 py-5 rounded-full border border-white/10 font-bold text-xs uppercase tracking-widest hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-8 py-5 bg-white text-black rounded-full font-black text-xs uppercase tracking-widest hover:bg-accent transition-all"
                >
                  Inicializar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
