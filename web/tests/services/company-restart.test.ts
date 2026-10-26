import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/retrieval/vector", () => ({ deleteVectors: vi.fn() }));
vi.mock("@/lib/graph", () => ({ deleteCompanyGraph: vi.fn(), recordCompanyGraph: vi.fn() }));
vi.mock("@/lib/memory", () => ({ deleteCompanyCoachTurns: vi.fn() }));

import { fixtureCompanyBlueprint } from "../../src/lib/ai/company";
import { resetCompanyDemo, restartCompany } from "../../src/lib/company/restart";
import { deleteCompanyGraph } from "../../src/lib/graph";
import { deleteCompanyCoachTurns } from "../../src/lib/memory";
import { deleteVectors } from "../../src/lib/retrieval/vector";
import { createSharedCompany, addStudentMessage, getPracticeTask, joinSharedCompanyByCode, getMessages,
  previewPracticeTask, setActiveRole, startPracticeTask } from "../../src/lib/stage2/store";
import { getLearningStyle, lastingLearningStyle, learnerIdentity, removeLearningStyle, saveLearningStyle } from "../../src/lib/learner-preferences";
import { companySourceIds, saveDocument, savePassage } from "../../src/lib/storage/db";

const opened: DatabaseSync[] = [];
beforeEach(() => vi.clearAllMocks());
afterEach(() => { for (const db of opened.splice(0)) db.close(); });

function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE documents (id TEXT PRIMARY KEY, company_id TEXT, role_id TEXT, title TEXT NOT NULL, url TEXT, kind TEXT NOT NULL, uploaded INTEGER NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE passages (id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE, company_id TEXT, role_id TEXT, title TEXT NOT NULL, url TEXT, location TEXT, text TEXT NOT NULL, uploaded INTEGER NOT NULL, created_at TEXT NOT NULL);
    CREATE VIRTUAL TABLE passages_fts USING fts5(id UNINDEXED, text);`);
  opened.push(db);
  const make = (name: string) => {
    const blueprint = fixtureCompanyBlueprint({ preset: "bank", prompt: name, companyName: name, mode: "fixture" });
    const created = createSharedCompany({ blueprint, creatorName: "Student", settings: {
      participantMode: "collaborative", experienceMode: "practice", companyStage: "startup", prompt: name, approvalMode: false,
    } }, db);
    const companyId = blueprint.company.id;
    saveDocument({ id: `doc-${companyId}`, companyId, roleId: "customer-support", title: name, url: null, kind: "text", uploaded: true }, db);
    savePassage({ id: `passage-${companyId}`, documentId: `doc-${companyId}`, companyId, roleId: "customer-support",
      title: name, url: null, location: "Uploaded text", text: `${name} demo information about a customer support request.`, uploaded: true }, db);
    addStudentMessage(created.participant, { roleId: "customer-support", kind: "prd", text: `${name} needs a feature.` }, db);
    return { companyId, owner: created.participant, joinCode: created.joinCode };
  };
  const first = make("First bank");
  const second = make("Second bank");
  return { db, first: first.companyId, second: second.companyId, owner: first.owner, firstCode: first.joinCode };
}

describe("company restart", () => {
  it("recognizes explicit lasting styles and keeps a stable browser learner identity", () => {
    expect(lastingLearningStyle("From now on, use Minecraft analogies when teaching me.")).toBe("Use Minecraft analogies when explaining concepts.");
    expect(lastingLearningStyle("Explain this one with Minecraft analogies.")).toBeNull();
    const first = learnerIdentity(new Request("http://localhost/"));
    expect(first.setCookie).toContain("hacktx_learner=");
    const cookie = first.setCookie!.split(";")[0];
    expect(learnerIdentity(new Request("http://localhost/", { headers: { cookie } })).key).toBe(first.key);
  });

  it("removes a saved style without changing the company", () => {
    const { db, first } = setup();
    saveLearningStyle(first, "learner", "Use Minecraft analogies when explaining concepts.", db);
    expect(getLearningStyle(first, "learner", db)).toContain("Minecraft");
    removeLearningStyle(first, "learner", db);
    expect(getLearningStyle(first, "learner", db)).toBeNull();
    expect(db.prepare("SELECT id FROM stage2_companies WHERE id = ?").get(first)).toBeDefined();
  });
  it("deletes only the chosen company across local storage and external indexes", async () => {
    const { db, first, second } = setup();
    await restartCompany(first, db);
    expect(deleteVectors).toHaveBeenCalledWith([`passage-${first}`]);
    expect(deleteCompanyGraph).toHaveBeenCalledWith(first, [`doc-${first}`], [`passage-${first}`]);
    expect(deleteCompanyCoachTurns).toHaveBeenCalledWith(first);
    expect(db.prepare("SELECT id FROM stage2_companies WHERE id = ?").get(first)).toBeUndefined();
    expect(db.prepare("SELECT id FROM stage2_messages WHERE company_id = ?").all(first)).toHaveLength(0);
    expect(companySourceIds(first, db)).toEqual({ documentIds: [], passageIds: [] });
    expect(db.prepare("SELECT id FROM passages_fts WHERE id = ?").get(`passage-${first}`)).toBeUndefined();
    expect(db.prepare("SELECT id FROM stage2_companies WHERE id = ?").get(second)).toBeDefined();
    expect(companySourceIds(second, db).passageIds).toEqual([`passage-${second}`]);
  });

  it("keeps local data available to retry if an external delete fails", async () => {
    const { db, first } = setup();
    vi.mocked(deleteVectors).mockRejectedValueOnce(new Error("Milvus unavailable"));
    await expect(restartCompany(first, db)).rejects.toThrow("Milvus unavailable");
    expect(db.prepare("SELECT id FROM stage2_companies WHERE id = ?").get(first)).toBeDefined();
    expect(companySourceIds(first, db).passageIds).toEqual([`passage-${first}`]);
  });

  it("resets only demo work, rotates the code, and retains the company and creator", async () => {
    const { db, first, second, owner, firstCode } = setup();
    const guest = joinSharedCompanyByCode({ joinCode: firstCode, displayName: "Guest" }, db);
    saveLearningStyle(first, "learner", "Use Minecraft analogies when explaining concepts.", db);
    const result = await resetCompanyDemo(owner, db);
    expect(result.joinCode).not.toBe(firstCode);
    expect(() => joinSharedCompanyByCode({ joinCode: firstCode, displayName: "Late" }, db)).toThrow();
    expect(db.prepare("SELECT id FROM stage2_companies WHERE id = ?").get(first)).toBeDefined();
    expect(db.prepare("SELECT id FROM stage2_participants WHERE id = ?").get(owner.id)).toBeDefined();
    expect(db.prepare("SELECT id FROM stage2_participants WHERE id = ?").get(guest.participant.id)).toBeUndefined();
    expect(getMessages(first, db)).toHaveLength(0);
    expect(getLearningStyle(first, "learner", db)).toBeNull();
    expect(companySourceIds(first, db).passageIds).toHaveLength(0);
    expect(companySourceIds(second, db).passageIds).toHaveLength(1);
  });

  it("removes every active team Practice part and handoff on Restart demo", async () => {
    const { db, first, second, owner, firstCode } = setup();
    const guest = joinSharedCompanyByCode({ joinCode: firstCode, displayName: "Engineer" }, db).participant;
    setActiveRole(owner, "customer-support", db);
    setActiveRole(guest, "software-engineer", db);
    previewPracticeTask(owner, db);
    const active = startPracticeTask(owner, db);
    expect(active?.parts).toHaveLength(2);
    expect(getMessages(first, db).length).toBeGreaterThan(0);
    await resetCompanyDemo(owner, db);
    expect(getPracticeTask(first, db)).toBeNull();
    expect(db.prepare("SELECT id FROM stage2_practice_parts WHERE task_id = ?").all(active!.id)).toHaveLength(0);
    expect(getMessages(first, db)).toHaveLength(0);
    expect(db.prepare("SELECT id FROM stage2_participants WHERE id = ?").get(guest.id)).toBeUndefined();
    expect(db.prepare("SELECT id FROM stage2_companies WHERE id = ?").get(first)).toBeDefined();
    expect(db.prepare("SELECT id FROM stage2_companies WHERE id = ?").get(second)).toBeDefined();
  });
});
