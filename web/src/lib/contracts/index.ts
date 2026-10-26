import { z } from "zod";
export * from "./stage2";

export const roleIds = [
  "software-engineer", "sales-marketing", "customer-support", "product-manager", "data-analyst",
] as const;
export const roleIdSchema = z.enum(roleIds);
export type RoleId = z.infer<typeof roleIdSchema>;
export const roleLabels: Record<RoleId, string> = {
  "software-engineer": "Software engineer",
  "sales-marketing": "Sales & marketing",
  "customer-support": "Customer support",
  "product-manager": "Product manager",
  "data-analyst": "Data analyst",
};
const id = z.string().min(1).max(100);
const shortText = z.string().trim().min(1).max(1000);

export const companySchema = z.object({
  id,
  preset: z.enum(["bank", "restaurant", "software", "semiconductor", "custom"]),
  participantMode: z.enum(["single", "collaborative"]).optional(),
  experienceMode: z.enum(["practice", "real-world"]).optional(),
  companyStage: z.enum(["startup", "mature"]).optional(),
  industry: z.string().trim().min(1).max(120).optional(),
  name: z.string().trim().min(1).max(80),
  description: shortText,
  products: z.array(shortText).min(1).max(8),
  customerContext: shortText,
  employeeCount: z.number().int().min(5).max(100000),
  customerCount: z.number().int().min(1).max(10000000),
  roleIds: z.array(roleIdSchema).length(5).refine((roles) => new Set(roles).size === 5, "Company must include each approved role once."),
});
export const agentProfileSchema = z.object({
  roleId: roleIdSchema,
  name: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(100),
  responsibility: shortText,
  coachingStyle: shortText,
  evaluationFocus: z.array(shortText).min(1).max(6),
  starterTopics: z.array(shortText).min(1).max(6),
});
export const companyBlueprintSchema = z.object({
  company: companySchema,
  scenario: shortText,
  profiles: z.array(agentProfileSchema).length(5).refine(
    (profiles) => new Set(profiles.map((profile) => profile.roleId)).size === 5
      && roleIds.every((roleId) => profiles.some((profile) => profile.roleId === roleId)),
    "Blueprint must include exactly one profile for each role.",
  ),
});
export const learningGoalSchema = z.object({
  roleId: roleIdSchema,
  topic: z.string().trim().min(1).max(300),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  entryMode: z.enum(["teach-first", "task-first"]),
});
export const sourceExcerptSchema = z.object({
  id, title: shortText,
  url: z.url().refine((value) => {
    try { return new URL(value).protocol === "https:"; } catch { return false; }
  }, "Source URL must use HTTPS.").optional(),
  uploadId: id.optional(),
  excerpt: z.string().min(1).max(12000),
  location: z.string().max(200).optional(),
  retrievedAt: z.iso.datetime(),
  provenance: z.enum(["live", "cached", "curated", "uploaded"]),
}).refine((source) => source.provenance === "uploaded" ? Boolean(source.uploadId) : Boolean(source.url), {
  message: "Sources need an HTTPS URL or an uploaded document ID.",
});
export const rubricCriterionSchema = z.object({ id, label: shortText, description: shortText });
const assignmentBase = {
  id, companyId: id, roleId: roleIdSchema, goal: learningGoalSchema,
  title: z.string().min(1).max(160), brief: z.string().min(1).max(12000),
  rubric: z.array(rubricCriterionSchema).min(1).max(8),
  sources: z.array(sourceExcerptSchema).max(8),
};
export const conversationTurnSchema = z.object({
  id, assignmentId: id,
  speaker: z.enum(["student", "customer", "mentor"]),
  text: z.string().min(1).max(12000),
  timestamp: z.iso.datetime(),
  origin: z.enum(["voice", "text"]),
});
export const customerPersonaSchema = z.object({
  name: z.string().min(1).max(80),
  background: shortText, need: shortText,
  objections: z.array(shortText).max(5),
  scenarioGoal: shortText,
});
export const assignmentSchema = z.discriminatedUnion("kind", [
  z.object({ ...assignmentBase, kind: z.literal("code"), language: z.literal("javascript"),
    functionName: z.string().regex(/^[A-Za-z_$][\w$]*$/),
    starterCode: z.string().max(30000),
    checks: z.array(z.object({ id, label: shortText, args: z.array(z.json()), expected: z.json() })).min(1).max(12),
  }),
  z.object({ ...assignmentBase, kind: z.literal("written"),
    responsePrompt: shortText,
    dataset: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))).max(100).optional(),
  }),
  z.object({ ...assignmentBase, kind: z.literal("conversation"), customer: customerPersonaSchema }),
]).refine((assignment) => assignment.roleId === assignment.goal.roleId, {
  message: "Assignment and learning goal must use the same role.", path: ["goal", "roleId"],
});
const submissionBase = { id, assignmentId: id, attempt: z.number().int().min(1), previousSubmissionId: id.optional() };
export const submissionSchema = z.discriminatedUnion("kind", [
  z.object({ ...submissionBase, kind: z.literal("code"), code: z.string().min(1).max(30000) }),
  z.object({ ...submissionBase, kind: z.literal("written"), text: z.string().trim().min(1).max(20000) }),
  z.object({ ...submissionBase, kind: z.literal("conversation"), turns: z.array(conversationTurnSchema).min(1).max(100) }),
]);
export const runResultSchema = z.object({
  status: z.enum(["completed", "error", "timeout", "unavailable"]),
  checks: z.array(z.object({ id, passed: z.boolean(), detail: z.string().max(2000) })).max(12),
  output: z.string().max(10000),
  durationMs: z.number().min(0),
});
export const reviewSchema = z.object({
  submissionId: id,
  criteria: z.array(z.object({ criterionId: id, rating: z.enum(["needs-work", "developing", "meets"]), evidence: shortText, explanation: shortText })).min(1).max(8),
  strengths: z.array(shortText).max(5),
  improvements: z.array(shortText).max(5),
  nextSteps: z.array(shortText).min(1).max(5),
  sourceIds: z.array(id).max(8),
});
export const learningSessionSchema = z.object({
  schemaVersion: z.literal(1),
  company: companySchema,
  blueprint: companyBlueprintSchema.optional(),
  activeRole: roleIdSchema.nullable(),
  assignments: z.array(assignmentSchema),
  drafts: z.record(z.string(), z.string().max(30000)),
  turns: z.array(conversationTurnSchema),
  submissions: z.array(submissionSchema),
  reviews: z.array(reviewSchema),
});
export const meetingPhaseSchema = z.enum(["idle", "walking", "guest-arriving", "ready", "conversation", "review", "returning"]);

export type Company = z.infer<typeof companySchema>;
export type AgentProfile = z.infer<typeof agentProfileSchema>;
export type CompanyBlueprint = z.infer<typeof companyBlueprintSchema>;
export type LearningGoal = z.infer<typeof learningGoalSchema>;
export type SourceExcerpt = z.infer<typeof sourceExcerptSchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
export type Submission = z.infer<typeof submissionSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type RunResult = z.infer<typeof runResultSchema>;
export type LearningSession = z.infer<typeof learningSessionSchema>;
export type ConversationTurn = z.infer<typeof conversationTurnSchema>;
export type MeetingPhase = z.infer<typeof meetingPhaseSchema>;
