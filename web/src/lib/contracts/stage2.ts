import { z } from "zod";

export const participantModeSchema = z.enum(["single", "collaborative"]);
export const experienceModeSchema = z.enum(["practice", "real-world"]);
export const companyStageSchema = z.enum(["startup", "mature"]);
export const stage2RoleIdSchema = z.enum([
  "software-engineer", "sales-marketing", "customer-support", "product-manager", "data-analyst",
]);

export const stage2SettingsSchema = z.object({
  participantMode: participantModeSchema,
  experienceMode: experienceModeSchema,
  companyStage: companyStageSchema,
  prompt: z.string().trim().max(3000),
  approvalMode: z.boolean().default(false),
  generationMode: z.enum(["live", "fixture"]).optional(),
});

export const stage2ParticipantSchema = z.object({
  id: z.uuid(),
  companyId: z.uuid(),
  displayName: z.string().trim().min(1).max(40),
  activeRole: stage2RoleIdSchema.nullable(),
  lastSeen: z.number().int().nonnegative(),
});

export const stage2MessageSchema = z.object({
  id: z.uuid(),
  companyId: z.uuid(),
  threadId: z.string().min(1).max(100),
  authorType: z.enum(["student", "agent"]),
  authorId: z.string().min(1).max(100),
  authorName: z.string().min(1).max(80),
  roleId: stage2RoleIdSchema,
  recipientRoleId: stage2RoleIdSchema.nullable(),
  kind: z.enum(["message", "prd", "clarification", "handoff", "implementation"]),
  source: z.enum(["student", "bedrock", "meta", "fixture"]),
  text: z.string().trim().min(1).max(12000),
  status: z.enum(["delivered", "pending", "rejected"]),
  artifactId: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
});

export const stage2EventSchema = z.object({
  id: z.uuid(),
  companyId: z.uuid(),
  sequence: z.number().int().positive(),
  roleId: stage2RoleIdSchema,
  issueKind: z.string().min(1).max(80),
  taskTopic: z.string().min(1).max(300),
  headline: z.string().min(1).max(240),
  detail: z.string().min(1).max(1000),
  outcome: z.string().min(1).max(240),
  provenance: z.literal("simulated"),
  createdAt: z.iso.datetime(),
});

export type ParticipantMode = z.infer<typeof participantModeSchema>;
export type ExperienceMode = z.infer<typeof experienceModeSchema>;
export type CompanyStage = z.infer<typeof companyStageSchema>;
export type Stage2Settings = z.infer<typeof stage2SettingsSchema>;
export type Stage2Participant = z.infer<typeof stage2ParticipantSchema>;
export type Stage2Message = z.infer<typeof stage2MessageSchema>;
export type Stage2Event = z.infer<typeof stage2EventSchema>;
