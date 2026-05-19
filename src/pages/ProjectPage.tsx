import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { 
  Play, 
  FileText, 
  Save, 
  ChevronLeft, 
  Loader2, 
  BookCheck, 
  Settings, 
  Share2, 
  Clock,
  LayoutGrid,
  FileSearch,
  MessageSquare,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { ThesisProject, ProjectGenerationStatus, THESIS_CHAPTERS } from "../types";
import { orchestrateThesis } from "../services/aiService";
import { projectService } from "../services/projectService";
import { generateWordDoc, downloadFile } from "../lib/exportUtils";
import { saveAs } from "file-saver";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

import { 
  collection, 
  doc, 
  onSnapshot
} from "firebase/firestore";
import { db } from "../lib/firebase";

const ProjectPage: React.FC = () => {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<ThesisProject | null>(state?.project || null);
  const [activeChapter, setActiveChapter] = useState(0);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Realtime Listener
    const unsub = onSnapshot(doc(db, "thesis_projects", id), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as ThesisProject;
        setProject(data);
        
        // Auto-update orchestration local state based on backend status
        if (data.generationStatus === ProjectGenerationStatus.WRITING || 
            data.generationStatus === ProjectGenerationStatus.PLANNING ||
            data.generationStatus === ProjectGenerationStatus.RESEARCHING) {
          setIsOrchestrating(true);
          
          // Show meaningful status messages based on chapters
          const currentChunk = data.chunks.find(c => c.status === "generating");
          if (currentChunk) {
            setStatusMsg(`Generando ${currentChunk.chapter} de forma asíncrona...`);
          } else if (data.generationStatus === ProjectGenerationStatus.PLANNING) {
            setStatusMsg("Servidor planificando estructura de capítulos...");
          }
        } else {
          setIsOrchestrating(false);
          if (data.generationStatus === ProjectGenerationStatus.COMPLETED) {
            setStatusMsg("Generación completada exitosamente.");
          } else if (data.generationStatus === ProjectGenerationStatus.ERROR) {
            setStatusMsg("El servidor encontró un error durante la generación.");
          }
        }
      }
    });

    return () => unsub();
  }, [id]);

  const handleUpdateProject = async (updates: Partial<ThesisProject>) => {
    if (!project) return;
    setIsSaving(true);
    try {
      await projectService.updateProject(project.id, updates);
      // No need to setProject locally, onSnapshot will handle it
    } catch (err) {
      console.error("Error updating project:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const runFullGeneration = async () => {
    if (!project || isOrchestrating) return;
    
    // We don't setIsOrchestrating(true) here because onSnapshot will do it
    // when the backend updates the status
    
    await orchestrateThesis(project, (status, msg) => {
      setStatusMsg(msg);
      // Local state will follow Firestore updates
    });
  };

  if (!project) return (
    <div className="flex flex-col items-center justify-center py-20 opacity-30">
       <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  );

  const activeChunk = project.chunks[activeChapter];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700">
      
      {/* Upper Navigation / Meta */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <button 
            onClick={() => navigate("/")} 
            className="p-2 sm:p-2.5 text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-200 rounded-xl transition-all active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="h-8 sm:h-10 w-[1px] bg-gray-200" />
          <div className="space-y-0.5">
            <h1 className="text-lg sm:text-xl font-display font-bold text-gray-900 line-clamp-1 tracking-tight">{project.title}</h1>
            <div className="flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] uppercase font-black text-gray-400 tracking-widest">
               <span className="hidden sm:inline">Unv. {project.university}</span>
               <span className="sm:hidden">{project.university}</span>
               <div className="w-1 h-1 bg-gray-300 rounded-full" />
               <div className="flex items-center gap-1">
                 <Clock className="w-3 h-3" />
                 <span>Actu. hace poco</span>
               </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto">
           <div className="flex items-center bg-white border border-gray-100 p-1 rounded-xl shadow-sm">
              <button className="p-2 text-gray-400 hover:text-brand-blue rounded-lg transition-all" title="Ver cuadrícula">
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={async () => {
                  const blob = await generateWordDoc(project);
                  saveAs(blob, `${project.title.replace(/\s/g, '_')}.docx`);
                }}
                className="p-2 text-gray-400 hover:text-brand-blue rounded-lg transition-all" title="Exportar a Word"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-400 hover:text-brand-blue rounded-lg transition-all" title="Compartir">
                <Share2 className="w-4 h-4" />
              </button>
           </div>
           
           <button 
            onClick={runFullGeneration}
            disabled={isOrchestrating}
            className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-6 py-3 bg-brand-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-brand-blue/20 hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
           >
             {isOrchestrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
             <span>{isOrchestrating ? "Redactando..." : "Orquestar"}</span>
           </button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        
        {/* Sidebar Structure */}
        <div className="order-2 lg:order-1 lg:col-span-3 space-y-8 lg:sticky lg:top-28">
          <div className="bg-gray-900 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
             <div className="px-6 py-5 bg-white/5 border-b border-white/5 flex items-center justify-between backdrop-blur-md">
                <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">Scientific Structure</span>
                {isOrchestrating && <div className="w-2 h-2 bg-brand-blue rounded-full animate-pulse shadow-[0_0_12px_rgba(59,130,246,0.8)]" />}
             </div>
             <div className="p-3 space-y-1">
                {project.chunks.map((chunk, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveChapter(idx)}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl transition-all text-sm font-medium flex items-center justify-between group group/item relative overflow-hidden",
                      activeChapter === idx 
                        ? "bg-brand-blue text-white shadow-xl shadow-brand-blue/20" 
                        : "hover:bg-white/5 text-white/40 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-4 w-[85%] relative z-10">
                       <span className={cn(
                         "text-[10px] font-mono shrink-0 px-2 py-1 rounded-lg border transition-colors",
                         activeChapter === idx ? "bg-white/20 border-white/20 text-white" : "bg-white/5 border-white/5 text-white/20"
                       )}>
                         {(idx + 1).toString().padStart(2, '0')}
                       </span>
                       <span className="truncate font-display font-medium tracking-tight">{chunk.chapter}</span>
                    </div>
                    {chunk.status === "completed" ? (
                      <CheckCircle2 className={cn("w-4 h-4 relative z-10", activeChapter === idx ? "text-white" : "text-brand-blue/60")} />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-dashed border-white/10 group-hover/item:border-brand-blue transition-colors relative z-10" />
                    )}
                  </button>
                ))}
             </div>
          </div>

          <div className="bg-gradient-to-br from-brand-blue to-brand-indigo rounded-[2.5rem] p-8 text-white space-y-6 relative overflow-hidden shadow-2xl shadow-brand-blue/20">
             <div className="absolute -top-10 -right-10 opacity-20 rotate-12">
                <Sparkles className="w-40 h-40" />
             </div>
             <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xl border border-white/10">
                   <FileSearch className="w-5 h-5" />
                 </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">AI Core Advisor</span>
             </div>
             <div className="relative z-10">
                {statusMsg ? (
                  <motion.p 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-sm text-white font-medium leading-relaxed"
                  >
                    "{statusMsg}"
                  </motion.p>
                ) : (
                  <p className="text-xs text-white/80 leading-relaxed font-medium">
                    Optimización algorítmica activa para el <span className="text-white font-black underline decoration-white/30 underline-offset-4">Capítulo {activeChapter + 1}</span>.
                  </p>
                )}
             </div>
          </div>
        </div>

        {/* Editor Preview */}
        <div className="order-1 lg:order-2 lg:col-span-9">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900 rounded-[2.5rem] sm:rounded-[3.5rem] min-h-[600px] lg:min-h-[1000px] flex flex-col shadow-2xl border border-white/5 relative overflow-hidden"
          >
             {/* Decorative Background Elements */}
             <div className="absolute top-0 right-0 w-[50%] h-[30%] bg-brand-blue blur-[180px] rounded-full opacity-10 pointer-events-none" />
             <div className="absolute bottom-0 left-0 w-[40%] h-[30%] bg-brand-indigo blur-[150px] rounded-full opacity-10 pointer-events-none" />

             {/* Progress bar at the top of the card */}
             <div className="absolute top-0 left-0 w-full h-1 flex bg-white/5 rounded-t-[2.5rem] sm:rounded-t-[3.5rem] overflow-hidden z-30">
                {project.chunks.map((c, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "h-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]",
                      c.status === "completed" ? "bg-brand-blue" : "bg-transparent"
                    )} 
                    style={{ width: `${100 / project.chunks.length}%` }} 
                  />
                ))}
             </div>

             <header className="px-6 sm:px-10 lg:px-16 py-8 sm:py-12 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between sticky top-0 bg-gray-900/80 backdrop-blur-3xl z-40 rounded-t-[2rem] sm:rounded-t-[3.5rem] gap-6">
                <div className="space-y-4">
                   <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-brand-blue uppercase tracking-[0.4em] px-4 py-1.5 bg-brand-blue/10 rounded-full border border-brand-blue/20">NODE-STATE {(activeChapter + 1).toString().padStart(2, '0')}</span>
                      {activeChunk.status === "completed" && <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-[9px] font-black text-green-500 uppercase tracking-widest leading-none">VERIFICADO</div>}
                   </div>
                   <h2 className="text-2xl sm:text-4xl lg:text-5xl font-display font-bold text-white tracking-tighter leading-tight">{activeChunk.chapter}</h2>
                   <div className="flex items-center gap-4 sm:gap-6 text-[9px] sm:text-[10px] text-white/30 uppercase font-black tracking-widest">
                      <span className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-brand-blue" /> {activeChunk.content?.split(" ").length || 0} WORD-TOKENS</span>
                      <div className="w-1.5 h-1.5 bg-white/10 rounded-full" />
                      <span className="flex items-center gap-2"><BookCheck className="w-3.5 h-3.5 text-brand-indigo" /> PROTOCOLO {project.citationStyle}</span>
                   </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-4">
                   {isSaving && <div className="hidden sm:flex items-center gap-2 text-[10px] font-black text-brand-blue animate-pulse"><Loader2 className="w-4 h-4 animate-spin" /> SYNCING</div>}
                   <button 
                    onClick={() => setShowSettings(true)}
                    className="w-12 h-12 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded-2xl transition-all border border-white/5 hover:border-white/10 group bg-white/5 backdrop-blur-xl shadow-inner"
                   >
                      <Settings className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
                   </button>
                   <button className="w-12 h-12 flex items-center justify-center text-white/50 hover:text-green-400 hover:bg-green-400/10 rounded-2xl transition-all border border-white/5 hover:border-green-400/20 group bg-white/5 backdrop-blur-xl shadow-inner">
                      <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                   </button>
                </div>
             </header>

             <article className="p-8 sm:p-12 lg:p-24 max-w-5xl mx-auto w-full selection:bg-brand-blue selection:text-white relative z-10">
                {activeChunk.content ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="markdown-body dark-mode"
                  >
                    <ReactMarkdown>{activeChunk.content}</ReactMarkdown>
                  </motion.div>
                ) : (
                  <div className="h-[600px] flex flex-col items-center justify-center text-center space-y-10 select-none">
                     <div className="relative group">
                        <div className="absolute -inset-8 bg-brand-blue/20 blur-[60px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
                        <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center border border-white/10 backdrop-blur-3xl relative z-10 shadow-2xl">
                           <MessageSquare className="w-12 h-12 text-white/20 stroke-[1px] group-hover:text-brand-blue transition-colors duration-700" />
                        </div>
                        <div className="absolute -top-4 -right-4 w-12 h-12 bg-brand-blue rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-white/20 animate-float relative z-20">
                           <Sparkles className="w-6 h-6 text-white" />
                        </div>
                     </div>
                     <div className="space-y-6 max-w-sm relative z-10">
                       <p className="text-3xl italic font-serif text-white/20 tracking-tighter leading-tight group-hover:text-white/40 transition-colors">"La arquitectura del conocimiento comienza en el vacío."</p>
                       <div className="inline-flex items-center gap-3 px-6 py-2 bg-white/5 border border-white/5 rounded-full backdrop-blur-md">
                          <div className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-ping" />
                          <p className="text-[9px] uppercase tracking-[0.4em] font-black text-white/40">Base de datos en espera</p>
                       </div>
                     </div>
                     {!isOrchestrating && (
                       <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={runFullGeneration}
                        className="px-12 py-6 bg-white text-gray-900 rounded-3xl font-black text-[10px] tracking-[0.3em] uppercase shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)] hover:bg-brand-blue hover:text-white transition-all relative overflow-hidden group"
                       >
                         <span className="relative z-10">Activar IA Core</span>
                         <div className="absolute inset-0 bg-brand-blue translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                       </motion.button>
                     )}
                  </div>
                )}
             </article>

             {/* Footer with academic sign-off */}
             <footer className="mt-auto px-6 sm:px-10 lg:px-16 py-8 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gray-950/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-brand-blue shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                      <div className="w-[1px] h-4 bg-white/10 mx-2" />
                      <span className="text-[10px] font-black uppercase text-white/30 tracking-[0.4em]">Integrated Scientific OS v2.5</span>
                   </div>
                </div>
                <div className="flex items-center gap-6">
                   <span className="text-[9px] font-bold text-white/20 italic tracking-widest">Protocolo de Red Eléctrica: {project.university} </span>
                   <div className="flex gap-1.5">
                      {[1,2,3].map(i => <div key={i} className="w-1 h-3 bg-white/5 rounded-full" />)}
                   </div>
                </div>
             </footer>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-gray-900 border border-white/10 w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl"
            >
              <div className="px-10 py-10 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">Parámetros de Investigación</h3>
                  <p className="text-white/40 text-xs uppercase tracking-widest mt-1 font-black">Configuración avanzada de la IA</p>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                >
                  <ChevronLeft className="w-5 h-5 rotate-180" />
                </button>
              </div>

              <div className="p-10 space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-brand-blue uppercase tracking-[0.3em]">Mimetismo de Estilo (Tu Voz)</label>
                  <textarea 
                    placeholder="Pega aquí un fragmento de texto redactado por ti para que la IA aprenda tu estilo, vocabulario y tono..."
                    className="w-full h-32 bg-white/5 border border-white/10 rounded-3xl p-5 text-white/80 text-sm focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all resize-none"
                    value={project.userVoice || ""}
                    onChange={(e) => handleUpdateProject({ userVoice: e.target.value })}
                  />
                  <p className="text-[10px] text-white/30 italic">La IA analizará este texto para evitar sonar robótica.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-brand-blue uppercase tracking-[0.3em]">Protocolo de Citación</label>
                      <select 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white/80 text-sm outline-none focus:border-brand-blue"
                        value={project.citationStyle}
                        onChange={(e) => handleUpdateProject({ citationStyle: e.target.value as any })}
                      >
                         <option value="APA">APA 7ma Edición</option>
                         <option value="Vancouver">Vancouver</option>
                      </select>
                   </div>
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-brand-blue uppercase tracking-[0.3em]">Meta-Manual de Univ.</label>
                      <select 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white/80 text-sm outline-none focus:border-brand-blue"
                        value={project.university}
                        onChange={(e) => handleUpdateProject({ university: e.target.value as any })}
                      >
                         <option value="IUTA">IUTA</option>
                         <option value="IUTAR">IUTAR</option>
                         <option value="UPTAEB">UPTAEB</option>
                      </select>
                   </div>
                </div>
              </div>

              <div className="p-10 bg-white/5 border-t border-white/5 flex justify-end">
                 <button 
                  onClick={() => setShowSettings(false)}
                  className="px-10 py-5 bg-white text-gray-900 rounded-3xl font-black text-[10px] tracking-[0.3em] uppercase hover:bg-brand-blue hover:text-white transition-all shadow-xl shadow-brand-blue/10"
                 >
                   Guardar y Cerrar
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectPage;
