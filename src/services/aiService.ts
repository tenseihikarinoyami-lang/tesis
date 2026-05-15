import { AIProvider, ProjectGenerationStatus, ThesisProject, ThesisChunk, CitationMetadata, THESIS_CHAPTERS } from "../types";
import { searchPapers } from "./researchService";

export async function generateContent(
  prompt: string,
  options: { section?: string; temperature?: number; context?: string } = {}
): Promise<{ content: string; provider: AIProvider }> {
  
  const systemPrompt = `Eres un asistente de investigación académica experto para universidades venezolanas (IUTA, IUTAR, UPTAEB). 
  
REGLAS CRÍTICAS DE REDACCIÓN:
1. NUNCA uses la primera persona. Usa siempre la tercera persona del impersonal: "Se investigó", "Se concluyó", "Se analizó".
2. Tono formal, objetivo y técnico. Estructura de párrafos: mínima 5 líneas, máxima 12 líneas.
3. Las citas deben seguir el formato (Apellido, Año). 
4. El Resumen debe ser un solo párrafo a bloque, máximo 300 palabras.
5. Contexto: ${options.context || "Sin contexto adicional"}
6. Sección: ${options.section || "General"}`;

  const fullPrompt = `${systemPrompt}\n\nTarea: ${prompt}`;

  try {
    // Try Gemini via Backend
    console.log("Solicitando Gemini al servidor...");
    const geminiRes = await fetch("/api/ai/fallback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: fullPrompt,
        provider: AIProvider.GEMINI,
        options: { temperature: options.temperature }
      }),
    });
    
    if (!geminiRes.ok) throw new Error(`Server error: ${geminiRes.status}`);
    const data = await geminiRes.json();
    if (data.content) return { content: data.content, provider: AIProvider.GEMINI };

    throw new Error("Gemini response empty");
  } catch (error: any) {
    console.warn("Gemini falló, intentando fallback a Groq...", error);
    
    // Fallback to Groq via Backend
    try {
      const groqRes = await fetch("/api/ai/fallback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: fullPrompt,
          provider: AIProvider.GROQ,
          options: { temperature: options.temperature }
        }),
      });
      const data = await groqRes.json();
      if (data.content) return { content: data.content, provider: AIProvider.GROQ };
    } catch (groqError) {
      console.warn("Groq falló, intentando OpenRouter...", groqError);
    }

    // Last resort: OpenRouter via Backend
    try {
      const orRes = await fetch("/api/ai/fallback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: fullPrompt,
          provider: AIProvider.OPENROUTER,
          options: { temperature: options.temperature }
        }),
      });
      const data = await orRes.json();
      if (data.content) return { content: data.content, provider: AIProvider.OPENROUTER };
    } catch (orError) {
      console.error("Todos los proveedores fallaron", orError);
    }

    throw new Error("Error crítico: Todos los servicios de IA están saturados.");
  }
}

export async function orchestrateThesis(
  project: ThesisProject,
  onProgress: (status: ProjectGenerationStatus, step: string, updatedProject: ThesisProject) => Promise<void>
) {
  let currentProject = { ...project };
  console.log("orchestrateThesis started for:", project.id);

  // Stage update helper
  const update = async (status: ProjectGenerationStatus, msg: string) => {
    currentProject = { ...currentProject, generationStatus: status };
    await onProgress(status, msg, currentProject);
  };

  try {
    // 1. PLANNING
    console.log("Orchestration: Phase 1 (Planning)");
    await update(ProjectGenerationStatus.PLANNING, "Estructurando argumentos académicos...");
    
    const planPrompt = `Crea un esquema detallado para cada capítulo de la tesis "${currentProject.title}". 
Objetivo: ${currentProject.description}. 
Sigue las reglas de los manuales venezolanos (IUTA/UPTAEB). 
Describe qué puntos clave debe tocar cada una de las siguientes secciones: ${THESIS_CHAPTERS.join(", ")}.
Responde solo en formato JSON con la estructura: { "chapters": { "NombreCap": "Instrucciones especificas" } }`;

    console.log("Generating plan...");
    const planRes = await generateContent(planPrompt, { temperature: 0.2 });
    const planContext = planRes.content;
    console.log("Plan generated successfully");

    // 2. RESEARCHING
    console.log("Orchestration: Phase 2 (Researching)");
    await update(ProjectGenerationStatus.RESEARCHING, "Sincronizando con bases de datos académicas...");
    
    if (currentProject.validatedCitations.length < 3) {
      try {
        console.log("Searching for papers...");
        const papers = await searchPapers(currentProject.title, 5);
        for (const p of papers.slice(0, 3)) {
          const citation: CitationMetadata = {
            title: p.title,
            authors: p.authors.map(a => a.name),
            year: p.year,
            doi: p.paperId,
            url: p.url
          };
          currentProject.validatedCitations.push(citation);
        }
        console.log(`Found ${currentProject.validatedCitations.length} citations.`);
      } catch (researchError) {
        console.warn("Research failed, continuing with plan anyway:", researchError);
      }
    }

    // 3. WRITING
    console.log("Orchestration: Phase 3 (Writing)");
    await update(ProjectGenerationStatus.WRITING, "Iniciando proceso de redacción masiva...");
    
    // Explicitly exclude 'Resumen' from the main loop as it needs full context to be generated at the end
    for (const chapter of THESIS_CHAPTERS) {
      if (chapter === "Resumen") continue;
      
      console.log(`Working on chapter: ${chapter}`);
      await update(ProjectGenerationStatus.WRITING, `Redactando: ${chapter}...`);
      
      const chapterPrompt = `Redacta el capítulo completo de "${chapter}" siguiendo estrictamente los manuales de metodología IUTA/IUTAR/UPTAEB.
Título de la tesis: ${currentProject.title}
Hipótesis: ${currentProject.hypothesis}
Citations validas: ${currentProject.validatedCitations.map(c => `${c.authors[0]} (${c.year})`).join(", ")}
Plan de estructura: ${planContext}

REGLAS DE ORO:
1. TERCERA PERSONA IMPERSONAL obligatoria (se observó, se analizó).
2. Tono formal y técnico.
3. Párrafos de 5 a 12 líneas.
4. Si es CAP I: Síntomas -> Causas -> Consecuencias.
5. Si es CAP II: Antecedentes (mínimo 5), bases teóricas y legales.
6. Formato Markdown para que yo pueda procesarlo.`;

      const result = await generateContent(chapterPrompt, { 
        section: chapter, 
        context: `Contenido previo generado hasta ahora: ${currentProject.chunks.map(c => c.content.substring(0, 200)).join("\n---\n")}`
      });

      const chunkIdx = currentProject.chunks.findIndex(c => c.chapter === chapter);
      if (chunkIdx > -1) {
        currentProject.chunks[chunkIdx] = {
          ...currentProject.chunks[chunkIdx],
          content: result.content,
          status: "generated",
          updatedAt: new Date().toISOString()
        };
      } else {
        currentProject.chunks.push({
          id: Math.random().toString(36).substring(2, 11),
          chapter,
          title: chapter,
          content: result.content,
          status: "generated",
          updatedAt: new Date().toISOString()
        });
      }
      
      await update(ProjectGenerationStatus.WRITING, `Finalizado: ${chapter}`);
    }

    // 4. FINALIZING
    console.log("Orchestration: Phase 4 (Finalizing)");
    await update(ProjectGenerationStatus.FINALIZING, "Compilando resumen y meta-datos...");
    
    const summaryPrompt = `Genera un resumen ejecutivo de máximo 300 palabras para esta tesis. 
Debe incluir propósito, metodología, resultados y conclusiones. 
Tesis: ${currentProject.title}. 
Contenido: ${currentProject.chunks.map(c => c.content.substring(0, 500)).join("\n")}`;
    
    const summaryRes = await generateContent(summaryPrompt, { section: "Resumen" });
    
    // Save summary to the "Resumen" chunk
    const resumenIdx = currentProject.chunks.findIndex(c => c.chapter === "Resumen");
    if (resumenIdx > -1) {
      currentProject.chunks[resumenIdx] = {
        ...currentProject.chunks[resumenIdx],
        content: summaryRes.content,
        status: "generated",
        updatedAt: new Date().toISOString()
      };
    } else {
      currentProject.chunks.push({
        id: Math.random().toString(36).substring(2, 11),
        chapter: "Resumen",
        title: "Resumen",
        content: summaryRes.content,
        status: "generated",
        updatedAt: new Date().toISOString()
      });
    }
    
    await update(ProjectGenerationStatus.COMPLETED, "Investigación terminada con éxito.");
    console.log("Orchestration completed successfully");

  } catch (error) {
    console.error("Orchestration error:", error);
    await update(ProjectGenerationStatus.ERROR, "Error crítico en el núcleo de redacción.");
    throw error; // Rethrow to let caller know
  }
}

const CHAPTERS_LIST_REMOVED = true; 
