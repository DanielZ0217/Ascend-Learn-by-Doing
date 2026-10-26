import "server-only";

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { RoleId, SourceExcerpt } from "@/lib/contracts";

let database: DatabaseSync | undefined;

export type StoredDocument = {
  id: string;
  companyId: string | null;
  roleId: RoleId | null;
  title: string;
  url: string | null;
  kind: "pdf" | "text" | "web";
  uploaded: boolean;
};

export type StoredPassage = {
  id: string;
  documentId: string;
  companyId: string | null;
  roleId: RoleId | null;
  title: string;
  url: string | null;
  location: string | null;
  text: string;
  uploaded: boolean;
};

export function getDb(): DatabaseSync {
  if (database) return database;
  const file = process.env.HACKTX_DB_PATH || join(process.cwd(), "data", "hacktx.sqlite");
  mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      role_id TEXT,
      title TEXT NOT NULL,
      url TEXT,
      kind TEXT NOT NULL,
      uploaded INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS passages (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      company_id TEXT,
      role_id TEXT,
      title TEXT NOT NULL,
      url TEXT,
      location TEXT,
      text TEXT NOT NULL,
      uploaded INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS passages_fts USING fts5(id UNINDEXED, text);
    CREATE TABLE IF NOT EXISTS ai_usage (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      operation TEXT NOT NULL,
      input_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      estimated_usd REAL NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  database = db;
  return db;
}

export function saveDocument(document: StoredDocument, db: DatabaseSync = getDb()): void {
  db.prepare(`INSERT INTO documents (id, company_id, role_id, title, url, kind, uploaded, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET title=excluded.title, url=excluded.url`)
    .run(document.id, document.companyId, document.roleId, document.title,
      document.url, document.kind, document.uploaded ? 1 : 0, new Date().toISOString());
}

export function savePassage(passage: StoredPassage, db: DatabaseSync = getDb()): void {
  db.prepare("DELETE FROM passages_fts WHERE id = ?").run(passage.id);
  db.prepare(`INSERT INTO passages (id, document_id, company_id, role_id, title, url, location, text, uploaded, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET text=excluded.text, title=excluded.title, location=excluded.location`)
    .run(passage.id, passage.documentId, passage.companyId, passage.roleId,
      passage.title, passage.url, passage.location, passage.text,
      passage.uploaded ? 1 : 0, new Date().toISOString());
  db.prepare("INSERT INTO passages_fts (id, text) VALUES (?, ?)").run(passage.id, passage.text);
}

export function companySourceIds(companyId: string, db: DatabaseSync = getDb()) {
  const documents = db.prepare("SELECT id FROM documents WHERE company_id = ?").all(companyId) as { id: string }[];
  const passages = db.prepare("SELECT id FROM passages WHERE company_id = ?").all(companyId) as { id: string }[];
  return { documentIds: documents.map((row) => row.id), passageIds: passages.map((row) => row.id) };
}

export function deleteCompanyDocuments(companyId: string, db: DatabaseSync = getDb()): void {
  db.prepare("DELETE FROM passages_fts WHERE id IN (SELECT id FROM passages WHERE company_id = ?)").run(companyId);
  db.prepare("DELETE FROM documents WHERE company_id = ?").run(companyId);
}

export function getPassage(id: string): StoredPassage | null {
  const row = getDb().prepare("SELECT * FROM passages WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToPassage(row) : null;
}

function rowToPassage(row: Record<string, unknown>): StoredPassage {
  return {
    id: String(row.id), documentId: String(row.document_id),
    companyId: row.company_id ? String(row.company_id) : null,
    roleId: row.role_id ? String(row.role_id) as RoleId : null,
    title: String(row.title), url: row.url ? String(row.url) : null,
    location: row.location ? String(row.location) : null,
    text: String(row.text), uploaded: Boolean(row.uploaded),
  };
}

export function searchLocalPassages(args: {
  companyId: string; roleId: RoleId; topic: string; limit?: number;
}): StoredPassage[] {
  const tokens = args.topic.toLowerCase().match(/[a-z0-9]{3,}/g)?.slice(0, 8) ?? [];
  if (!tokens.length) return [];
  const query = tokens.map((token) => `"${token}"`).join(" OR ");
  const rows = getDb().prepare(`SELECT p.* FROM passages_fts f
    JOIN passages p ON p.id = f.id
    WHERE passages_fts MATCH ?
      AND (p.company_id IS NULL OR p.company_id = ?)
      AND (p.role_id IS NULL OR p.role_id = ?)
    ORDER BY rank LIMIT ?`)
    .all(query, args.companyId, args.roleId, Math.min(args.limit ?? 5, 8)) as Record<string, unknown>[];
  return rows.map(rowToPassage);
}

export function passageToExcerpt(passage: StoredPassage): SourceExcerpt {
  return {
    id: passage.id,
    title: passage.title,
    ...(passage.url ? { url: passage.url } : { uploadId: passage.documentId }),
    excerpt: passage.text.slice(0, 12000),
    location: passage.location ?? undefined,
    retrievedAt: new Date().toISOString(),
    provenance: passage.uploaded ? "uploaded" : "curated",
  };
}
