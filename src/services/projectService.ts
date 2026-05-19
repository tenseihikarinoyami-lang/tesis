import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  deleteDoc,
  updateDoc 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { ThesisProject, THESIS_CHAPTERS, ProjectGenerationStatus } from "../types";

const COLLECTION_NAME = "thesis_projects";

export const projectService = {
  async getAllProjects(userId: string): Promise<ThesisProject[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where("userId", "==", userId),
        orderBy("updatedAt", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as ThesisProject);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
      return []; // Never reached due to throw in handler
    }
  },

  async getProject(id: string): Promise<ThesisProject | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return docSnap.data() as ThesisProject;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${COLLECTION_NAME}/${id}`);
      return null;
    }
  },

  async createProject(userId: string, data: Partial<ThesisProject>): Promise<ThesisProject> {
    const id = Date.now().toString();
    const newProject: ThesisProject = {
      id,
      userId,
      title: data.title || "Sin título",
      hypothesis: data.hypothesis || "",
      topic: data.topic || "",
      category: data.category || "General",
      university: data.university || "IUTA",
      citationStyle: "APA",
      chunks: THESIS_CHAPTERS.map(ch => ({ chapter: ch, content: "", status: "pending" })),
      validatedCitations: [],
      generationStatus: ProjectGenerationStatus.IDLE,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...(data as any)
    };

    try {
      await setDoc(doc(db, COLLECTION_NAME, id), newProject);
      return newProject;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${COLLECTION_NAME}/${id}`);
      throw error;
    }
  },

  async updateProject(id: string, updates: Partial<ThesisProject>): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    }
  },

  async deleteProject(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    }
  }
};
