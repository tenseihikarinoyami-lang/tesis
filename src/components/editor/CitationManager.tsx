import { useState } from "react";
import { Search, Link as LinkIcon, CheckCircle2, Loader2, Quote, ExternalLink } from "lucide-react";
import { searchPapers, validateDoi } from "../../services/researchService";
import { ResearchPaper, CitationMetadata } from "../../types";
import { cn } from "../../lib/utils";

export default function CitationManager({ 
  onAddCitation, 
  existingCitations 
}: { 
  onAddCitation: (c: CitationMetadata) => void,
  existingCitations: CitationMetadata[]
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResearchPaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [doiInput, setDoiInput] = useState("");
  const [validating, setValidating] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    try {
      const papers = await searchPapers(query);
      setResults(papers);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateDoi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doiInput) return;
    setValidating(true);
    try {
      const result = await validateDoi(doiInput);
      if (result.valid && result.metadata) {
        onAddCitation(result.metadata);
        setDoiInput("");
        alert("Cita validada y añadida!");
      } else {
        alert("DOI no encontrado o inválido.");
      }
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] mb-6 flex items-center gap-2 text-accent">
          <Search className="h-4 w-4" /> Semantic Scholar Sync
        </h3>
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar vectores de investigación..."
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs focus:ring-1 focus:ring-accent outline-none text-white placeholder:text-white/10"
          />
          <button 
            disabled={loading}
            className="p-3 bg-white text-black rounded-xl hover:bg-accent disabled:opacity-50 transition-all active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </button>
        </form>

        <div className="space-y-4 max-h-80 overflow-y-auto pr-3 custom-scrollbar">
          {results.map(paper => (
            <div key={paper.paperId} className="p-6 glass rounded-2xl hover:bg-white/5 transition-all text-left group">
              <h4 className="text-xs font-black italic mb-2 leading-tight uppercase group-hover:text-accent transition-colors">{paper.title}</h4>
              <p className="text-[9px] text-muted-foreground mb-4 italic serif">
                {paper.authors.map(a => a.name).join(", ")} ({paper.year})
              </p>
              <div className="flex justify-between items-center">
                <a href={paper.url} target="_blank" rel="noreferrer" className="text-[9px] text-blue-400 flex items-center gap-1.5 hover:underline font-mono uppercase tracking-widest">
                  ACCESS_NODE <ExternalLink className="h-3 w-3" />
                </a>
                <button 
                  onClick={() => onAddCitation({
                    title: paper.title,
                    authors: paper.authors.map(a => a.name),
                    year: paper.year,
                    doi: paper.paperId,
                    url: paper.url
                  })}
                  className="text-[9px] font-black bg-white/10 px-3 py-1.5 rounded-lg hover:bg-accent hover:text-black transition-all uppercase tracking-widest"
                >
                  PUSH
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-10 border-t border-white/5">
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] mb-6 flex items-center gap-2 text-blue-400">
          <LinkIcon className="h-4 w-4" /> Protocolo DOI
        </h3>
        <form onSubmit={handleValidateDoi} className="flex gap-2">
          <input
            type="text"
            value={doiInput}
            onChange={(e) => setDoiInput(e.target.value)}
            placeholder="IDENTIFICADOR (10.XXXX/XXXX)"
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs focus:ring-1 focus:ring-blue-400 outline-none font-mono text-blue-400 placeholder:text-white/5 uppercase"
          />
          <button 
            disabled={validating}
            className="p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-400 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]"
          >
            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Quote className="h-4 w-4" />}
          </button>
        </form>
      </div>

      <div className="pt-10 border-t border-white/5">
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mb-6 italic">Bibliografía Validada ({existingCitations.length})</h3>
        <div className="space-y-4">
          {existingCitations.length === 0 && <p className="text-[10px] text-white/10 italic serif">Sin registros activos.</p>}
          {existingCitations.map((c, i) => (
            <div key={i} className="flex items-start gap-3 text-[10px] glass p-4 rounded-xl border border-white/5">
              <CheckCircle2 className="h-3 w-3 text-accent mt-0.5 flex-shrink-0" />
              <p className="leading-relaxed opacity-80 serif italic">
                <span className="font-bold text-white not-italic uppercase tracking-widest text-[9px]">{c.authors[0]} ({c.year}).</span> {c.title}. <span className="font-mono text-muted-foreground text-[8px] uppercase">DOI:{c.doi}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
