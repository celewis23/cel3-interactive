import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { parse, evaluate } from "groq-js";

let connection;
const trees = new Map();
async function databaseQuery(query, params = []) {
  if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL");
  connection ??= neon(process.env.DATABASE_URL);
  return connection.query(query, params);
}

function treeFor(query) {
  if (!trees.has(query)) {
    if (trees.size >= 300) trees.clear();
    trees.set(query, parse(query));
  }
  return trees.get(query);
}

function constant(node, params) {
  if (node.type === "Value") return node.value;
  if (node.type === "Parameter") return params[node.name];
  if (node.type === "Array" && node.elements.every(item => !item.isSplat)) {
    const values = node.elements.map(item => constant(item.value, params));
    if (values.every(value => value !== undefined)) return values;
  }
}

// Push only safe restrictions into Postgres. GROQ still evaluates every original
// predicate/projection, so unknown expressions broaden the input, never omit data.
export function candidateQuery(tree, params = {}) {
  const values = [];
  function predicate(node) {
    if (node.type === "And" || node.type === "Or") {
      return `(${predicate(node.left)} ${node.type === "And" ? "AND" : "OR"} ${predicate(node.right)})`;
    }
    if (node.type === "Group") return predicate(node.base);
    if (node.type !== "OpCall" || node.left.type !== "AccessAttribute" || node.left.base) return "TRUE";
    const name = node.left.name;
    if (!["_type", "_id", "_rev", "timestamp", "_updatedAt", "_createdAt"].includes(name)) return "TRUE";
    const value = constant(node.right, params);
    const column = name === "_id" ? "id" : `(document->>'${name}')`;
    if (node.op === "in" && Array.isArray(value) && value.every(item => typeof item === "string")) {
      values.push(value); return `${column} = ANY($${values.length}::text[])`;
    }
    if (typeof value === "string" && ["==", "<", "<=", ">", ">="].includes(node.op)) {
      values.push(value); return `${column} COLLATE "C" ${node.op === "==" ? "=" : node.op} $${values.length}::text COLLATE "C"`;
    }
    return "TRUE";
  }
  const restrictions = [];
  function visit(node, parent) {
    if (!node || typeof node !== "object") return;
    if (node.type === "Everything") restrictions.push(parent?.type === "Filter" && parent.base === node ? predicate(parent.expr) : "TRUE");
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(child => visit(child, node));
      else if (value && typeof value === "object") visit(value, node);
    }
  }
  visit(tree);
  return { query: `SELECT document FROM app_documents WHERE ${restrictions.length ? restrictions.map(part => `(${part})`).join(" OR ") : "FALSE"}`, params: values };
}

export function parseDocumentPath(path) {
  const parts = [];
  let rest = path;
  while (rest.length) {
    const property = /^(?:\.)?([A-Za-z_][A-Za-z0-9_-]*)/.exec(rest);
    const index = /^\[(-?\d+)\]/.exec(rest);
    const keyed = /^\[_key\s*==\s*("(?:[^"\\]|\\.)*")\]/.exec(rest);
    if (property) { parts.push(property[1]); rest = rest.slice(property[0].length); }
    else if (index) { parts.push(Number(index[1])); rest = rest.slice(index[0].length); }
    else if (keyed) { parts.push({ key: JSON.parse(keyed[1]) }); rest = rest.slice(keyed[0].length); }
    else throw new Error(`Unsupported document path: ${path}`);
  }
  if (!parts.length || ["_id", "_rev", "_createdAt", "_updatedAt", "_type"].includes(parts[0])) throw new Error("Cannot patch document identity");
  return parts;
}

export function validateDocumentId(id) {
  if (typeof id !== "string" || !/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/.test(id)) throw new Error("Invalid document ID");
  return id;
}

function creation(kind, input) {
  if (!input || typeof input._type !== "string" || !input._type) throw new Error("Document type required");
  const id = validateDocumentId(input._id || randomUUID());
  return { kind, id, document: { ...input, _id: id } };
}

class Patch {
  constructor(store, id) { this.store = store; this.id = validateDocumentId(id); this.operations = []; }
  fields(kind, values) {
    for (const [path, value] of Object.entries(values)) {
      if (value === undefined) continue;
      this.operations.push({ kind, path: parseDocumentPath(path), value });
    }
    return this;
  }
  set(values) {
    // Existing callers sometimes pass the full record while updating it.
    return this.fields("set", Object.fromEntries(Object.entries(values).filter(([key]) => !["_id", "_rev", "_createdAt", "_updatedAt", "_type"].includes(key))));
  }
  setIfMissing(values) { return this.fields("setIfMissing", values); }
  inc(values) {
    if (Object.values(values).some(value => typeof value !== "number" || !Number.isFinite(value))) throw new Error("Increment requires finite numbers");
    return this.fields("inc", values);
  }
  dec(values) { return this.inc(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, -value]))); }
  unset(paths) { paths.forEach(path => this.operations.push({ kind: "unset", path: parseDocumentPath(path) })); return this; }
  append(path, values) { if (!Array.isArray(values)) throw new Error("Append requires an array"); return this.fields("append", { [path]: values }); }
  prepend(path, values) { if (!Array.isArray(values)) throw new Error("Prepend requires an array"); return this.fields("prepend", { [path]: values }); }
  insert(position, path, values) {
    if (!["before", "after"].includes(position) || !Array.isArray(values)) throw new Error("Invalid array insertion");
    const parts = parseDocumentPath(path);
    if (position === "after" && parts.at(-1) === -1) this.operations.push({ kind: "append", path: parts.slice(0, -1), value: values });
    else this.operations.push({ kind: "insert", position, path: parts, value: values });
    return this;
  }
  ifRevisionId(revision) { this.revision = revision; return this; }
  mutation() { return { kind: "patch", id: this.id, operations: this.operations, ...(this.revision ? { revision: this.revision } : {}) }; }
  async commit() { return (await this.store.mutate([this.mutation()]))[0]; }
}

class Transaction {
  constructor(store) { this.store = store; this.mutations = []; }
  create(doc) { this.mutations.push(creation("create", doc)); return this; }
  createIfNotExists(doc) { this.mutations.push(creation("createIfNotExists", doc)); return this; }
  createOrReplace(doc) { this.mutations.push(creation("createOrReplace", doc)); return this; }
  delete(id) { this.mutations.push({ kind: "delete", id: validateDocumentId(id) }); return this; }
  patch(id, update) {
    const patch = new Patch(this.store, id);
    if (typeof update === "function") update(patch);
    else for (const [operation, value] of Object.entries(update)) {
      if (!["set", "setIfMissing", "unset", "inc", "dec"].includes(operation)) throw new Error("Unsupported transaction patch");
      patch[operation](value);
    }
    this.mutations.push(patch.mutation()); return this;
  }
  async commit() { return { results: await this.store.mutate(this.mutations) }; }
}

export function createDocumentStore(query = databaseQuery) {
  const store = {
    async fetch(source, params = {}) {
      const tree = treeFor(source);
      const candidate = candidateQuery(tree, params);
      const rows = await query(candidate.query, candidate.params);
      const documents = rows.map(row => row.document);
      const references = new Map(documents.map(doc => [doc._id, Promise.resolve(doc)]));
      const value = await evaluate(tree, { dataset: documents, params, dereference: ({ _ref }) => {
        if (!references.has(_ref)) references.set(_ref, store.getDocument(_ref));
        return references.get(_ref);
      } });
      return value.get();
    },
    async getDocument(id) {
      const rows = await query("SELECT document FROM app_documents WHERE id = $1", [id]);
      return rows[0]?.document;
    },
    async getDocuments(ids) {
      const rows = await query("SELECT document FROM app_documents WHERE id = ANY($1::text[])", [ids]);
      const byId = new Map(rows.map(row => [row.document._id, row.document]));
      return ids.map(id => byId.get(id) ?? null);
    },
    async mutate(mutations) {
      if (!mutations.length) return [];
      try {
        const rows = await query("SELECT cel3_document_mutate($1::jsonb) AS documents", [JSON.stringify(mutations)]);
        return rows[0].documents;
      } catch (error) {
        if (error.code === "23505" || error.code === "40001") error.statusCode = 409;
        if (error.code === "P0002") error.statusCode = 404;
        throw error;
      }
    },
    async create(doc) { return (await store.mutate([creation("create", doc)]))[0]; },
    async createIfNotExists(doc) { return (await store.mutate([creation("createIfNotExists", doc)]))[0]; },
    async createOrReplace(doc) { return (await store.mutate([creation("createOrReplace", doc)]))[0]; },
    patch(id) { return new Patch(store, id); },
    transaction() { return new Transaction(store); },
    async delete(selection) {
      if (typeof selection === "string") return (await store.mutate([{ kind: "delete", id: validateDocumentId(selection) }]))[0];
      // Compare the fetched revision at deletion time so concurrent changes survive.
      const docs = await store.fetch(selection.query, selection.params);
      if (!Array.isArray(docs) || docs.some(doc => !doc?._id || !doc?._rev)) throw new Error("Delete query must return complete documents");
      return store.mutate(docs.map(doc => ({ kind: "delete", id: validateDocumentId(doc._id), revision: doc._rev })));
    },
  };
  return store;
}

export const documentStore = createDocumentStore();
