import { ThesisProject, AIProvider, ProjectGenerationStatus } from "../types";
import { projectService } from "./projectService";

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
  const currentProject = { ...project };
  try {
    currentProject.generationStatus = ProjectGenerationStatus.PLANNING;
    onUpdate(ProjectGenerationStatus.PLANNING, "Planificando la redacción de los capítulos académicos...", currentProject);
    await projectService.updateProject(project.id, { generationStatus: ProjectGenerationStatus.PLANNING });

    const updatedChunks = currentProject.chunks.map(c => ({ ...c }));
    const totalChapters = updatedChunks.length;

    for (let i = 0; i < totalChapters; i++) {
      const chunk = updatedChunks[i];
      if (chunk.status === "completed") continue;

      // Update current chunk to generating
      chunk.status = "generating";
      currentProject.generationStatus = ProjectGenerationStatus.WRITING;
      currentProject.chunks = updatedChunks;
      
      onUpdate(
        ProjectGenerationStatus.WRITING, 
        `Redactando capítulo: "${chunk.chapter}"... Esto puede tomar de 1 a 2 minutos.`, 
        currentProject
      );
      
      await projectService.updateProject(project.id, { 
        generationStatus: ProjectGenerationStatus.WRITING,
        chunks: updatedChunks
      });

      // Generate content via the API proxy (which only does model calls and requires no database permissions)
      const prompt = `Actúa como un experto en metodología de la universidad ${project.university}. Redacta el capítulo "${chunk.chapter}" para la tesis "${project.title}". Usa estilo ${project.citationStyle || "APA"}. Mínimo 1000 palabras de alta calidad académica.`;
      
      const response = await generateContent(prompt, { section: chunk.chapter });
      
      // Complete chunk
      chunk.content = response.content;
      chunk.status = "completed";
      currentProject.chunks = updatedChunks;

      onUpdate(
        ProjectGenerationStatus.WRITING, 
        `Guardando capítulo completado: "${chunk.chapter}"...`, 
        currentProject
      );

      await projectService.updateProject(project.id, { 
        generationStatus: ProjectGenerationStatus.WRITING,
        chunks: updatedChunks
      });
    }

    currentProject.generationStatus = ProjectGenerationStatus.COMPLETED;
    onUpdate(ProjectGenerationStatus.COMPLETED, "¡Tesis generada exitosamente en su totalidad!", currentProject);
    await projectService.updateProject(project.id, { 
      generationStatus: ProjectGenerationStatus.COMPLETED 
    });

  } catch (error: any) {
    console.error("Orchestration error:", error);
    currentProject.generationStatus = ProjectGenerationStatus.ERROR;
    onUpdate(ProjectGenerationStatus.ERROR, error.message || "Se produjo un error durante la generación automática.", currentProject);
    await projectService.updateProject(project.id, { 
      generationStatus: ProjectGenerationStatus.ERROR 
    });
  }
}
