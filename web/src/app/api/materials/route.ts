import { roleIdSchema } from "@/lib/contracts";
import { ingestContent } from "@/lib/retrieval/ingest";
import { apiError } from "@/lib/ai/http";
import { Stage2Error, assertSameOrigin, authenticate } from "@/lib/stage2/store";
import { z } from "zod";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const form = await request.formData();
    const companyId = z.uuid().parse(form.get("companyId"));
    authenticate(request, companyId);
    const role = form.get("roleId");
    const roleId = role ? roleIdSchema.parse(role) : null;
    const suppliedTitle = String(form.get("title") ?? "").trim().slice(0, 100);
    const file = form.get("file");
    const text = String(form.get("text") ?? "").trim();
    if (file instanceof File) {
      if (file.size > 10_000_000 || !(file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
        return Response.json({ error: "Upload one text-based PDF smaller than 10 MB." }, { status: 400 });
      }
      const resolvedTitle = suppliedTitle || file.name.slice(0, 100);
      const result = await ingestContent({ companyId, roleId, title: resolvedTitle,
        kind: "pdf", bytes: new Uint8Array(await file.arrayBuffer()), uploaded: true });
      return Response.json({ ...result, title: resolvedTitle });
    }
    if (text.length < 60 || text.length > 100_000) return Response.json({ error: "Paste 60–100,000 characters of study material." }, { status: 400 });
    const resolvedTitle = suppliedTitle || "Study material";
    const result = await ingestContent({ companyId, roleId, title: resolvedTitle,
      kind: "text", text, uploaded: true });
    return Response.json({ ...result, title: resolvedTitle });
  } catch (error) {
    if (error instanceof Stage2Error || error instanceof z.ZodError) return apiError(error);
    const message = error instanceof Error ? error.message : "Material could not be indexed.";
    return Response.json({ error: message }, { status: 400 });
  }
}
