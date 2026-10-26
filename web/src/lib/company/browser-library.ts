import { companyBlueprintSchema, type CompanyBlueprint } from "@/lib/contracts";

export type SavedCompany = CompanyBlueprint["company"];

export function readSavedCompanies(storage: Pick<Storage, "length" | "key" | "getItem">): SavedCompany[] {
  const companies: SavedCompany[] = [];
  const activeId = storage.getItem("hacktx:active-company");
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key?.startsWith("hacktx:company:")) continue;
    try {
      const raw = storage.getItem(key);
      if (!raw) continue;
      const blueprint = companyBlueprintSchema.parse(JSON.parse(raw));
      if (key !== `hacktx:company:${blueprint.company.id}`) continue;
      companies.push(blueprint.company);
    } catch { /* Ignore stale or malformed browser entries. */ }
  }
  return companies.sort((left, right) => {
    if (left.id === activeId) return -1;
    if (right.id === activeId) return 1;
    return left.name.localeCompare(right.name);
  });
}
