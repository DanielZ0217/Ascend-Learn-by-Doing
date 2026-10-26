import { afterEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { roleIds } from "../../../src/lib/contracts";

vi.mock("server-only", () => ({}));

import { fixtureCompanyBlueprint } from "../../../src/lib/ai/company";
import { makeCompanyEvent } from "../../../src/lib/stage2/events";
import {
  addMessage, addStudentMessage, advanceRun, authenticate, beginPause,
  createSharedCompany, decideMessage, ensureRun, getArtifact, getCompanyForParticipant,
  getEvents, getMessages, getRun, joinSharedCompany, listParticipants, resumeRun,
  sessionCookie,
} from "../../../src/lib/stage2/store";

const opened: DatabaseSync[] = [];
afterEach(() => { for (const db of opened.splice(0)) db.close(); });

function setup(preset: "bank" | "restaurant" = "bank") {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  opened.push(db);
  const blueprint = fixtureCompanyBlueprint({ preset, prompt: "A realistic workplace", mode: "fixture",
    participantMode: "collaborative", experienceMode: "real-world", companyStage: "mature" });
  const created = createSharedCompany({ blueprint, creatorName: "Alex", settings: {
    participantMode: "collaborative", experienceMode: "real-world", companyStage: "mature",
    prompt: "A realistic workplace", approvalMode: false,
  } }, db);
  return { db, blueprint, created };
}

describe("Stage 2 company boundary", () => {
  it("admits five named students and scopes the invite and session to one company", () => {
    const { db, blueprint, created } = setup();
    const companyId = blueprint.company.id;
    const ownerCookie = sessionCookie(companyId, created.sessionToken).split(";")[0];
    const owner = authenticate(new Request("http://localhost/api/stage2", { headers: { cookie: ownerCookie } }), companyId, db);
    expect(owner.displayName).toBe("Alex");
    const joined = joinSharedCompany({ companyId, inviteToken: created.inviteToken, displayName: "Sam" }, db);
    expect(joined.participant.id).not.toBe(owner.id);
    for (const name of ["Third", "Fourth", "Fifth"]) joinSharedCompany({ companyId, inviteToken: created.inviteToken, displayName: name }, db);
    expect(listParticipants(companyId, db)).toHaveLength(5);
    expect(() => joinSharedCompany({ companyId, inviteToken: created.inviteToken, displayName: "Sixth" }, db)).toThrowError(/no open student seat/i);
    expect(() => joinSharedCompany({ companyId, inviteToken: "wrong", displayName: "Impostor" }, db)).toThrowError(/invalid/i);
    expect(getCompanyForParticipant(owner, db).blueprint.company.id).toBe(companyId);
    expect(() => authenticate(new Request("http://localhost/api/stage2", { headers: { cookie: ownerCookie } }), crypto.randomUUID(), db)).toThrow();
  });

  it("keeps creator rights on the original browser session, never on the shared legacy invite", () => {
    const { db, blueprint, created } = setup();
    const guest = joinSharedCompany({ companyId: blueprint.company.id, inviteToken: created.inviteToken, displayName: "Sam" }, db);
    expect(guest.isOwner).toBe(false);
    db.prepare("UPDATE stage2_participants SET last_seen = 0 WHERE id = ?").run(created.participant.id);
    const ownerCookie = sessionCookie(blueprint.company.id, created.sessionToken).split(";")[0];
    const recovered = authenticate(new Request("http://localhost/api/stage2", { headers: { cookie: ownerCookie } }), blueprint.company.id, db);
    expect(recovered.id).toBe(created.participant.id);
  });

  it("keeps artifacts company-scoped and records actual student authors", () => {
    const first = setup();
    const secondBlueprint = fixtureCompanyBlueprint({ preset: "restaurant", prompt: "Restaurant", mode: "fixture" });
    const second = createSharedCompany({ blueprint: secondBlueprint, creatorName: "Morgan", settings: {
      participantMode: "single", experienceMode: "practice", companyStage: "startup", prompt: "Restaurant", approvalMode: false,
    } }, first.db);
    const message = addStudentMessage(first.created.participant, { roleId: "customer-support", kind: "prd", text: "Customer saw two payment notices; transaction duplication is unconfirmed." }, first.db);
    expect(message.authorName).toBe("Alex");
    expect(message.source).toBe("student");
    expect(getArtifact(first.created.participant, message.artifactId!, first.db).body).toContain("unconfirmed");
    expect(() => getArtifact(second.participant, message.artifactId!, first.db)).toThrowError(/unavailable/i);
    expect(getMessages(secondBlueprint.company.id, first.db)).toHaveLength(0);
  });
});

describe("Stage 2 run and approval gateway", () => {
  it("generates distinct industry events and stage constraints", () => {
    const bank = fixtureCompanyBlueprint({ preset: "bank", prompt: "Bank", mode: "fixture", companyStage: "startup" });
    const restaurant = fixtureCompanyBlueprint({ preset: "restaurant", prompt: "Restaurant", mode: "fixture", companyStage: "startup" });
    const chips = fixtureCompanyBlueprint({ preset: "semiconductor", prompt: "Chips", mode: "fixture", companyStage: "mature" });
    expect(makeCompanyEvent(bank, 1).headline).toContain("payment");
    expect(makeCompanyEvent(restaurant, 1).headline).toContain("pickup");
    expect(makeCompanyEvent(chips, 1).headline).toContain("lot traceability");
    expect(makeCompanyEvent(bank, 1).detail).toContain("small team's capacity");
    expect(makeCompanyEvent(restaurant, 1).detail).toContain("small team's capacity");
    expect(makeCompanyEvent(chips, 1).detail).toContain("established operations");
    for (const preset of ["bank", "restaurant", "semiconductor", "software", "custom"] as const) {
      const company = fixtureCompanyBlueprint({ preset, prompt: "Workplace", mode: "fixture" });
      expect(new Set(Array.from({ length: 5 }, (_, index) => makeCompanyEvent(company, index + 1).roleId)))
        .toEqual(new Set(roleIds));
    }
  });
  it("advances one event per interval, shares Pause, and erases only the run after expiry", () => {
    const { db, blueprint, created } = setup();
    const companyId = blueprint.company.id;
    ensureRun(companyId, db, 100_000);
    const make = (sequence: number) => makeCompanyEvent(blueprint, sequence);
    expect(advanceRun(companyId, make, db, 100_000)?.sequence).toBe(1);
    expect(advanceRun(companyId, make, db, 100_001)).toBeNull();
    expect(advanceRun(companyId, make, db, 105_000)?.sequence).toBe(2);
    expect(getEvents(companyId, db)).toHaveLength(2);
    const paused = beginPause(created.participant, "software-engineer", db);
    expect(paused.created).toBe(true);
    expect(beginPause(created.participant, "customer-support", db).created).toBe(false);
    expect(getRun(companyId, db)?.pauseRoleId).toBe("software-engineer");
    expect(advanceRun(companyId, make, db, 200_000)).toBeNull();
    resumeRun(created.participant, db);
    expect(getRun(companyId, db)?.status).toBe("running");
    db.prepare("UPDATE stage2_participants SET last_seen = 0 WHERE company_id = ?").run(companyId);
    expect(listParticipants(companyId, db)).toHaveLength(0);
    expect(getRun(companyId, db)).toBeNull();
    expect(getEvents(companyId, db)).toHaveLength(0);
    expect(getCompanyForParticipant(created.participant, db).blueprint.company.id).toBe(companyId);
  });

  it("keeps a bounded history while sequence IDs continue to advance", () => {
    const { db, blueprint } = setup();
    const companyId = blueprint.company.id;
    ensureRun(companyId, db, 100_000);
    for (let sequence = 1; sequence <= 125; sequence++) {
      expect(advanceRun(companyId, (next) => makeCompanyEvent(blueprint, next), db, 100_000 + (sequence - 1) * 5_000)?.sequence).toBe(sequence);
    }
    const events = getEvents(companyId, db);
    expect(events).toHaveLength(120);
    expect(events[0].sequence).toBe(6);
    expect(events.at(-1)?.sequence).toBe(125);
  });

  it("requires a real approval decision for a pending AI handoff", () => {
    const { db, blueprint, created } = setup();
    const message = addMessage({ companyId: blueprint.company.id, threadId: "customer-feature", authorType: "agent",
      authorId: "software-engineer", authorName: "Maya Chen", roleId: "software-engineer", recipientRoleId: "customer-support",
      kind: "handoff", source: "fixture", text: "Can support confirm which notification was duplicated?", status: "pending", artifactId: null }, db);
    expect(getMessages(blueprint.company.id, db)[0].status).toBe("pending");
    decideMessage(created.participant, message.id, false, db);
    expect(getMessages(blueprint.company.id, db)[0].status).toBe("rejected");
    expect(() => decideMessage(created.participant, message.id, true, db)).toThrowError(/no longer waiting/i);
  });
});
