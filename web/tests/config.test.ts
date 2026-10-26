import { describe, expect, it } from "vitest";
import { environmentSchema, publicProviderStatus } from "../src/lib/config-schema";

describe("public configuration boundary", () => {
  it("never includes credentials or unrelated environment values in public status", () => {
    const config = environmentSchema.parse({ META_API_KEY: "test-meta-secret", AWS_BEARER_TOKEN_BEDROCK: "test-bedrock-secret", SERPAPI_API_KEY: "test-search-secret", UNRELATED_SECRET: "test-unrelated-secret" });
    const status = publicProviderStatus(config);
    const serialized = JSON.stringify(status);
    for (const secret of ["test-meta-secret", "test-bedrock-secret", "test-search-secret", "test-unrelated-secret"]) expect(serialized).not.toContain(secret);
    expect(status.text.configured).toBe(true);
    expect(status.verification).toBe("configuration-only");
  });

  it("reports blank credentials as unconfigured without claiming live success", () => {
    const status = publicProviderStatus(environmentSchema.parse({ META_API_KEY: " ", SERPAPI_API_KEY: "" }));
    expect(status.text.configured).toBe(false);
    expect(status.research.configured).toBe(false);
    expect(status.verification).toBe("configuration-only");
  });

  it("rejects request settings that would bypass the prototype's bounded configuration", () => {
    expect(environmentSchema.safeParse({ AI_MAX_OUTPUT_TOKENS: "999999" }).success).toBe(false);
    expect(environmentSchema.safeParse({ SEARCH_MAX_QUERIES_PER_TASK: "100" }).success).toBe(false);
    expect(environmentSchema.safeParse({ AI_REQUEST_TIMEOUT_MS: "0" }).success).toBe(false);
  });
});
