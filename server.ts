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
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
  } catch (e) {
    console.error("Error parsing FIREBASE_SERVICE_ACCOUNT:", e);
  }
}

const db = admin.apps.length > 0 ? admin.firestore() : null;
const app = express();
app.use(express.json());

// Lazy initialization of Gemini client
let genAI: GoogleGenAI | null = null;

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not defined.");
  if (!genAI) {
    genAI = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
  }
  return genAI;
}

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
      console.error(`Provider ${provider.name} failed:`, e.message);
    }
  }
  throw lastError || new Error("All AI providers failed");
}

// Routes
app.post("/api/projects/:id/orchestrate", async (req, res) => {
  const { id } = req.params;
  if (!db) return res.status(500).json({ error: "Firestore not initialized" });
  try {
    const projectRef = db.collection("thesis_projects").doc(id);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) return res.status(404).json({ error: "Project not found" });
    orchestrateInBackground(id, projectDoc.data());
    res.json({ status: "started" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function orchestrateInBackground(projectId: string, project: any) {
  if (!db) return;
  const projectRef = db.collection("thesis_projects").doc(projectId);
  try {
    await projectRef.update({ generationStatus: "planning", updatedAt: Date.now() });
    const chapters = project.chunks;
    for (let i = 0; i < chapters.length; i++) {
      const chunk = chapters[i];
      await projectRef.update({ generationStatus: "writing", [`chunks.${i}.status`]: "generating", updatedAt: Date.now() });
      const subSections = getSubsectionsForChapter(chunk.chapter);
      let fullChapterContent = "";
      for (const sub of subSections) {
        const writePrompt = `Crea la sección "${sub}" del "${chunk.chapter}" para: "${project.title}". Univ: ${project.university}. Tono Pro.`;
        const rawDraft = await runAI(writePrompt);
        fullChapterContent += `\n\n## ${sub}\n\n${rawDraft}`;
      }
      await projectRef.update({ [`chunks.${i}.content`]: fullChapterContent, [`chunks.${i}.status`]: "completed", updatedAt: Date.now() });
    }
    await projectRef.update({ generationStatus: "completed", updatedAt: Date.now() });
  } catch (error) {
    await projectRef.update({ generationStatus: "error", updatedAt: Date.now() });
  }
}

function getSubsectionsForChapter(chapter: string): string[] {
  if (chapter.includes("Introducción")) return ["Contextualización", "Objetivos", "Importancia"];
  if (chapter.includes("Capítulo I")) return ["Planteamiento", "Objetivos", "Justificación"];
  if (chapter.includes("Capítulo II")) return ["Antecedentes", "Bases Teóricas"];
  return ["Desarrollo"];
}

app.post("/api/ai/generate", async (req, res) => {
  const { prompt, temperature = 0.3 } = req.body;
  try {
    const content = await runAI(prompt, temperature);
    res.json({ content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Static files
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));

// Dev server middleware
if (process.env.NODE_ENV !== "production") {
  // Use a dynamic import or separate file for dev to avoid top-level await in bundle
  import("vite").then(async ({ createServer: createViteServer }) => {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  });
} else {
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => console.log(`Server on port ${PORT}`));
}

export default app;
