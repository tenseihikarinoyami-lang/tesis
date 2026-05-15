import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Zap, BookOpen, Search, Cpu, Globe, Rocket, ChevronRight, GraduationCap } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/utils";

export default function LandingPage() {
  const { login, user } = useAuth();

  return (
    <div className="bg-black text-white selection:bg-accent selection:text-black">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-20 pb-32 overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-accent/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px]" />
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-6">
                <Rocket className="h-3 w-3" /> Redefiniendo el Futuro Académico
              </div>
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.85] mb-8 uppercase italic font-sans text-gradient">
                La Tesis <br />
                <span className="text-accent not-italic">Vanguardista</span>.
              </h1>
              <p className="max-w-md text-lg text-muted-foreground mb-12 leading-relaxed serif italic">
                Arquitectura de IA distribuida para la investigación de alto nivel. 
                Sincronización de modelos Qwen, Llama y Gemini bajo un estándar ético inquebrantable.
              </p>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <button
                  onClick={user ? undefined : login}
                  className="group relative"
                >
                  <Link
                    to={user ? "/dashboard" : "#"}
                    onClick={(e) => !user && e.preventDefault()}
                  >
                    <div className="absolute inset-0 bg-accent blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                    <div className="relative px-10 py-5 bg-white text-black rounded-full font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-accent transition-all active:scale-95">
                      {user ? "Ir a mi Panel" : "Comenzar Investigación"} 
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                </button>
                
                <div className="flex -space-x-3 items-center ml-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-10 w-10 rounded-full border-2 border-black bg-neutral-800 animate-pulse" />
                  ))}
                  <span className="pl-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">+50k Estudiantes</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative lg:block hidden"
            >
              <div className="glass rounded-[3rem] p-4 aspect-square flex flex-col justify-between relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-accent to-blue-500 rounded-[3rem] opacity-20 blur group-hover:opacity-40 transition-opacity" />
                <div className="relative bg-black h-full rounded-[2.5rem] p-10 flex flex-col justify-between overflow-hidden">
                   <div className="flex justify-between items-start">
                     <div className="space-y-2">
                       <div className="h-1 w-12 bg-accent rounded-full" />
                       <div className="h-1 w-8 bg-accent/40 rounded-full" />
                     </div>
                     <Globe className="h-6 w-6 text-white/20" />
                   </div>

                   <div className="space-y-4">
                     <div className="text-4xl font-black italic uppercase tracking-tighter leading-none">
                       Procesando <br />
                       <span className="text-accent underline">Variables</span>
                     </div>
                     <div className="font-mono text-[10px] text-accent/60 opacity-60">
                       [LOG] Gemini-2.0-Flash::Initialized<br />
                       [LOG] Crossref::API_SYNC_COMPLETE<br />
                       [LOG] Qdrant::VECTOR_MEMORY_ACTIVE
                     </div>
                   </div>

                   <div className="flex gap-2">
                     <div className="flex-1 h-32 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
                        <Cpu className="h-10 w-10 text-white/10" />
                     </div>
                     <div className="flex-1 h-32 bg-accent rounded-2xl flex flex-col justify-end p-4">
                        <div className="text-black font-black text-2xl">99%</div>
                        <div className="text-black/60 text-[8px] font-bold uppercase tracking-widest">Coherencia</div>
                     </div>
                   </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features - Bento Grid Style */}
      <section className="py-32 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-20">
            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-accent mb-4">Módulos de Potencia</h2>
            <p className="text-4xl md:text-6xl font-bold tracking-tighter serif italic">Tecnología de punta para <br /> mentes brillantes.</p>
          </div>
          
          <div className="grid md:grid-cols-12 md:grid-rows-2 gap-6 h-[800px] md:h-[600px]">
            <BentoCard 
              className="md:col-span-8 md:row-span-1"
              icon={<ShieldCheck className="h-6 w-6 text-accent" />}
              title="Validador de Citas"
              desc="Blindamos tu tesis contra alucinaciones. Cada DOI es verificado en tiempo real con Crossref."
              tag="Integridad"
            />
            <BentoCard 
              className="md:col-span-4 md:row-span-2 bg-accent text-black"
              icon={<Zap className="h-6 w-6 text-black" />}
              title="Auto-Router 3.0"
              desc="Orquestación automática entre Gemini, Groq y OpenRouter. Si uno falla, el siguiente toma el control sin interrupciones."
              tag="Disponibilidad"
              dark={false}
            />
            <BentoCard 
              className="md:col-span-4 md:row-span-1"
              icon={<Search className="h-6 w-6 text-blue-400" />}
              title="Semantic Discovery"
              desc="Búsqueda profunda en Semantic Scholar para encontrar la literatura más relevante de tu área."
              tag="Research"
            />
            <BentoCard 
              className="md:col-span-4 md:row-span-1"
              icon={<BookOpen className="h-6 w-6 text-purple-400" />}
              title="Memoria Vectorial"
              desc="RAG avanzado que mantiene la coherencia total del proyecto, recordando hipótesis en cada párrafo."
              tag="Inteligencia"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-40 bg-white text-black text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 relative z-10">
          <h2 className="text-5xl md:text-7xl font-black border-b-8 border-black inline-block mb-12 uppercase italic tracking-tighter">
            Escribe tu Futuro.
          </h2>
          <p className="text-xl mb-12 serif italic font-medium leading-relaxed">
            No pierdas meses en el formato y la búsqueda. Concéntrate en la investigación real mientras nosotros gestionamos la orquestación.
          </p>
          <button 
            onClick={user ? undefined : login}
            className="group"
          >
            <Link to={user ? "/dashboard" : "#"} onClick={(e) => !user && e.preventDefault()}
              className="bg-black text-white px-12 py-6 rounded-full font-black text-sm uppercase tracking-widest hover:bg-neutral-800 transition-all flex items-center gap-3 overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-accent translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative group-hover:text-black transition-colors uppercase">Empezar Ahora</span>
              <ChevronRight className="relative h-5 w-5 group-hover:text-black transition-colors" />
            </Link>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/10 opacity-60">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
             <div className="bg-white p-1 rounded-sm">
               <GraduationCap className="h-4 w-4 text-black" />
             </div>
             <span className="text-sm font-black uppercase tracking-widest italic">ThesisForge</span>
          </div>
          <div className="flex gap-12 text-[10px] font-bold uppercase tracking-widest">
            <a href="#" className="hover:text-accent">Protocolo</a>
            <a href="#" className="hover:text-accent">Ética</a>
            <a href="#" className="hover:text-accent">API</a>
          </div>
          <p className="text-[10px] font-mono">© 2026 THESISFORGE_SYSTEM_V.1.0.4</p>
        </div>
      </footer>
    </div>
  );
}

function BentoCard({ icon, title, desc, tag, className, dark = true }: { icon: React.ReactNode, title: string, desc: string, tag: string, className?: string, dark?: boolean }) {
  return (
    <motion.div 
      whileHover={{ scale: 0.99, y: -2 }}
      className={cn(
        "p-10 rounded-[2.5rem] flex flex-col justify-between group transition-all duration-500 overflow-hidden relative",
        dark ? "bg-white/5 border border-white/10 hover:border-accent/40" : "shadow-2xl",
        className
      )}
    >
      <div className="flex justify-between items-start mb-8 relative z-10">
         <div className={cn("text-[10px] font-black uppercase tracking-widest", dark ? "text-accent" : "text-black/40")}>
           {tag}
         </div>
         <div className="p-2 glass rounded-xl">
           {icon}
         </div>
      </div>
      <div className="relative z-10">
        <h3 className="text-2xl font-black uppercase italic mb-3 tracking-tight">{title}</h3>
        <p className={cn("text-xs leading-relaxed serif italic", dark ? "text-muted-foreground" : "text-black/80")}>{desc}</p>
      </div>
      {dark && (
        <div className="absolute bottom-0 right-0 p-4 opacity-0 group-hover:opacity-20 transition-opacity">
          <Globe className="h-20 w-20 text-white" />
        </div>
      )}
    </motion.div>
  );
}
