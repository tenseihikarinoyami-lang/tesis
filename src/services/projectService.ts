import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { ThesisProject, ThesisChunk, CitationMetadata, ProjectGenerationStatus } from "../types";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const projectService = {
  getProjects: async (userId: string): Promise<ThesisProject[]> => {
    const path = "projects";
    try {
      const q = query(
        collection(db, path), 
        where("userId", "==", userId),
        orderBy("updatedAt", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as ThesisProject);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  getProject: async (id: string): Promise<ThesisProject | undefined> => {
    const path = `projects/${id}`;
    try {
      const docSnap = await getDoc(doc(db, "projects", id));
      if (!docSnap.exists()) return undefined;
      
      const project = docSnap.data() as ThesisProject;
      
      // Load chunks and citations
      const chunksSnap = await getDocs(collection(db, "projects", id, "chunks"));
      const citationsSnap = await getDocs(collection(db, "projects", id, "citations"));
      
      return {
        ...project,
        chunks: chunksSnap.docs.map(d => d.data() as ThesisChunk),
        validatedCitations: citationsSnap.docs.map(d => d.data() as CitationMetadata)
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  saveProject: async (project: ThesisProject) => {
    const path = `projects/${project.id}`;
    try {
      const { chunks, validatedCitations, ...meta } = project;
      await setDoc(doc(db, "projects", project.id), {
        ...meta,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return project;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  saveChunk: async (projectId: string, chunk: ThesisChunk) => {
    const path = `projects/${projectId}/chunks/${chunk.id}`;
    try {
      await setDoc(doc(db, "projects", projectId, "chunks", chunk.id), {
        ...chunk,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  saveCitation: async (projectId: string, citation: CitationMetadata) => {
    const path = `projects/${projectId}/citations/${citation.doi.replace(/\//g, '_')}`;
    try {
      const id = citation.doi.replace(/\//g, '_');
      await setDoc(doc(db, "projects", projectId, "citations", id), {
        ...citation,
        id,
        createdAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  deleteProject: async (id: string) => {
    const path = `projects/${id}`;
    try {
      await deleteDoc(doc(db, "projects", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  createProject: async (userId: string, title: string, description: string): Promise<ThesisProject> => {
    const id = crypto.randomUUID();
    const newProject: ThesisProject = {
      id,
      userId,
      title,
      description,
      hypothesis: "",
      variables: [],
      chunks: [],
      validatedCitations: [],
      generationStatus: ProjectGenerationStatus.IDLE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await projectService.saveProject(newProject);
    return newProject;
  }
};
