import { SKILLS } from './skillGraph';
import coursesRaw from '@/data/courses.json';

export interface CourseRecord {
  title: string;
  provider: string;
  level: string;
  rating: number | null;
  popularity: number;
  is_paid: boolean;
  price: number | null;
  duration_hours: number | null;
  url: string;
  skills: string[];
}

const COURSES = coursesRaw as CourseRecord[];

const STOPWORDS = new Set([
  'i', 'want', 'to', 'a', 'the', 'for', 'and', 'of', 'in', 'on', 'get', 'become',
  'learn', 'study', 'my', 'me', 'is', 'am', 'be', 'with', 'an', 'as', 'at', 'so',
  'that', 'this', 'it', 'or', 'from', 'about', 'wanna', 'gonna', 'please', 'help',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Lightweight goal -> skill matcher (browser port of the Python TF-IDF cosine
 * similarity matcher). Scores each skill by weighted keyword-token overlap
 * with the goal text: exact keyword-phrase hits score highest, single shared
 * tokens score lower — this keeps "java" from matching "javascript" while
 * still letting looser goal phrasing find the right skill.
 */
export function parseGoal(goalText: string, topK = 3): [string, number][] {
  const goalTokens = new Set(tokenize(goalText));
  const goalLower = ' ' + goalText.toLowerCase() + ' ';

  const scored: [string, number][] = [];
  for (const [id, meta] of Object.entries(SKILLS)) {
    let score = 0;
    for (const kw of meta.keywords) {
      const kwLower = kw.trim().toLowerCase();
      if (!kwLower) continue;
      const pattern = kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = /^[a-z0-9+#. ]+$/.test(kwLower)
        ? new RegExp(`\\b${pattern}\\b`)
        : null;
      const hit = re ? re.test(goalLower) : goalLower.includes(kwLower);
      if (hit) score += 2 + kwLower.split(' ').length * 0.5; // phrase hits score highest
    }
    // weaker signal: shared generic tokens with the skill label
    const labelTokens = tokenize(meta.label);
    for (const t of labelTokens) {
      if (goalTokens.has(t)) score += 0.3;
    }
    if (score > 0) scored.push([id, score]);
  }

  scored.sort((a, b) => b[1] - a[1]);
  const max = scored[0]?.[1] ?? 1;
  return scored.slice(0, topK).map(([id, s]) => [id, Math.min(1, s / (max || 1))]);
}

export function recommendCourses(
  skillId: string,
  opts: { level?: string; freeOnly?: boolean; topN?: number } = {},
): CourseRecord[] {
  const { level, freeOnly = false, topN = 4 } = opts;
  const pool = COURSES.filter((c) => c.skills.includes(skillId));

  const applyFilters = (list: CourseRecord[]) => {
    let out = list;
    if (freeOnly) out = out.filter((c) => !c.is_paid);
    if (level && level !== 'All Levels') {
      out = out.filter((c) => c.level === level || c.level === 'All Levels');
    }
    return out;
  };

  let filtered = applyFilters(pool);
  if (filtered.length === 0) filtered = freeOnly ? pool.filter((c) => !c.is_paid) : pool;

  const maxPop = Math.max(1, ...filtered.map((c) => c.popularity || 0));
  const scored = filtered.map((c) => {
    const popNorm = (c.popularity || 0) / maxPop;
    const score = (c.rating || 0) * 0.7 + popNorm * 5 * 0.3;
    return { ...c, _score: score };
  });
  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, topN);
}
