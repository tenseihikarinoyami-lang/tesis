import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  Save, 
  Wand2, 
  Settings2, 
  History, 
  FileText, 
  Database, 
  BookMarked,
  Layout,
  Send,
  Loader2,
  Trash2,
  Plus,
  Download,
  Share2,
  Rocket
} from "lucide-react";
import { projectService } from "../services/projectService";
import { useAuth } from "../contexts/AuthContext";
import { generateContent, orchestrateThesis } from "../services/aiService";
import { ThesisProject, ThesisChunk, AIProvider, CitationMetadata, ProjectGenerationStatus } from "../types";
import { cn } from "../lib/utils";
import { exportToMarkdown, downloadFile, exportToBibTeX, generateWordDoc } from "../lib/exportUtils";
import { saveAs } from "file-saver";
import ReactMarkdown from "react-markdown";
import ModelStatus from "../components/editor/ModelStatus";
import CitationManager from "../components/editor/CitationManager";
import { motion, AnimatePresence } from "motion/react";
import { THESIS_CHAPTERS } from "../types";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [project, setProject] = useState<ThesisProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [generationMsg, setGenerationMsg] = useState("");
  const [activeChapter, setActiveChapter] = useState(THESIS_CHAPTERS[0]);
  const [status, setStatus] = useState<"idle" | "generating" | "error">("idle");
  const [activeProvider, setActiveProvider] = useState<AIProvider | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanel, setRightPanel] = useState<"research" | "config" | "none">("research");

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
    if (user && id) loadProject();
  }, [id, user, authLoading, navigate]);

  const loadProject = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const p = await projectService.getProject(id);
      if (p) {
        setProject(p);
        if (p.chunks.length === 0) {
          const initialChunks = THESIS_CHAPTERS.map(ch => ({
            id: Math.random().toString(36).substring(2, 11),
            chapter: ch,
            title: ch,
            content: "",
            status: "draft" as const,
            updatedAt: new Date().toISOString()
          }));
          const updated = { ...p, chunks: initialChunks };
          setProject(updated);
          // Don't save all at once to avoid quota, but usually needed
          for (const ch of initialChunks) {
            await projectService.saveChunk(p.id, ch);
          }
        }
      } else {
        navigate("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  const activeChunk = project?.chunks.find(c => c.chapter === activeChapter);

  const handleUpdateContent = async (content: string) => {
    if (!project || !activeChunk) return;
    const newChunks = project.chunks.map(c => 
      c.chapter === activeChapter ? { ...c, content, updatedAt: new Date().toISOString() } : c
    );
    const updatedChunk = newChunks.find(c => c.chapter === activeChapter)!;
    setProject({ ...project, chunks: newChunks });
    await projectService.saveChunk(project.id, updatedChunk);
  };

  const handleGenerate = async () => {
    if (!project || !activeChunk) return;
    setStatus("generating");
    
    const prompt = `Escribe la sección de "${activeChapter}" para mi tesis titulada "${project.title}". 
Objetivo: ${project.description}
Hipótesis: ${project.hypothesis}
Citas validadas para usar: ${project.validatedCitations.map(c => `${c.authors[0]} (${c.year}) - ${c.title}`).join("; ")}

Instrucciones: Se profesional, usa un tono académico riguroso pero humano (que parezca escrito por un estudiante brillante).`;

    try {
      const result = await generateContent(prompt, { 
        section: activeChapter,
        context: `Título: ${project.title}. Descripción: ${project.description}. Hipótesis: ${project.hypothesis}`
      });
      setActiveProvider(result.provider);
      await handleUpdateContent(result.content);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
    }
  };

  const handleAddCitation = async (citation: CitationMetadata) => {
    if (!project) return;
    if (project.validatedCitations.some(c => c.doi === citation.doi)) return;
    const updated = { ...project, validatedCitations: [...project.validatedCitations, citation] };
    setProject(updated);
    await projectService.saveCitation(project.id, citation);
  };

  const startAutomatedThesis = async () => {
    console.log("startAutomatedThesis triggered - Bypassing confirm");
    if (!project) {
      console.error("No project found in state");
      return;
    }
    
    console.log("Starting automated orchestration for project:", project.id);
    setStatus("generating");
    setGenerationMsg("Preparando entorno de investigación...");
    
    try {
      // Force initial status update in UI
      setProject(prev => prev ? ({ ...prev, generationStatus: ProjectGenerationStatus.PLANNING }) : null);

      await orchestrateThesis(project, async (status, msg, updatedP) => {
        console.log(`Orchestration Progress: [${status}] ${msg}`);
        setGenerationMsg(msg);
        setProject({ ...updatedP });
        
        // Persist metadata and chunks as they come
        try {
          await projectService.saveProject(updatedP);
          for (const chunk of updatedP.chunks) {
            if (chunk.status === "generated") {
              await projectService.saveChunk(updatedP.id, chunk);
            }
          }
        } catch (saveError) {
          console.error("Error saving progress:", saveError);
        }

        if (status === ProjectGenerationStatus.COMPLETED || status === ProjectGenerationStatus.ERROR) {
          setStatus("idle");
        }
      });
    } catch (err) {
      console.error("Critical orchestration error:", err);
      setStatus("error");
      setGenerationMsg("Error fatal en el núcleo de redacción.");
    }
  };

  if (authLoading || loading) return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!project) return null;

  const isGenerating = status === "generating" || 
    (project.generationStatus === ProjectGenerationStatus.PLANNING || 
     project.generationStatus === ProjectGenerationStatus.RESEARCHING || 
     project.generationStatus === ProjectGenerationStatus.WRITING || 
     project.generationStatus === ProjectGenerationStatus.FINALIZING);

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-black selection:bg-accent selection:text-black">
      {/* Sidebar - Chapter Navigation */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 0, opacity: sidebarOpen ? 1 : 0 }}
        className="bg-black/50 border-r border-white/5 flex flex-col z-20 backdrop-blur-xl"
      >
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Protocolos de Estructura</h2>
          <Layout className="h-4 w-4 text-accent/50" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {THESIS_CHAPTERS.map((ch) => (
            <button
              key={ch}
              onClick={() => setActiveChapter(ch)}
              className={cn(
                "w-full text-left px-5 py-3.5 rounded-2xl text-xs transition-all flex items-center justify-between group border border-transparent",
                activeChapter === ch 
                  ? "bg-white text-black font-black uppercase tracking-widest shadow-[0_0_20px_rgba(255,255,255,0.1)]" 
                  : "hover:bg-white/5 text-muted-foreground hover:text-white"
              )}
            >
              <span className="truncate italic">{ch}</span>
              {project.chunks.find(c => c.chapter === ch)?.content.length ? (
                <div className={cn("h-1.5 w-1.5 rounded-full bg-accent animate-pulse", activeChapter === ch && "bg-black")} />
              ) : null}
            </button>
          ))}
        </div>
        <div className="p-6 border-t border-white/5">
           <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-accent transition-colors group">
             <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Retornar
           </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative bg-black lg:rounded-tl-[3.5rem] border-l border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-10 overflow-hidden">
        {/* Header toolbar */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-6">
             <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-3 hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10">
               <Layout className="h-5 w-5 text-white/50" />
             </button>
             <div>
               <h1 className="text-xl font-black italic uppercase tracking-tight text-white leading-none">{activeChapter}</h1>
               <div className="mt-1 flex items-center gap-4">
                 <ModelStatus provider={activeProvider} status={status} />
                 {generationMsg && (
                   <span className="text-[10px] font-mono text-accent animate-pulse uppercase tracking-widest">
                     [{project.generationStatus}] {" >> "} {generationMsg}
                   </span>
                 )}
               </div>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center glass p-1 rounded-2xl mr-4">
               <button 
                 onClick={async () => {
                   try {
                     const blob = await generateWordDoc(project);
                     saveAs(blob, `${project.title}.docx`);
                   } catch (err) {
                     console.error("Error generating word doc:", err);
                     alert("Error al generar el documento Word");
                   }
                 }}
                 className="p-3 text-blue-400 hover:text-white hover:bg-blue-400/10 rounded-xl transition-all"
                 title="Descargar Microsoft Word (.docx)"
               >
                 <FileText className="h-5 w-5" />
               </button>
               <button 
                 onClick={() => {
                   const md = exportToMarkdown(project);
                   downloadFile(md, `${project.title}.md`, "text/markdown");
                 }}
                 className="p-3 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                 title="Exportar Markdown"
               >
                 <Download className="h-5 w-5" />
               </button>
               <button 
                 onClick={() => {
                   const bib = exportToBibTeX(project);
                   downloadFile(bib, `references.bib`, "text/plain");
                 }}
                 className="p-3 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                 title="Exportar Referencias"
               >
                 <Share2 className="h-5 w-5" />
               </button>
             </div>

             <button 
               onClick={handleGenerate}
               disabled={isGenerating}
               className="group relative"
             >
               <div className="absolute inset-0 bg-accent blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
               <div className="relative bg-white text-black px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-3 hover:bg-accent transition-all active:scale-95 disabled:opacity-50">
                 {status === "generating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 group-hover:rotate-12 transition-transform" />}
                 Ejecutar SECCIÓN
               </div>
             </button>

             <button 
               onClick={startAutomatedThesis}
               disabled={isGenerating}
               className="group relative"
             >
               <div className="absolute inset-0 bg-blue-500 blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
               <div className="relative bg-blue-600 text-white px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-3 hover:bg-blue-400 transition-all active:scale-95 disabled:opacity-50">
                 {status === "generating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4 animate-bounce" />}
                 MODO AUTÓMATA (TESIS COMPLETA)
               </div>
             </button>
          </div>
        </header>

        {/* Editor vs Preview Split */}
        <div className="flex-1 overflow-hidden flex">
          {/* Editor Input */}
          <div className="w-1/2 flex flex-col border-r border-white/5 bg-black/40">
            <div className="px-10 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent flex items-center gap-2">
                 <FileText className="h-3 w-3" /> Raw Markdown Terminal
               </span>
               <span className="text-[10px] text-muted-foreground font-mono bg-white/5 px-3 py-1 rounded-full">
                 WORDS_COUNT: {activeChunk?.content.split(/\s+/).filter(s => s).length || 0}
               </span>
            </div>
            <textarea
              className="flex-1 px-10 py-8 outline-none resize-none font-mono text-base leading-relaxed bg-black/20 text-accent/80 selection:bg-accent selection:text-black placeholder:text-white/5"
              placeholder="// Inicie la transcripción académica aquí o ejecute la IA..."
              value={activeChunk?.content || ""}
              onChange={(e) => handleUpdateContent(e.target.value)}
            />
          </div>

          {/* Rendered Preview */}
          <div className="w-1/2 flex flex-col bg-slate-900/10">
            <div className="px-10 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 flex items-center gap-2">
                 <History className="h-3 w-3" /> Output Académico Refinado
               </span>
               <div className="flex gap-1">
                 {[1,2,3].map(i => <div key={i} className="h-1.5 w-1.5 rounded-full bg-white/10" />)}
               </div>
            </div>
            <div className="flex-1 p-12 overflow-y-auto prose prose-invert max-w-none prose-headings:font-serif prose-headings:italic prose-headings:tracking-tighter prose-p:serif prose-p:italic prose-p:text-lg prose-p:leading-relaxed prose-p:text-white/90">
               {activeChunk?.content ? (
                 <div className="markdown-body">
                   <ReactMarkdown>{activeChunk.content}</ReactMarkdown>
                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-center opacity-10 italic serif grayscale pointer-events-none">
                   <BookMarked className="h-32 w-32 mb-8" />
                   <p className="text-xl">Esperando flujo de datos...</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      </main>

      {/* Right Panel - Research & Context */}
      <motion.aside
        initial={false}
        animate={{ width: rightPanel !== "none" ? 380 : 0, opacity: rightPanel !== "none" ? 1 : 0 }}
        className="bg-black/50 border-l border-white/5 z-20 flex flex-col backdrop-blur-3xl"
      >
        <div className="flex border-b border-white/5 bg-white/5">
           <button 
             onClick={() => setRightPanel("research")}
             className={cn("flex-1 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all", rightPanel === "research" ? "text-accent border-b border-accent" : "text-white/20 hover:text-white/40")}
           >
             Fuentes
           </button>
           <button 
             onClick={() => setRightPanel("config")}
             className={cn("flex-1 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all", rightPanel === "config" ? "text-accent border-b border-accent" : "text-white/20 hover:text-white/40")}
           >
             Núcleo
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {rightPanel === "research" && (
              <motion.div
                key="research"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <CitationManager 
                  onAddCitation={handleAddCitation} 
                  existingCitations={project.validatedCitations} 
                />
              </motion.div>
            )}
            {rightPanel === "config" && (
              <motion.div
                key="config"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="space-y-6">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-accent flex items-center gap-2">
                     <Database className="h-4 w-4" /> Hypothesys_Core
                   </h3>
                   <div className="p-8 glass rounded-[2rem] space-y-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block">Script de Hipótesis</label>
                        <textarea 
                          value={project.hypothesis}
                          onChange={(e) => {
                            const updated = { ...project, hypothesis: e.target.value };
                            setProject(updated);
                            projectService.saveProject(updated);
                          }}
                          className="w-full text-xs p-4 rounded-xl bg-white/5 border border-white/10 text-white font-mono focus:ring-1 focus:ring-accent transition-all h-32 resize-none placeholder:text-white/5" 
                          placeholder="Protocolo de investigación..."
                        />
                      </div>
                      <div className="space-y-4">
                        <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block">Vectores de Búsqueda</label>
                        <div className="flex flex-wrap gap-2">
                          {project.variables.map((v, i) => (
                             <span key={i} className="px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg text-[10px] flex items-center gap-2 font-mono text-accent">
                               {v} <button onClick={() => {
                                 const updated = { ...project, variables: project.variables.filter((_, idx) => idx !== i) };
                                 setProject(updated);
                                 projectService.saveProject(updated);
                               }} className="hover:text-white"><Trash2 className="h-3 w-3" /></button>
                             </span>
                          ))}
                          <button 
                            onClick={() => {
                              const v = prompt("Añadir variable:");
                              if (v) {
                                const updated = { ...project, variables: [...project.variables, v] };
                                setProject(updated);
                                projectService.saveProject(updated);
                              }
                            }}
                            className="h-8 w-8 bg-white text-black rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
                          >
                             <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      {/* Floating Toggle for Right Panel */}
      {rightPanel === "none" && (
        <button 
          onClick={() => setRightPanel("research")}
          className="fixed right-10 bottom-10 p-5 bg-white text-black rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-110 active:scale-95 transition-all z-50 group"
        >
          <Settings2 className="h-7 w-7 group-hover:rotate-90 transition-transform" />
        </button>
      )}
    </div>
  );
}
