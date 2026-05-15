export enum AIProvider {
  GEMINI = "gemini",
  GROQ = "groq",
  OPENROUTER = "openrouter"
}

export interface CitationMetadata {
  title: string;
  authors: string[];
  year?: number;
  journal?: string;
  doi: string;
  url: string;
  type?: string;
}

export interface CitationValidation {
  valid: boolean;
  error?: string;
  metadata?: CitationMetadata;
  apa?: string;
}

export interface ResearchPaper {
  paperId: string;
  title: string;
  abstract: string;
  url: string;
  year: number;
  citationCount: number;
  authors: { name: string }[];
}

export const THESIS_CHAPTERS = [
  "Resumen",
  "Introducción",
  "Capítulo I: El Problema",
  "Capítulo II: Marco Teórico",
  "Capítulo III: Marco Metodológico",
  "Capítulo IV: Resultados",
  "Capítulo V: Conclusiones y Recomendaciones"
];

export interface ThesisChunk {
  id: string;
  chapter: string;
  title: string;
  content: string;
  status: "draft" | "generating" | "generated" | "reviewed";
  updatedAt: string;
}

export enum ProjectGenerationStatus {
  IDLE = "idle",
  PLANNING = "planning",
  RESEARCHING = "researching",
  WRITING = "writing",
  FINALIZING = "finalizing",
  COMPLETED = "completed",
  ERROR = "error"
}

export interface ThesisProject {
  id: string;
  userId: string;
  title: string;
  description: string;
  hypothesis: string;
  variables: string[];
  chunks: ThesisChunk[];
  validatedCitations: CitationMetadata[];
  generationStatus: ProjectGenerationStatus;
  currentStep?: string;
  createdAt: string;
  updatedAt: string;
}
