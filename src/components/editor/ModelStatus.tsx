import { AIProvider } from "../../types";
import { Zap, Cpu, Globe } from "lucide-react";
import { cn } from "../../lib/utils";

export default function ModelStatus({ provider, status }: { provider?: AIProvider, status: "idle" | "generating" | "error" }) {
  const getIcon = () => {
    switch (provider) {
      case AIProvider.GEMINI: return <Zap className="h-4 w-4" />;
      case AIProvider.GROQ: return <Cpu className="h-4 w-4" />;
      case AIProvider.OPENROUTER: return <Globe className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getLabel = () => {
    switch (provider) {
      case AIProvider.GEMINI: return "Gemini 2.0 Flash";
      case AIProvider.GROQ: return "LLaMA 3.3 (Groq)";
      case AIProvider.OPENROUTER: return "Qwen 2.5 (OpenRouter)";
      default: return "Auto-Select AI";
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
      status === "generating" ? "bg-accent/20 text-accent animate-pulse border border-accent/20 shadow-[0_0_15px_rgba(34,197,94,0.2)]" : 
      status === "error" ? "bg-red-500/20 text-red-400 border border-red-500/20" :
      "bg-white/5 text-white/40 border border-white/5"
    )}>
      {getIcon()}
      <span>{status === "generating" ? "Sincronizando: " : ""}{getLabel()}</span>
    </div>
  );
}
