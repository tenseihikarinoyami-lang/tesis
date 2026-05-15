import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Groq } from "groq-sdk";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize AI clients lazily
let geminiClient: GoogleGenerativeAI | null = null;
const getGemini = () => {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY not configured");
    geminiClient = new GoogleGenerativeAI(key);
  }
  return geminiClient;
};

// API Fallback for AI
app.post("/api/ai/fallback", async (req, res) => {
  const { prompt, provider, options } = req.body;
  const { maxTokens = 4000, temperature = 0.3 } = options || {};

  try {
    if (provider === "gemini") {
      const client = getGemini();
      const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return res.json({ content: response.text() || "" });
    }

    if (provider === "groq") {
      const groqKey = process.env.GROQ_API_KEY;
      if (!groqKey) throw new Error("GROQ_API_KEY not configured");
      
      const groq = new Groq({ apiKey: groqKey });
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature: temperature,
      });
      return res.json({ content: completion.choices[0]?.message?.content || "" });
    }

    if (provider === "openrouter") {
      const orKey = process.env.OPENROUTER_API_KEY;
      if (!orKey) throw new Error("OPENROUTER_API_KEY not configured");

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${orKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen/qwen-2.5-72b-instruct",
          messages: [{ role: "user", content: prompt }],
          max_tokens: maxTokens,
          temperature: temperature,
        }),
      });
      const data = await response.json();
      return res.json({ content: data.choices?.[0]?.message?.content || "" });
    }

    res.status(400).json({ error: "Unsupported provider" });
  } catch (error: any) {
    console.error("AI Fallback Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Citation Validation Proxy
app.get("/api/research/validate", async (req, res) => {
  const { doi } = req.query;
  if (!doi) return res.status(400).json({ error: "DOI required" });

  try {
    const response = await fetch(`https://api.crossref.org/works/${doi}`, {
      headers: { "User-Agent": "ThesisForge/1.0 (mailto:admin@thesisforge.ai)" },
    });
    
    if (!response.ok) return res.json({ valid: false });
    
    const data = await response.json();
    const item = data.message;
    
    res.json({
      valid: true,
      metadata: {
        title: item.title?.[0],
        authors: item.author?.map((a: any) => `${a.given} ${a.family}`) || [],
        year: item["published-print"]?.["date-parts"]?.[0]?.[0] || item["published-online"]?.["date-parts"]?.[0]?.[0],
        journal: item["container-title"]?.[0],
        doi: item.DOI,
        url: item.URL,
        type: item.type,
      }
    });
  } catch (error) {
    res.status(500).json({ valid: false, error: "Internal research error" });
  }
});

// Semantic Scholar Search Proxy
app.get("/api/research/search", async (req, res) => {
  const { query, limit = 5 } = req.query;
  if (!query) return res.status(400).json({ error: "Query required" });

  try {
    const response = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query as string)}&limit=${limit}&fields=title,authors,year,abstract,citationCount,url`
    );
    const data = await response.json();
    res.json(data.data || []);
  } catch (error) {
    res.status(500).json({ error: "Failed to search semantic scholar" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
