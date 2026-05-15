import { CitationValidation, ResearchPaper } from "../types";

export async function validateDoi(doi: string): Promise<CitationValidation> {
  try {
    const res = await fetch(`/api/research/validate?doi=${encodeURIComponent(doi)}`);
    return await res.json();
  } catch (error) {
    return { valid: false, error: "Error conectando con el validador académico." };
  }
}

export async function searchPapers(query: string, limit = 5): Promise<ResearchPaper[]> {
  try {
    const res = await fetch(`/api/research/search?query=${encodeURIComponent(query)}&limit=${limit}`);
    return await res.json();
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}
