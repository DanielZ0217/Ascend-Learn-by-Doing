import { z } from "zod";
import { apiError } from "@/lib/ai/http";
import { authenticate, getArtifact } from "@/lib/stage2/store";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const companyId = z.uuid().parse(url.searchParams.get("companyId"));
    const artifactId = z.uuid().parse(url.searchParams.get("artifactId"));
    const participant = authenticate(request, companyId);
    const response = Response.json({ artifact: getArtifact(participant, artifactId) });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) { return apiError(error); }
}
