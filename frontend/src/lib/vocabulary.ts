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

// --- Search helpers ---
export type SearchItem = { korean: string; english: string; unitId: string };

let searchIndexPromise: Promise<SearchItem[]> | null = null;

async function buildSearchIndex(): Promise<SearchItem[]> {
  const entries = Object.entries(unitModules);
  const results = await Promise.all(
    entries.map(async ([path, loader]) => {
      const unitId = getUnitIdFromPath(path);
      const mod = (await loader()) as { default: VocabItem[] };
      const data = Array.isArray((mod as any).default) ? (mod as any).default : (mod as any);
      const items = (data as VocabItem[]).map((v) => ({ ...v, unitId }));
      return items;
    })
  );
  // Flatten and sort for stable output
  return results.flat().sort((a, b) => {
    const na = numericUnit(a.unitId) ?? Number.MAX_SAFE_INTEGER;
    const nb = numericUnit(b.unitId) ?? Number.MAX_SAFE_INTEGER;
    return na - nb;
  });
}

async function ensureSearchIndex(): Promise<SearchItem[]> {
  if (!searchIndexPromise) {
    searchIndexPromise = buildSearchIndex();
  }
  return searchIndexPromise;
}

export async function searchVocabulary(query: string, limit = 50): Promise<SearchItem[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const idx = await ensureSearchIndex();
  const matches: SearchItem[] = [];
  for (const item of idx) {
    const k = item.korean.toLowerCase();
    const e = item.english.toLowerCase();
    if (k.includes(q) || e.includes(q)) {
      matches.push(item);
      if (matches.length >= limit) break;
    }
  }
  return matches;
}

// --- Load all vocabulary from all units ---
export type VocabItemWithUnit = VocabItem & {
  unitId: string;
  exampleKorean?: string;
  exampleEnglish?: string;
};

let allVocabPromise: Promise<VocabItemWithUnit[]> | null = null;

async function buildAllVocab(): Promise<VocabItemWithUnit[]> {
  const entries = Object.entries(unitModules);
  const results = await Promise.all(
    entries.map(async ([path, loader]) => {
      const unitId = getUnitIdFromPath(path);
      const mod = (await loader()) as { default: VocabItemWithUnit[] };
      const data = Array.isArray((mod as any).default) ? (mod as any).default : (mod as any);
      return (data as VocabItemWithUnit[]).map((v) => ({ ...v, unitId }));
    })
  );
  return results.flat();
}

export async function loadAllVocabulary(): Promise<VocabItemWithUnit[]> {
  if (!allVocabPromise) {
    allVocabPromise = buildAllVocab();
  }
  return allVocabPromise;
}
