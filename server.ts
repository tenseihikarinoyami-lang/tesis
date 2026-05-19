import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";

dotenv.config();

// Initialize Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin initialized successfully");
  } catch (e) {
    console.error("Error parsing FIREBASE_SERVICE_ACCOUNT:", e);
  }
} else {
  console.warn("FIREBASE_SERVICE_ACCOUNT not found. Backend orchestration will not be able to update Firestore.");
}

const db = admin.apps.length > 0 ? admin.firestore() : null;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Lazy initialization of Gemini client
  let genAI: GoogleGenAI | null = null;

  function getGenAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment.");
    }
    if (!genAI) {
      genAI = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return genAI;
  }

  // Robust internal AI caller with fallback and retries
  async function runAI(prompt: string, temperature = 0.3) {
    const providers = [
      { 
        name: "Gemini", 
        call: async () => {
          const ai = getGenAI();
          const attempt = async () => {
            const response = await ai.models.generateContent({
              model: "gemini-1.5-flash",
              contents: prompt,
              config: { temperature },
            });
            return response.text;
          };
          try {
            return await attempt();
          } catch (e: any) {
            if (e.message.includes("503") || e.message.includes("demand")) {
              await new Promise(r => setTimeout(r, 2000));
              return await attempt();
            }
            throw e;
          }
        }
      },
      {
        name: "Groq",
        call: async () => {
          const apiKey = process.env.GROQ_API_KEY;
          if (!apiKey) throw new Error("GROQ_API_KEY missing");
          const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [{ role: "user", content: prompt }],
              temperature
            })
          });
          if (!resp.ok) throw new Error(`Groq status ${resp.status}`);
          const data: any = await resp.json();
          return data.choices[0].message.content;
        }
      }
    ];

    let lastError = null;
    for (const provider of providers) {
      try {
        const content = await provider.call();
        if (content) return content;
      } catch (e: any) {
        lastError = e;
        console.error(`Provider ${provider.name} failed during background task:`, e.message);
      }
    }
    throw lastError || new Error("All AI providers failed");
  }

  // Backend Orchestration Endpoint
  app.post("/api/projects/:id/orchestrate", async (req, res) => {
    const { id } = req.params;
    
    if (!db) {
      return res.status(500).json({ error: "Firestore not initialized on server" });
    }

    try {
      const projectRef = db.collection("thesis_projects").doc(id);
      const projectDoc = await projectRef.get();
      
      if (!projectDoc.exists) {
        return res.status(404).json({ error: "Project not found" });
      }

      const project = projectDoc.data();
      
      // Start async process (don't await)
      orchestrateInBackground(id, project);

      res.json({ status: "started", message: "Orchestration process initiated in background" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  async function orchestrateInBackground(projectId: string, project: any) {
    if (!db) return;
    const projectRef = db.collection("thesis_projects").doc(projectId);

    try {
      // 1. Update status to planning
      await projectRef.update({ 
        generationStatus: "planning",
        updatedAt: Date.now()
      });

      const chapters = project.chunks;
      
      for (let i = 0; i < chapters.length; i++) {
        const chunk = chapters[i];
        
        // Update status for the frontend
        await projectRef.update({ 
          generationStatus: "writing",
          [`chunks.${i}.status`]: "generating",
          updatedAt: Date.now()
        });

        // Define Sub-sections for Chunking
        const subSections = getSubsectionsForChapter(chunk.chapter, project.university);
        let fullChapterContent = "";

        for (const sub of subSections) {
          // AGENTIC LOOP: Writing -> Review -> Edit
          
          // 1. Writing Agent
          const writePrompt = `Eres un experto académico de la universidad ${project.university}. 
          Redacta la sección "${sub}" del "${chunk.chapter}" para una tesis titulada: "${project.title}".
          Contexto y Alcance: ${project.topic}.
          ${project.userVoice ? `Estilo de voz del autor (respeta este tono): ${project.userVoice}` : ""}
          
          REGLAS:
          - TERCERA PERSONA IMPERSONAL obligatoria.
          - Tono formal, técnico de alto nivel académico.
          - Extensión sugerida para esta sección: 500-800 palabras.
          - Citas en estilo ${project.citationStyle}.
          - Si es Marco Teórico, asegúrate de citar autores reales con propiedad.`;

          const rawDraft = await runAI(writePrompt);

          // 2. Reviewer Agent (Validation)
          const reviewPrompt = `Actúa como un Tutor Académico especializado en metodología ${project.university}. 
          Evalúa rigurosamente el siguiente texto para la sección "${sub}" de la tesis "${project.title}".
          
          TEXTO A REVISAR:
          ${rawDraft}
          
          CRITERIOS DE EVALUACIÓN:
          1. ¿Se usa la tercera persona impersonal en todo momento?
          2. ¿La profundidad técnica es adecuada para un nivel de pregrado/postgrado?
          3. ¿Hay coherencia lógica entre los párrafos?
          4. ¿Las fuentes citadas parecen válidas o son alucinaciones?
          
          RESPONDE CON:
          - "APROBADO" si el texto es impecable.
          - De lo contrario, lista los errores específicos para que el Editor los corrija.`;

          const review = await runAI(reviewPrompt);

          if (review.trim().toUpperCase() === "APROBADO") {
            fullChapterContent += `\n\n## ${sub}\n\n${rawDraft}`;
          } else {
            // 3. Editor Agent (Polishing)
            const editPrompt = `Como editor académico experto, re-escribe y mejora el siguiente texto incorporando TODAS las correcciones del tutor.
            
            TEXTO ORIGINAL:
            ${rawDraft}
            
            CRÍTICA DEL TUTOR:
            ${review}
            
            REGLAS:
            - Devuelve el texto COMPLETO y MEJORADO.
            - Mantén el formato Markdown.
            - Asegura un estilo fluido y profesional.`;

            const editedText = await runAI(editPrompt);
            fullChapterContent += `\n\n## ${sub}\n\n${editedText}`;
          }
        }

        // Special Phase: Bibliography Validation for Chapter II
        if (chunk.chapter.includes("Capítulo II")) {
          const validateSourcesPrompt = `Como bibliotecario académico, extrae y valida las fuentes citadas en el siguiente texto de Marco Teórico.
          Asegúrate de que los autores y años correspondan a obras reales en el área de investigación.
          Si encuentras citas dudosas, cámbialas por fuentes académicas clásicas o reales del tema.
          
          TEXTO:
          ${fullChapterContent}
          
          Devuelve el texto corregido si es necesario, o el mismo texto si las fuentes son sólidas.`;
          
          fullChapterContent = await runAI(validateSourcesPrompt);
        }

        // Final Chapter Polish
        const polishPrompt = `Une y pule el contenido del capítulo "${chunk.chapter}" para que tenga una transición fluida entre secciones.
        No elimines contenido, solo mejora los conectores entre párrafos.
        
        CONTENIDO:
        ${fullChapterContent}
        
        Devuelve el capítulo completo en formato Markdown.`;

        const finalChapter = await runAI(polishPrompt);

        // Save progress for this chapter
        await projectRef.update({
          [`chunks.${i}.content`]: finalChapter,
          [`chunks.${i}.status`]: "completed",
          updatedAt: Date.now()
        });
      }

      // Final Completion
      await projectRef.update({
        generationStatus: "completed",
        updatedAt: Date.now()
      });

    } catch (error: any) {
      console.error("Background Orchestration Error:", error);
      await projectRef.update({
        generationStatus: "error",
        updatedAt: Date.now()
      });
    }
  }

  function getSubsectionsForChapter(chapter: string, university: string): string[] {
    if (chapter.includes("Introducción")) return ["Contextualización", "Objetivos", "Importancia"];
    if (chapter.includes("Capítulo I")) return ["Planteamiento del Problema", "Objetivos de Investigación", "Justificación", "Alcance y Limitaciones"];
    if (chapter.includes("Capítulo II")) return ["Antecedentes de la Investigación", "Bases Teóricas", "Bases Legales", "Definición de Términos Básicos"];
    if (chapter.includes("Capítulo III")) return ["Tipo y Diseño de Investigación", "Población y Muestra", "Técnicas e Instrumentos de Recolección de Datos", "Validez y Confiabilidad"];
    if (chapter.includes("Capítulo IV")) return ["Presentación de Resultados", "Análisis de Datos", "Discusión de Resultados"];
    if (chapter.includes("Capítulo V")) return ["Conclusiones", "Recomendaciones"];
    return ["General"];
  }

  // Keep the generic AI endpoint for smaller tasks if needed
  app.post("/api/ai/generate", async (req, res) => {
    const { prompt, temperature = 0.3 } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });
    try {
      const content = await runAI(prompt, temperature);
      res.json({ content });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  const HOST = "0.0.0.0";

  app.listen(PORT, HOST, () => {
    console.log(`Academic Backend running on http://${HOST}:${PORT}`);
  });
}

startServer();
