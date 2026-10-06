/* eslint-disable @typescript-eslint/no-explicit-any */
// Preserve existing caller result types while records migrate without schema loss.
export type Document = { _id: string; _type: string; _rev: string; _createdAt: string; _updatedAt: string; [key: string]: any };
type Input = { _id?: string; _type: string; [key: string]: any };
export interface DocumentPatch {
  set(values: Record<string, any>): this;
  setIfMissing(values: Record<string, any>): this;
  unset(paths: string[]): this;
  inc(values: Record<string, number>): this;
  dec(values: Record<string, number>): this;
  append(path: string, items: any[]): this;
  prepend(path: string, items: any[]): this;
  insert(position: "before" | "after", path: string, items: any[]): this;
  ifRevisionId(revision: string): this;
  commit<T = Document>(options?: unknown): Promise<T>;
}
export interface DocumentTransaction {
  create(doc: Input): this;
  createIfNotExists(doc: Input): this;
  createOrReplace(doc: Input): this;
  delete(id: string): this;
  patch(id: string, changes: ((patch: DocumentPatch) => DocumentPatch) | Record<string, any>): this;
  commit(options?: unknown): Promise<{ results: Document[] }>;
}
export interface DocumentStore {
  fetch<T = any>(query: string, params?: Record<string, any>, options?: unknown): Promise<T>;
  getDocument<T = Document>(id: string): Promise<T | undefined>;
  getDocuments<T = Document>(ids: string[]): Promise<Array<T | null>>;
  create<T = Document>(doc: Input): Promise<T>;
  createIfNotExists<T = Document>(doc: Input): Promise<T>;
  createOrReplace<T = Document>(doc: Input): Promise<T>;
  delete(selection: string | { query: string; params?: Record<string, any> }): Promise<any>;
  patch(id: string): DocumentPatch;
  transaction(): DocumentTransaction;
  mutate(mutations: any[]): Promise<Document[]>;
}
export function createDocumentStore(query?: (query: string, params: any[]) => Promise<any[]>): DocumentStore;
export function candidateQuery(tree: any, params?: Record<string, any>): { query: string; params: any[] };
export function parseDocumentPath(path: string): Array<string | number | { key: string }>;
export function validateDocumentId(id: string): string;
export const documentStore: DocumentStore;
