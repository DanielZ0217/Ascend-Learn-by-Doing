import {
  companyBlueprintSchema,
  learningSessionSchema,
  roleIds,
  sourceExcerptSchema,
  type Assignment,
  type CompanyBlueprint,
  type ConversationTurn,
  type LearningSession,
  type Review,
  type RoleId,
  type SourceExcerpt,
  type Submission,
} from "@/lib/contracts";

type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const companyKey = (companyId: string) => `hacktx:company:${companyId}`;
export const sessionKey = (companyId: string) => `hacktx:session:${companyId}`;
export const workspaceKey = (companyId: string) => `hacktx:workspace:${companyId}`;

export type RolePreferences = {
  topic: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  entryMode: "teach-first" | "task-first";
};

export type WorkspacePreferences = {
  roles: Partial<Record<RoleId, RolePreferences>>;
  materialText: string;
  materialSources: SourceExcerpt[];
  materialTitle?: string;
  materialMode?: "indexed" | "local";
};

export const emptyPreferences = (): WorkspacePreferences => ({ roles: {}, materialText: "", materialSources: [] });

export function readBlueprint(storage: BrowserStorage, companyId: string): CompanyBlueprint | null {
  try {
    const raw = storage.getItem(companyKey(companyId));
    if (!raw) return null;
    const parsed = companyBlueprintSchema.safeParse(JSON.parse(raw));
    return parsed.success && parsed.data.company.id === companyId ? parsed.data : null;
  } catch { return null; }
}

export function createSession(blueprint: CompanyBlueprint): LearningSession {
  return {
    schemaVersion: 1,
    company: blueprint.company,
    blueprint,
    activeRole: null,
    assignments: [],
    drafts: {},
    turns: [],
    submissions: [],
    reviews: [],
  };
}

export function readSession(storage: BrowserStorage, blueprint: CompanyBlueprint): LearningSession {
  try {
    const raw = storage.getItem(sessionKey(blueprint.company.id));
    if (!raw) return createSession(blueprint);
    const parsed = learningSessionSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || parsed.data.company.id !== blueprint.company.id) return createSession(blueprint);
    return { ...parsed.data, company: blueprint.company, blueprint };
  } catch { return createSession(blueprint); }
}

export function saveSession(storage: BrowserStorage, session: LearningSession): void {
  storage.setItem(sessionKey(session.company.id), JSON.stringify(session));
}

export function resetSession(storage: BrowserStorage, companyId: string): void {
  storage.removeItem(sessionKey(companyId));
  storage.removeItem(workspaceKey(companyId));
}

export function readPreferences(storage: BrowserStorage, companyId: string): WorkspacePreferences {
  try {
    const raw = storage.getItem(workspaceKey(companyId));
    if (!raw) return emptyPreferences();
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return emptyPreferences();
    const value = data as Record<string, unknown>;
    const roles: WorkspacePreferences["roles"] = {};
    if (value.roles && typeof value.roles === "object") {
      for (const roleId of roleIds) {
        const role = (value.roles as Record<string, unknown>)[roleId];
        if (!role || typeof role !== "object") continue;
        const candidate = role as Record<string, unknown>;
        if (typeof candidate.topic !== "string" || candidate.topic.length > 300) continue;
        if (!(["beginner", "intermediate", "advanced"] as unknown[]).includes(candidate.difficulty)) continue;
        if (!(["teach-first", "task-first"] as unknown[]).includes(candidate.entryMode)) continue;
        roles[roleId] = candidate as RolePreferences;
      }
    }
    return {
      roles,
      materialText: typeof value.materialText === "string" ? value.materialText.slice(0, 20000) : "",
      materialSources: Array.isArray(value.materialSources) ? sourceExcerptSchema.array().safeParse(value.materialSources.slice(0, 12)).data ?? [] : [],
      materialTitle: typeof value.materialTitle === "string" ? value.materialTitle.slice(0, 120) : undefined,
      materialMode: value.materialMode === "indexed" || value.materialMode === "local" ? value.materialMode : undefined,
    };
  } catch { return emptyPreferences(); }
}

export function savePreferences(storage: BrowserStorage, companyId: string, preferences: WorkspacePreferences): void {
  storage.setItem(workspaceKey(companyId), JSON.stringify(preferences));
}

export function assignmentForRole(session: LearningSession, roleId: RoleId): Assignment | undefined {
  return [...session.assignments].reverse().find((assignment) => assignment.roleId === roleId);
}

export function appendAssignment(session: LearningSession, assignment: Assignment): LearningSession {
  return { ...session, activeRole: assignment.roleId, assignments: [...session.assignments, assignment],
    drafts: { ...session.drafts, [assignment.id]: assignment.kind === "code" ? assignment.starterCode : "" } };
}

export function appendTurn(session: LearningSession, turn: ConversationTurn): LearningSession {
  return { ...session, turns: [...session.turns, turn] };
}

export function turnsForChannel(turns: ConversationTurn[], channel: "mentor" | "customer"): ConversationTurn[] {
  return turns.filter((turn) => turn.speaker === channel || (turn.speaker === "student" && turn.id.startsWith(`${channel}-student-`)));
}

export function appendSubmission(session: LearningSession, submission: Submission, review: Review): LearningSession {
  return { ...session, submissions: [...session.submissions, submission], reviews: [...session.reviews, review] };
}

export function nextAttempt(session: LearningSession, assignmentId: string): { attempt: number; previousSubmissionId?: string } {
  const previous = [...session.submissions].reverse().find((item) => item.assignmentId === assignmentId);
  return { attempt: previous ? previous.attempt + 1 : 1, previousSubmissionId: previous?.id };
}
