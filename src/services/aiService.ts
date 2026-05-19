import { ThesisProject, AIProvider, ProjectGenerationStatus } from "../types";

export interface AIResponse {
  content: string;
  provider: AIProvider;
}

export async function generateContent(
  prompt: string,
  options: { section?: string; temperature?: number; context?: string } = {}
): Promise<AIResponse> {
  
  const systemPrompt = `Eres un asistente de investigación académica experto para universidades venezolanas (IUTA, IUTAR, UPTAEB). 
  
REGLAS CRÍTICAS DE REDACCIÓN:
1. NUNCA uses la primera persona. Usa siempre la tercera persona del impersonal: "Se investigó", "Se concluyó", "Se analizó".
2. Tono formal, objetivo y técnico. Estructura de párrafos: mínima 5 líneas, máxima 12 líneas.
3. Las citas deben seguir el formato (Apellido, Año). 
4. El Resumen debe ser un solo párrafo a bloque, máximo 300 palabras.
5. Contexto: ${options.context || "Sin contexto adicional"}
6. Sección: ${options.section || "General"}`;

  const response = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: `${systemPrompt}\n\nTarea: ${prompt}`,
      temperature: options.temperature || 0.3
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `AI generation failed: ${response.statusText}`);
  }

  const data = await response.json();
  return { content: data.content, provider: data.provider || AIProvider.GEMINI };
}

export async function orchestrateThesis(
  project: ThesisProject,
  onUpdate: (status: ProjectGenerationStatus, message: string, updatedProject: ThesisProject) => void
) {
  try {
    onUpdate(ProjectGenerationStatus.PLANNING, "Iniciando orquestación asíncrona en el servidor...", project);
    
    const response = await fetch(`/api/projects/${project.id}/orchestrate`, {
      method: "POST"
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Falló la conexión con el servidor");
    }

    onUpdate(ProjectGenerationStatus.WRITING, "El servidor está procesando el proyecto. Ya puedes cerrar esta pestaña si lo deseas.", project);
  } catch (error: any) {
    console.error("Orchestration error:", error);
    onUpdate(ProjectGenerationStatus.ERROR, error.message || "Error en el servidor.", project);
  }
}
