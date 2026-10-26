import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  assignmentSchema, companyBlueprintSchema, stage2EventSchema, stage2MessageSchema,
  stage2ParticipantSchema, stage2SettingsSchema, type Assignment, type CompanyBlueprint,
  type RoleId, type Review, type Stage2Event, type Stage2Message, type Stage2Participant,
  type Stage2Settings,
} from "@/lib/contracts";
import { deleteCompanyDocuments, getDb } from "@/lib/storage/db";
import { practiceAssignment, practiceScenario } from "@/lib/stage2/practice";

const PRESENCE_MS = 60_000;
const TICK_MS = 5_000;
const MAX_EVENTS = 120;
const initialized = new WeakSet<DatabaseSync>();

export class Stage2Error extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
    this.name = "Stage2Error";
  }
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("host");
  let originHost = "";
  try { originHost = new URL(origin).host; } catch { /* reject malformed origins below */ }
  if (!host || originHost !== host) throw new Stage2Error("invalid_origin", "Open this action from the company app.", 403);
}

export function initStage2(db: DatabaseSync = getDb()) {
  if (initialized.has(db)) return db;
  db.exec(`
    CREATE TABLE IF NOT EXISTS stage2_companies (
      id TEXT PRIMARY KEY, blueprint TEXT NOT NULL, settings TEXT NOT NULL,
      invite_hash TEXT NOT NULL, approval_mode INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS stage2_participants (
      id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES stage2_companies(id) ON DELETE CASCADE,
      display_name TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE,
      active_role TEXT, last_seen INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS stage2_participants_company ON stage2_participants(company_id, last_seen);
    CREATE TABLE IF NOT EXISTS stage2_messages (
      id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES stage2_companies(id) ON DELETE CASCADE,
      thread_id TEXT NOT NULL, author_type TEXT NOT NULL, author_id TEXT NOT NULL,
      author_name TEXT NOT NULL, role_id TEXT NOT NULL, recipient_role_id TEXT,
      kind TEXT NOT NULL, source TEXT NOT NULL, text TEXT NOT NULL,
      status TEXT NOT NULL, artifact_id TEXT, created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS stage2_messages_company ON stage2_messages(company_id, created_at);
    CREATE TABLE IF NOT EXISTS stage2_artifacts (
      id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES stage2_companies(id) ON DELETE CASCADE,
      issue_id TEXT NOT NULL, author_id TEXT NOT NULL, kind TEXT NOT NULL,
      title TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS stage2_runs (
      company_id TEXT PRIMARY KEY REFERENCES stage2_companies(id) ON DELETE CASCADE,
      status TEXT NOT NULL, sequence INTEGER NOT NULL DEFAULT 0,
      last_tick INTEGER NOT NULL, paused_event_id TEXT, pause_role_id TEXT,
      assignment TEXT, assignment_mode TEXT, assignment_provider TEXT,
      task_owner_id TEXT, task_completed INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS stage2_events (
      id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES stage2_companies(id) ON DELETE CASCADE,
      sequence INTEGER NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL,
      UNIQUE(company_id, sequence)
    );
    CREATE TABLE IF NOT EXISTS learner_preferences (
      company_id TEXT NOT NULL REFERENCES stage2_companies(id) ON DELETE CASCADE,
      learner_hash TEXT NOT NULL, style TEXT NOT NULL, updated_at TEXT NOT NULL,
      PRIMARY KEY(company_id, learner_hash)
    );
    CREATE TABLE IF NOT EXISTS stage2_practice_tasks (
      id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES stage2_companies(id) ON DELETE CASCADE,
      status TEXT NOT NULL, team_size INTEGER NOT NULL, title TEXT NOT NULL,
      context TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS stage2_practice_company ON stage2_practice_tasks(company_id, created_at);
    CREATE TABLE IF NOT EXISTS stage2_practice_parts (
      id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES stage2_practice_tasks(id) ON DELETE CASCADE,
      role_id TEXT NOT NULL, owner_id TEXT NOT NULL, owner_name TEXT NOT NULL,
      assignment TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'assigned',
      reviewed_body TEXT, review TEXT, artifact_id TEXT
    );
  `);
  const columns = new Set((db.prepare("PRAGMA table_info(stage2_companies)").all() as { name: string }[]).map((row) => row.name));
  if (!columns.has("join_code")) db.exec("ALTER TABLE stage2_companies ADD COLUMN join_code TEXT");
  if (!columns.has("owner_id")) db.exec("ALTER TABLE stage2_companies ADD COLUMN owner_id TEXT");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS stage2_companies_join_code ON stage2_companies(join_code)");
  for (const row of db.prepare("SELECT id FROM stage2_companies WHERE join_code IS NULL").all() as { id: string }[]) {
    db.prepare("UPDATE stage2_companies SET join_code = ? WHERE id = ?").run(newJoinCode(db), row.id);
  }
  db.exec(`UPDATE stage2_companies SET owner_id = (
    SELECT id FROM stage2_participants WHERE company_id = stage2_companies.id ORDER BY rowid LIMIT 1
  ) WHERE owner_id IS NULL`);
  initialized.add(db);
  // Expire abandoned runs even when no browser returns to poll them.
  setInterval(() => {
    try {
      const rows = db.prepare("SELECT company_id FROM stage2_runs").all() as { company_id: string }[];
      for (const row of rows) expireParticipants(row.company_id, db);
    } catch { /* the next sweep retries after transient storage failure */ }
  }, 15_000).unref?.();
  return db;
}

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const token = () => randomBytes(32).toString("base64url");
const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const normalizeJoinCode = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");
function newJoinCode(db: DatabaseSync): string {
  for (let attempt = 0; attempt < 20; attempt++) {
    const bytes = randomBytes(8);
    const code = [...bytes].map((byte) => codeAlphabet[byte % codeAlphabet.length]).join("");
    if (!db.prepare("SELECT 1 FROM stage2_companies WHERE join_code = ?").get(code)) return code;
  }
  throw new Stage2Error("code_unavailable", "Could not create a company code. Try again.", 503);
}
const cookieName = (companyId: string) => `hacktx_s2_${companyId.replaceAll("-", "")}`;

export function sessionCookie(companyId: string, sessionToken: string) {
  return `${cookieName(companyId)}=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`;
}

function cookieValue(request: Request, companyId: string) {
  const name = `${cookieName(companyId)}=`;
  return request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(name))?.slice(name.length) ?? "";
}

type CompanyRow = { id: string; blueprint: string; settings: string; invite_hash: string; approval_mode: number; join_code: string | null; owner_id: string | null };
function companyRow(companyId: string, db: DatabaseSync) {
  const row = db.prepare("SELECT * FROM stage2_companies WHERE id = ?").get(companyId) as CompanyRow | undefined;
  if (!row) throw new Stage2Error("not_found", "This shared company does not exist.", 404);
  return row;
}

export function isSharedCompany(companyId: string, db: DatabaseSync = getDb()) {
  initStage2(db);
  return Boolean(db.prepare("SELECT 1 FROM stage2_companies WHERE id = ?").get(companyId));
}

export function deleteSharedCompany(companyId: string, db: DatabaseSync = getDb()): void {
  initStage2(db);
  db.prepare("DELETE FROM stage2_companies WHERE id = ?").run(companyId);
}

export function isCompanyOwner(participant: Stage2Participant, db: DatabaseSync = getDb()): boolean {
  initStage2(db);
  return companyRow(participant.companyId, db).owner_id === participant.id;
}

export function requireCompanyOwner(participant: Stage2Participant, db: DatabaseSync = getDb()): void {
  if (!isCompanyOwner(participant, db)) throw new Stage2Error("creator_only", "Only the company creator can reset or delete this company.", 403);
}

export function joinCodeForOwner(participant: Stage2Participant, db: DatabaseSync = getDb()): string | null {
  initStage2(db);
  const row = companyRow(participant.companyId, db);
  return row.owner_id === participant.id ? row.join_code : null;
}

export function clearCompanyDemo(participant: Stage2Participant, db: DatabaseSync = getDb()) {
  initStage2(db);
  requireCompanyOwner(participant, db);
  const inviteToken = token();
  const joinCode = newJoinCode(db);
  db.exec("BEGIN IMMEDIATE");
  try {
    deleteCompanyDocuments(participant.companyId, db);
    for (const table of ["stage2_messages", "stage2_artifacts", "stage2_events", "stage2_runs", "learner_preferences", "stage2_practice_tasks"]) {
      db.prepare(`DELETE FROM ${table} WHERE company_id = ?`).run(participant.companyId);
    }
    db.prepare("DELETE FROM stage2_participants WHERE company_id = ? AND id <> ?").run(participant.companyId, participant.id);
    db.prepare("UPDATE stage2_participants SET active_role = NULL, last_seen = ? WHERE id = ?").run(Date.now(), participant.id);
    db.prepare("UPDATE stage2_companies SET join_code = ?, invite_hash = ?, approval_mode = 0 WHERE id = ?")
      .run(joinCode, hash(inviteToken), participant.companyId);
    db.exec("COMMIT");
    return { joinCode, inviteToken };
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}

function participantFromRow(row: Record<string, unknown>): Stage2Participant {
  return stage2ParticipantSchema.parse({
    id: row.id, companyId: row.company_id, displayName: row.display_name,
    activeRole: row.active_role, lastSeen: row.last_seen,
  });
}

function clearRun(companyId: string, db: DatabaseSync) {
  db.prepare("DELETE FROM stage2_events WHERE company_id = ?").run(companyId);
  db.prepare("DELETE FROM stage2_runs WHERE company_id = ?").run(companyId);
}

function expireParticipants(companyId: string, db: DatabaseSync, now = Date.now()) {
  db.prepare("DELETE FROM stage2_participants WHERE company_id = ? AND last_seen < ? AND id <> (SELECT owner_id FROM stage2_companies WHERE id = ?)").run(companyId, now - PRESENCE_MS, companyId);
  const remaining = db.prepare("SELECT COUNT(*) AS count FROM stage2_participants WHERE company_id = ? AND last_seen >= ?").get(companyId, now - PRESENCE_MS) as { count: number };
  if (remaining.count === 0) clearRun(companyId, db);
}

export function createSharedCompany(args: {
  blueprint: CompanyBlueprint; settings: Stage2Settings; creatorName: string;
}, db: DatabaseSync = getDb()) {
  initStage2(db);
  const blueprint = companyBlueprintSchema.parse(args.blueprint);
  const settings = stage2SettingsSchema.parse(args.settings);
  const displayName = stage2ParticipantSchema.shape.displayName.parse(args.creatorName);
  const inviteToken = token();
  const joinCode = newJoinCode(db);
  const sessionToken = token();
  const participantId = randomUUID();
  const now = Date.now();
  db.prepare("INSERT INTO stage2_companies (id, blueprint, settings, invite_hash, approval_mode, created_at, join_code, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(blueprint.company.id, JSON.stringify(blueprint), JSON.stringify(settings), hash(inviteToken), 0, new Date(now).toISOString(), joinCode, participantId);
  db.prepare("INSERT INTO stage2_participants (id, company_id, display_name, token_hash, active_role, last_seen) VALUES (?, ?, ?, ?, NULL, ?)")
    .run(participantId, blueprint.company.id, displayName, hash(sessionToken), now);
  return { inviteToken, joinCode, sessionToken, participant: participantFromRow({ id: participantId, company_id: blueprint.company.id, display_name: displayName, active_role: null, last_seen: now }) };
}

export function joinSharedCompany(args: { companyId: string; inviteToken: string; displayName: string }, db: DatabaseSync = getDb()) {
  initStage2(db);
  const row = companyRow(args.companyId, db);
  if (hash(args.inviteToken) !== row.invite_hash) throw new Stage2Error("invalid_invite", "This invitation is invalid or expired.", 403);
  return joinCompanyRow(row, args.displayName, db);
}

export function joinSharedCompanyByCode(args: { joinCode: string; displayName: string }, db: DatabaseSync = getDb()) {
  initStage2(db);
  const code = normalizeJoinCode(args.joinCode);
  const row = db.prepare("SELECT * FROM stage2_companies WHERE join_code = ?").get(code) as CompanyRow | undefined;
  if (!row || code.length !== 8) throw new Stage2Error("invalid_code", "That company code is invalid or has changed. Check the creator's screen.", 403);
  if (stage2SettingsSchema.parse(JSON.parse(row.settings)).participantMode !== "collaborative")
    throw new Stage2Error("not_collaborative", "This company is not open to teammates.", 403);
  return joinCompanyRow(row, args.displayName, db);
}

function joinCompanyRow(row: CompanyRow, name: string, db: DatabaseSync) {
  const settings = stage2SettingsSchema.parse(JSON.parse(row.settings));
  const displayName = stage2ParticipantSchema.shape.displayName.parse(name);
  const now = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    expireParticipants(row.id, db, now);
    const count = db.prepare("SELECT COUNT(*) AS count FROM stage2_participants WHERE company_id = ? AND last_seen >= ?").get(row.id, now - PRESENCE_MS) as { count: number };
    if (count.count >= (settings.participantMode === "collaborative" ? 5 : 1)) throw new Stage2Error("company_full", "This company has no open student seat.", 409);
    const sessionToken = token();
    const participantId = randomUUID();
    db.prepare("INSERT INTO stage2_participants (id, company_id, display_name, token_hash, active_role, last_seen) VALUES (?, ?, ?, ?, NULL, ?)")
      .run(participantId, row.id, displayName, hash(sessionToken), now);
    if (!row.owner_id && count.count === 0) db.prepare("UPDATE stage2_companies SET owner_id = ? WHERE id = ?").run(participantId, row.id);
    db.exec("COMMIT");
    return { sessionToken, participant: participantFromRow({ id: participantId, company_id: row.id, display_name: displayName, active_role: null, last_seen: now }), blueprint: companyBlueprintSchema.parse(JSON.parse(row.blueprint)), settings, isOwner: row.owner_id === participantId || (!row.owner_id && count.count === 0) };
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}

export function authenticate(request: Request, companyId: string, db: DatabaseSync = getDb(), touch = true) {
  initStage2(db);
  companyRow(companyId, db);
  const credential = cookieValue(request, companyId);
  if (!credential || credential.length > 256) throw new Stage2Error("not_joined", "Join this company before opening its shared work.", 401);
  const row = db.prepare("SELECT * FROM stage2_participants WHERE company_id = ? AND token_hash = ?").get(companyId, hash(credential)) as Record<string, unknown> | undefined;
  if (!row || (Number(row.last_seen) < Date.now() - PRESENCE_MS && String(row.id) !== companyRow(companyId, db).owner_id))
    throw new Stage2Error("session_expired", "Your shared session expired. Rejoin with the company code.", 401);
  if (touch) db.prepare("UPDATE stage2_participants SET last_seen = ? WHERE id = ?").run(Date.now(), String(row.id));
  return participantFromRow({ ...row, last_seen: touch ? Date.now() : row.last_seen });
}

export function setActiveRole(participant: Stage2Participant, roleId: RoleId, db: DatabaseSync = getDb()) {
  initStage2(db);
  db.prepare("UPDATE stage2_participants SET active_role = ?, last_seen = ? WHERE id = ? AND company_id = ?")
    .run(roleId, Date.now(), participant.id, participant.companyId);
}

export function leaveCompany(participant: Stage2Participant, db: DatabaseSync = getDb()) {
  initStage2(db);
  db.prepare("UPDATE stage2_participants SET last_seen = ? WHERE id = ? AND company_id = ?")
    .run(Date.now() - PRESENCE_MS + 15_000, participant.id, participant.companyId);
  setTimeout(() => { try { expireParticipants(participant.companyId, db); } catch { /* cleanup retries on next request */ } }, 16_000).unref?.();
}

export function getCompanyForParticipant(participant: Stage2Participant, db: DatabaseSync = getDb()) {
  initStage2(db);
  const row = companyRow(participant.companyId, db);
  return {
    blueprint: companyBlueprintSchema.parse(JSON.parse(row.blueprint)),
    settings: { ...stage2SettingsSchema.parse(JSON.parse(row.settings)), approvalMode: Boolean(row.approval_mode) },
  };
}

export function setApprovalMode(participant: Stage2Participant, enabled: boolean, db: DatabaseSync = getDb()) {
  initStage2(db);
  db.prepare("UPDATE stage2_companies SET approval_mode = ? WHERE id = ?").run(enabled ? 1 : 0, participant.companyId);
}

export function setGenerationMode(participant: Stage2Participant, mode: "live" | "fixture", db: DatabaseSync = getDb()) {
  initStage2(db);
  const row = companyRow(participant.companyId, db);
  const settings = stage2SettingsSchema.parse(JSON.parse(row.settings));
  db.prepare("UPDATE stage2_companies SET settings = ? WHERE id = ?")
    .run(JSON.stringify({ ...settings, generationMode: mode }), participant.companyId);
}

export function getMessages(companyId: string, db: DatabaseSync = getDb()): Stage2Message[] {
  initStage2(db);
  const rows = db.prepare("SELECT * FROM stage2_messages WHERE company_id = ? ORDER BY created_at, rowid LIMIT 150").all(companyId) as Record<string, unknown>[];
  return rows.map((row) => stage2MessageSchema.parse({
    id: row.id, companyId: row.company_id, threadId: row.thread_id,
    authorType: row.author_type, authorId: row.author_id, authorName: row.author_name,
    roleId: row.role_id, recipientRoleId: row.recipient_role_id, kind: row.kind,
    source: row.source, text: row.text, status: row.status,
    artifactId: row.artifact_id, createdAt: row.created_at,
  }));
}

export function addMessage(args: Omit<Stage2Message, "id" | "createdAt">, db: DatabaseSync = getDb()): Stage2Message {
  initStage2(db);
  const message = stage2MessageSchema.parse({ ...args, id: randomUUID(), createdAt: new Date().toISOString() });
  db.prepare(`INSERT INTO stage2_messages (id, company_id, thread_id, author_type, author_id, author_name, role_id,
    recipient_role_id, kind, source, text, status, artifact_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(message.id, message.companyId, message.threadId, message.authorType, message.authorId, message.authorName,
      message.roleId, message.recipientRoleId, message.kind, message.source, message.text, message.status,
      message.artifactId, message.createdAt);
  return message;
}

export function addStudentMessage(participant: Stage2Participant, args: {
  roleId: RoleId; kind: "message" | "prd" | "clarification"; text: string;
}, db: DatabaseSync = getDb()) {
  initStage2(db);
  const text = stage2MessageSchema.shape.text.parse(args.text);
  const count = db.prepare("SELECT COUNT(*) AS count FROM stage2_messages WHERE company_id = ?").get(participant.companyId) as { count: number };
  if (count.count >= 300) throw new Stage2Error("thread_limit", "This company thread reached its demo limit.", 429);
  const artifactId = args.kind === "prd" ? randomUUID() : null;
  if (artifactId) db.prepare("INSERT INTO stage2_artifacts (id, company_id, issue_id, author_id, kind, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(artifactId, participant.companyId, "customer-request", participant.id, "prd", "Customer problem brief", text, new Date().toISOString());
  return addMessage({ companyId: participant.companyId, threadId: "customer-feature", authorType: "student", authorId: participant.id,
    authorName: participant.displayName, roleId: args.roleId, recipientRoleId: args.kind === "prd" ? "software-engineer" : args.kind === "clarification" ? "customer-support" : null,
    kind: args.kind, source: "student", text, status: "delivered", artifactId }, db);
}

export function getArtifact(participant: Stage2Participant, artifactId: string, db: DatabaseSync = getDb()) {
  initStage2(db);
  const row = db.prepare("SELECT id, company_id, issue_id, author_id, kind, title, body, created_at FROM stage2_artifacts WHERE id = ? AND company_id = ?")
    .get(artifactId, participant.companyId) as Record<string, unknown> | undefined;
  if (!row) throw new Stage2Error("artifact_missing", "This company artifact is unavailable.", 404);
  return { id: String(row.id), companyId: String(row.company_id), issueId: String(row.issue_id),
    authorId: String(row.author_id), kind: String(row.kind), title: String(row.title),
    body: String(row.body), createdAt: String(row.created_at) };
}

export function decideMessage(participant: Stage2Participant, messageId: string, approved: boolean, db: DatabaseSync = getDb()) {
  initStage2(db);
  const result = db.prepare("UPDATE stage2_messages SET status = ? WHERE id = ? AND company_id = ? AND author_type = 'agent' AND status = 'pending'")
    .run(approved ? "delivered" : "rejected", messageId, participant.companyId);
  if (!result.changes) throw new Stage2Error("not_pending", "This handoff is no longer waiting for approval.", 409);
}

export function countAgentMessages(companyId: string, db: DatabaseSync = getDb()) {
  initStage2(db);
  return Number((db.prepare("SELECT COUNT(*) AS count FROM stage2_messages WHERE company_id = ? AND author_type = 'agent'").get(companyId) as { count: number }).count);
}

export function listParticipants(companyId: string, db: DatabaseSync = getDb()) {
  initStage2(db);
  expireParticipants(companyId, db);
  return (db.prepare("SELECT * FROM stage2_participants WHERE company_id = ? AND last_seen >= ? ORDER BY rowid").all(companyId, Date.now() - PRESENCE_MS) as Record<string, unknown>[]).map(participantFromRow);
}

export function getRun(companyId: string, db: DatabaseSync = getDb()) {
  initStage2(db);
  const row = db.prepare("SELECT * FROM stage2_runs WHERE company_id = ?").get(companyId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    status: row.status as "running" | "paused",
    sequence: Number(row.sequence), pausedEventId: row.paused_event_id as string | null,
    pauseRoleId: row.pause_role_id as RoleId | null,
    assignment: row.assignment ? assignmentSchema.parse(JSON.parse(String(row.assignment))) : null,
    assignmentMode: row.assignment_mode as "live" | "fixture" | null,
    assignmentProvider: row.assignment_provider as "bedrock" | "meta" | "fixture" | null,
    taskOwnerId: row.task_owner_id as string | null,
    taskCompleted: Boolean(row.task_completed),
  };
}

export function getEvents(companyId: string, db: DatabaseSync = getDb()): Stage2Event[] {
  initStage2(db);
  return (db.prepare("SELECT payload FROM stage2_events WHERE company_id = ? ORDER BY sequence DESC LIMIT ?").all(companyId, MAX_EVENTS) as { payload: string }[])
    .reverse().map((row) => stage2EventSchema.parse(JSON.parse(row.payload)));
}

export function ensureRun(companyId: string, db: DatabaseSync = getDb(), now = Date.now()) {
  initStage2(db);
  db.prepare("INSERT OR IGNORE INTO stage2_runs (company_id, status, sequence, last_tick) VALUES (?, 'running', 0, ?)")
    .run(companyId, now - TICK_MS);
}

export function advanceRun(companyId: string, makeEvent: (sequence: number) => Stage2Event, db: DatabaseSync = getDb(), now = Date.now()) {
  initStage2(db);
  db.exec("BEGIN IMMEDIATE");
  try {
    const row = db.prepare("SELECT status, sequence, last_tick FROM stage2_runs WHERE company_id = ?").get(companyId) as { status: string; sequence: number; last_tick: number } | undefined;
    if (!row || row.status !== "running" || now - row.last_tick < TICK_MS) { db.exec("COMMIT"); return null; }
    const event = stage2EventSchema.parse(makeEvent(row.sequence + 1));
    db.prepare("INSERT INTO stage2_events (id, company_id, sequence, payload, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(event.id, companyId, event.sequence, JSON.stringify(event), event.createdAt);
    db.prepare("UPDATE stage2_runs SET sequence = ?, last_tick = ? WHERE company_id = ?").run(event.sequence, now, companyId);
    db.prepare("DELETE FROM stage2_events WHERE company_id = ? AND sequence <= ?").run(companyId, event.sequence - MAX_EVENTS);
    db.exec("COMMIT");
    return event;
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}

export function beginPause(participant: Stage2Participant, roleId: RoleId, db: DatabaseSync = getDb()) {
  initStage2(db);
  db.exec("BEGIN IMMEDIATE");
  try {
    const row = db.prepare("SELECT status FROM stage2_runs WHERE company_id = ?").get(participant.companyId) as { status: string } | undefined;
    if (!row) throw new Stage2Error("run_missing", "Open the company simulation first.", 409);
    if (row.status === "paused") { db.exec("COMMIT"); return { created: false, event: getEvents(participant.companyId, db).at(-1) ?? null }; }
    const event = getEvents(participant.companyId, db).at(-1);
    if (!event) throw new Stage2Error("event_missing", "Wait for the first company event.", 409);
    db.prepare("UPDATE stage2_runs SET status = 'paused', paused_event_id = ?, pause_role_id = ?, assignment = NULL, assignment_mode = NULL, assignment_provider = NULL, task_owner_id = NULL, task_completed = 0 WHERE company_id = ?")
      .run(event.id, roleId, participant.companyId);
    db.exec("COMMIT");
    return { created: true, event };
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}

export function finishPauseGeneration(companyId: string, eventId: string, assignment: Assignment, mode: "live" | "fixture", provider: "bedrock" | "meta" | "fixture", db: DatabaseSync = getDb()) {
  initStage2(db);
  db.prepare("UPDATE stage2_runs SET assignment = ?, assignment_mode = ?, assignment_provider = ? WHERE company_id = ? AND status = 'paused' AND paused_event_id = ? AND assignment IS NULL")
    .run(JSON.stringify(assignmentSchema.parse(assignment)), mode, provider, companyId, eventId);
}

export function claimPauseTask(participant: Stage2Participant, db: DatabaseSync = getDb()) {
  initStage2(db);
  db.prepare("UPDATE stage2_runs SET task_owner_id = ? WHERE company_id = ? AND status = 'paused' AND assignment IS NOT NULL AND task_owner_id IS NULL")
    .run(participant.id, participant.companyId);
  const run = getRun(participant.companyId, db);
  if (!run?.assignment) throw new Stage2Error("task_not_ready", "The contextual task is still being prepared.", 409);
  if (run.taskOwnerId !== participant.id) throw new Stage2Error("task_claimed", "Your teammate is working on this task.", 409);
  return run.assignment;
}

export function resumeRun(participant: Stage2Participant, db: DatabaseSync = getDb()) {
  initStage2(db);
  db.prepare("UPDATE stage2_runs SET status = 'running', last_tick = ?, paused_event_id = NULL, pause_role_id = NULL, assignment = NULL, assignment_mode = NULL, assignment_provider = NULL, task_owner_id = NULL, task_completed = 0 WHERE company_id = ? AND status = 'paused'")
    .run(Date.now(), participant.companyId);
}

export function recordReviewedTask(participant: Stage2Participant, assignment: Assignment, body: string, outcome: { completed: boolean; attempt: number }, db: DatabaseSync = getDb()) {
  initStage2(db);
  const run = getRun(participant.companyId, db);
  if (!run || run.status !== "paused" || run.taskCompleted || run.taskOwnerId !== participant.id || run.assignment?.id !== assignment.id) return false;
  if (outcome.completed) db.prepare("UPDATE stage2_runs SET task_completed = 1 WHERE company_id = ? AND task_owner_id = ? AND task_completed = 0")
    .run(participant.companyId, participant.id);
  const artifactId = randomUUID();
  db.prepare("INSERT INTO stage2_artifacts (id, company_id, issue_id, author_id, kind, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(artifactId, participant.companyId, run.pausedEventId ?? "company-event", participant.id, assignment.kind, assignment.title, body.slice(0, 30000), new Date().toISOString());
  addMessage({ companyId: participant.companyId, threadId: "customer-feature", authorType: "student", authorId: participant.id,
    authorName: participant.displayName, roleId: assignment.roleId, recipientRoleId: null, kind: "implementation", source: "student",
    text: outcome.completed ? `Completed a reviewed ${assignment.kind} task: ${assignment.title}.` : `Submitted attempt ${outcome.attempt} for review: ${assignment.title}. More work is needed.`, status: "delivered", artifactId }, db);
  return true;
}

type PracticeTaskRow = { id: string; company_id: string; status: string; team_size: number; title: string; context: string; created_at: string };
type PracticePartRow = { id: string; task_id: string; role_id: RoleId; owner_id: string; owner_name: string; assignment: string; status: string; reviewed_body: string | null; review: string | null; artifact_id: string | null };

function requireCollaborativePractice(participant: Stage2Participant, db: DatabaseSync) {
  const { blueprint, settings } = getCompanyForParticipant(participant, db);
  if (settings.participantMode !== "collaborative" || settings.experienceMode !== "practice")
    throw new Stage2Error("wrong_mode", "Team tasks are available in collaborative Practice companies.", 400);
  return { blueprint, settings };
}

export function getPracticeTask(companyId: string, db: DatabaseSync = getDb()) {
  initStage2(db);
  const row = db.prepare("SELECT * FROM stage2_practice_tasks WHERE company_id = ? ORDER BY rowid DESC LIMIT 1").get(companyId) as PracticeTaskRow | undefined;
  if (!row) return null;
  const parts = (db.prepare("SELECT * FROM stage2_practice_parts WHERE task_id = ? ORDER BY rowid").all(row.id) as PracticePartRow[])
    .map((part) => ({ id: part.id, roleId: part.role_id, ownerId: part.owner_id, ownerName: part.owner_name,
      assignment: assignmentSchema.parse(JSON.parse(part.assignment)), status: part.status as "assigned" | "completed",
      reviewedBody: part.reviewed_body, review: part.review ? JSON.parse(part.review) as Review : null, artifactId: part.artifact_id }));
  return { id: row.id, status: row.status as "preview" | "active" | "completed", teamSize: row.team_size,
    title: row.title, context: row.context, createdAt: row.created_at, parts };
}

export function previewPracticeTask(participant: Stage2Participant, db: DatabaseSync = getDb()) {
  initStage2(db);
  const { blueprint, settings } = requireCollaborativePractice(participant, db);
  const present = listParticipants(participant.companyId, db);
  if (present.length < 2) throw new Stage2Error("team_too_small", "At least two students must be present to take a team task.", 409);
  const current = getPracticeTask(participant.companyId, db);
  if (current?.status === "active") throw new Stage2Error("task_active", "Finish the current team task first.", 409);
  const scenario = practiceScenario(blueprint, settings, present.length);
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("DELETE FROM stage2_practice_tasks WHERE company_id = ? AND status = 'preview'").run(participant.companyId);
    db.prepare("INSERT INTO stage2_practice_tasks (id, company_id, status, team_size, title, context, created_at) VALUES (?, ?, 'preview', ?, ?, ?, ?)")
      .run(randomUUID(), participant.companyId, present.length, scenario.title, scenario.context, new Date().toISOString());
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
  return getPracticeTask(participant.companyId, db);
}

export function startPracticeTask(participant: Stage2Participant, db: DatabaseSync = getDb()) {
  initStage2(db);
  const { blueprint, settings } = requireCollaborativePractice(participant, db);
  const present = listParticipants(participant.companyId, db);
  const task = getPracticeTask(participant.companyId, db);
  if (!task || task.status !== "preview") throw new Stage2Error("preview_missing", "Preview the team task first.", 409);
  if (present.length !== task.teamSize) throw new Stage2Error("team_changed", "The team size changed. Preview the task again.", 409);
  const roles = practiceScenario(blueprint, settings, present.length).roles;
  const selected = present.map((person) => person.activeRole);
  if (new Set(selected).size !== present.length || roles.some((role) => !selected.includes(role)))
    throw new Stage2Error("roles_needed", `Before starting, each student must select one distinct required role: ${roles.join(", ")}.`, 409);
  db.exec("BEGIN IMMEDIATE");
  try {
    const changed = db.prepare("UPDATE stage2_practice_tasks SET status = 'active' WHERE id = ? AND status = 'preview'").run(task.id);
    if (!changed.changes) throw new Stage2Error("task_changed", "This team task has changed. Refresh and try again.", 409);
    for (const roleId of roles) {
      const owner = present.find((person) => person.activeRole === roleId)!;
      const assignment = practiceAssignment(blueprint, settings, present.length, roleId);
      db.prepare("INSERT INTO stage2_practice_parts (id, task_id, role_id, owner_id, owner_name, assignment, status) VALUES (?, ?, ?, ?, ?, ?, 'assigned')")
        .run(randomUUID(), task.id, roleId, owner.id, owner.displayName, JSON.stringify(assignment));
    }
    addMessage({ companyId: participant.companyId, threadId: "customer-feature", authorType: "student", authorId: participant.id,
      authorName: participant.displayName, roleId: participant.activeRole ?? "customer-support", recipientRoleId: null,
      kind: "message", source: "student", text: `Started team Practice: ${task.title}. Each present teammate has one assigned part.`, status: "delivered", artifactId: null }, db);
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
  return getPracticeTask(participant.companyId, db);
}

export function reassignPracticePart(participant: Stage2Participant, partId: string, db: DatabaseSync = getDb()) {
  initStage2(db);
  requireCollaborativePractice(participant, db);
  const present = listParticipants(participant.companyId, db);
  const task = getPracticeTask(participant.companyId, db);
  const part = task?.status === "active" ? task.parts.find((item) => item.id === partId) : null;
  if (!part || part.status === "completed") throw new Stage2Error("part_unavailable", "This unfinished part is unavailable.", 409);
  if (present.some((person) => person.id === part.ownerId)) throw new Stage2Error("owner_present", "The assigned teammate is still here.", 409);
  const current = present.find((person) => person.id === participant.id);
  if (current?.activeRole !== part.roleId) throw new Stage2Error("role_needed", `Select ${part.roleId} before taking this part.`, 409);
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE stage2_practice_parts SET owner_id = ?, owner_name = ? WHERE id = ? AND status = 'assigned'")
      .run(participant.id, participant.displayName, partId);
    addMessage({ companyId: participant.companyId, threadId: "customer-feature", authorType: "student", authorId: participant.id,
      authorName: participant.displayName, roleId: part.roleId, recipientRoleId: null, kind: "message", source: "student",
      text: `Reassigned the unfinished ${part.roleId} part from ${part.ownerName} to ${participant.displayName}.`, status: "delivered", artifactId: null }, db);
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
  return getPracticeTask(participant.companyId, db);
}

export function assertPracticeReviewAllowed(participant: Stage2Participant, assignment: Assignment, db: DatabaseSync = getDb()) {
  initStage2(db);
  const task = getPracticeTask(participant.companyId, db);
  const part = task?.status === "active" ? task.parts.find((item) => item.assignment.id === assignment.id) : null;
  if (!part) return false;
  if (part.ownerId !== participant.id || part.status !== "assigned" || JSON.stringify(part.assignment) !== JSON.stringify(assignment))
    throw new Stage2Error("not_assigned", "This team part is assigned to another student or has changed.", 403);
  const completed = (role: RoleId) => task!.parts.find((item) => item.roleId === role)?.status === "completed";
  if (assignment.roleId === "software-engineer" && !completed("customer-support"))
    throw new Stage2Error("support_handoff_needed", "Wait for Support's reviewed customer brief before submitting Engineering work.", 409);
  if (assignment.roleId === "sales-marketing" && task!.parts.some((item) => item.roleId !== "sales-marketing" && item.status !== "completed"))
    throw new Stage2Error("verified_outcomes_needed", "Wait for the other reviewed team outcomes before sending the final customer message.", 409);
  return true;
}

export function recordPracticeReview(participant: Stage2Participant, assignment: Assignment, body: string, review: Review,
  codePassed: boolean, db: DatabaseSync = getDb()) {
  if (!assertPracticeReviewAllowed(participant, assignment, db)) return false;
  const task = getPracticeTask(participant.companyId, db)!;
  const part = task.parts.find((item) => item.assignment.id === assignment.id)!;
  const passed = body.trim().length >= 120 && review.criteria.length === assignment.rubric.length
    && review.criteria.every((criterion) => criterion.rating !== "needs-work")
    && (assignment.kind !== "code" || codePassed);
  db.exec("BEGIN IMMEDIATE");
  try {
    const artifactId = randomUUID();
    db.prepare("INSERT INTO stage2_artifacts (id, company_id, issue_id, author_id, kind, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(artifactId, participant.companyId, task.id, participant.id, assignment.kind, assignment.title, body.slice(0, 30000), new Date().toISOString());
    db.prepare("UPDATE stage2_practice_parts SET status = ?, reviewed_body = ?, review = ?, artifact_id = ? WHERE id = ?")
      .run(passed ? "completed" : "assigned", passed ? body.slice(0, 30000) : null, JSON.stringify(review), artifactId, part.id);
    addMessage({ companyId: participant.companyId, threadId: "customer-feature", authorType: "student", authorId: participant.id,
      authorName: participant.displayName, roleId: assignment.roleId, recipientRoleId: assignment.roleId === "customer-support" ? "software-engineer" : null,
      kind: assignment.roleId === "customer-support" && passed ? "prd" : "implementation", source: "student",
      text: passed ? `Reviewed ${assignment.roleId} part complete: ${assignment.title}.` : `Reviewed ${assignment.roleId} attempt: ${assignment.title}. Revision needed.`,
      status: "delivered", artifactId }, db);
    const remaining = (db.prepare("SELECT COUNT(*) AS count FROM stage2_practice_parts WHERE task_id = ? AND status <> 'completed'").get(task.id) as { count: number }).count;
    if (remaining === 0) db.prepare("UPDATE stage2_practice_tasks SET status = 'completed' WHERE id = ?").run(task.id);
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
  return true;
}
