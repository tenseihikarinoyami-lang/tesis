export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  password?: string;
  role: "admin" | "researcher";
  expiresAt: number | null; // null for indefinite
  createdAt: number;
  status: "active" | "expired" | "pending";
}

export interface UserRole {
  role: "admin" | "researcher";
  permissions: string[];
}
export enum AIProvider {
  GEMINI = "gemini",
  GROQ = "groq",
}

export enum ProjectGenerationStatus {
  IDLE = "idle",
  PLANNING = "planning",
  RESEARCHING = "researching",
  WRITING = "writing",
  FINALIZING = "finalizing",
  COMPLETED = "completed",
  ERROR = "error",
}

export interface CitationMetadata {
  title: string;
  authors: string[];
  year: number;
  journal?: string;
  doi?: string;
  url?: string;
}

export interface ThesisChunk {
  chapter: string;
  content: string;
  status: "pending" | "generating" | "completed";
}

export interface ThesisProject {
  id: string;
  userId: string;
  title: string;
  hypothesis: string;
  topic: string;
  category: string;
  university: "IUTA" | "IUTAR" | "UPTAEB";
  citationStyle: "APA" | "Vancouver";
  userVoice?: string;
  chunks: ThesisChunk[];
  validatedCitations: CitationMetadata[];
  generationStatus: ProjectGenerationStatus;
  createdAt: number;
  updatedAt: number;
}

export const THESIS_CHAPTERS = [
  "Introducción",
  "Capítulo I: El Problema",
  "Capítulo II: Marco Teórico",
  "Capítulo III: Marco Metodológico",
  "Capítulo IV: Resultados",
  "Capítulo V: Conclusiones y Recomendaciones",
];
