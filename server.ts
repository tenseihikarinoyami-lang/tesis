import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import firebaseConfig from "./firebase-applet-config.json";

dotenv.config();

const app = express();
app.use(express.json());

// Lazy initialization of Gemini client
let genAI: GoogleGenAI | null = null;
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not defined in environment.");
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

// AI Helper with Fallback
async function runAI(prompt: string, temperature = 0.3) {
  const providers = [
    { 
      name: "Gemini", 
      call: async () => {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
        });
        return response.text;
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
      console.error(`AI Provider ${provider.name} failed:`, e.message);
    }
  }
  throw lastError || new Error("All AI providers failed");
}

async function setupApp() {
  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId
    });
  });

  app.post("/api/ai/generate", async (req, res) => {
    const { prompt, temperature = 0.3 } = req.body;
    try {
      const content = await runAI(prompt, temperature);
      res.json({ content });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Serve static assets or use Vite dev middleware
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite not found in dev, falling back to static production mode");
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
  }

  // Catch-all SPA route MUST be declared AFTER Vite middleware / static files handlers
  app.get("*", (req, res) => {
    const distPath = path.join(process.cwd(), "dist");
    res.sendFile(path.join(distPath, "index.html"));
  });

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupApp();

export default app;
