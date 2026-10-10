export type Role = "user" | "assistant" | "system";

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  /** Present when the file was handed to the provider's file store (token/bandwidth-light). */
  fileUri?: string;
  /** Present when we fell back to sending raw bytes inline (small files, or provider has no file store). */
  dataUrl?: string;
  sizeBytes: number;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  attachments?: Attachment[];
  images?: string[]; // generated image data URLs attached to an assistant reply
  createdAt: number;
  pending?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  projectId?: string | null;
}

export interface ProjectFile {
  id: string;
  name: string;
  content: string;
  sizeBytes: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  files: ProjectFile[]; // max 5 files (.md and .txt)
  createdAt: number;
}
