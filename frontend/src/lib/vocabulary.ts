export type VocabItem = { korean: string; english: string };

// Discover all unit JSON files under assets. Vite replaces this at build time.
const unitModules = import.meta.glob('../assets/vocabulary/A1/*.json');

function getUnitIdFromPath(p: string): string {
  // Example: ../assets/vocabulary/A1/voc_1.json -> voc_1
  const match = p.match(/([\\/])([^\\/]+)\.json$/);
  return match ? match[2] : p;
}

function numericUnit(a: string): number | null {
  const m = a.match(/voc_(\d+)/);
  return m ? Number(m[1]) : null;
}

export function listUnitIds(): string[] {
  const ids = Object.keys(unitModules).map(getUnitIdFromPath);
  // Sort by numeric suffix if present, otherwise lexicographically
  return ids.sort((x, y) => {
    const nx = numericUnit(x);
    const ny = numericUnit(y);
    if (nx != null && ny != null) return nx - ny;
    if (nx != null) return -1;
    if (ny != null) return 1;
    return x.localeCompare(y);
  });
}

export type UnitMeta = { id: string; name: string; description?: string };

export function getUnitsMeta(): UnitMeta[] {
  return listUnitIds().map((id) => {
    const n = numericUnit(id);
    return { id, name: n != null ? `Unit ${n}` : id };
  });
}

export async function loadUnit(unitId: string): Promise<VocabItem[]> {
  // Find the module path whose basename matches unitId
  const entry = Object.entries(unitModules).find(([path]) => getUnitIdFromPath(path) === unitId);
  if (!entry) throw new Error(`Unit not found: ${unitId}`);
  const [, loader] = entry;
  const mod = (await loader()) as { default: VocabItem[] };
  const data = Array.isArray((mod as any).default) ? (mod as any).default : mod;
  return data as VocabItem[];
}
