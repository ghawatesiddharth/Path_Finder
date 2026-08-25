import { SKILLS, getSubtopics, shortestLearningOrder } from './skillGraph';
import { parseGoal, recommendCourses } from './recommender';
import { searchVideos, searchPlaylists, getPlaylistVideos, findTopicChannel } from './youtube';
import type {
  Course, GenerationParams, LearningPath, PathStage, PathTask, PathType, Skill,
} from '@/types';

const LEVEL_TO_STAGE: Record<string, number> = { Beginner: 0, Intermediate: 1, Advanced: 2, Expert: 2 };
const STAGE_ORDER = ['foundation', 'core', 'advanced'];
const DOMAIN_COLOR: Record<string, 'amber' | 'iris' | 'sage'> = {
  programming: 'iris', data_science: 'sage', web_dev: 'amber',
  cloud: 'iris', business: 'amber', design: 'sage', custom: 'iris',
};
const DOMAIN_ICON: Record<string, string> = {
  programming: 'Code2', data_science: 'BarChart3', web_dev: 'Atom',
  cloud: 'Cloud', business: 'Compass', design: 'Palette', custom: 'Sparkles',
};

function inferKnownSkills(experienceLevel: string, domainHint: string | null): string[] {
  const stageIdx = LEVEL_TO_STAGE[experienceLevel] ?? 0;
  if (stageIdx === 0 || !domainHint) return [];
  const allowed = new Set(STAGE_ORDER.slice(0, stageIdx));
  return Object.entries(SKILLS)
    .filter(([, meta]) => meta.domain === domainHint && allowed.has(meta.level))
    .map(([id]) => id);
}

function cleanTopicPhrase(goalText: string): string {
  const filler = /\b(i want to|i wanna|learn|study|become a|get a|placement|for|the|please|help me)\b/gi;
  const cleaned = goalText.replace(filler, ' ').replace(/\s+/g, ' ').trim();
  const phrase = cleaned || goalText;
  return phrase.replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function buildTasksForSkill(
  skillId: string,
  label: string,
  subtopics: string[],
  courses: ReturnType<typeof recommendCourses>,
  resourceMode: GenerationParams['resourceMode'],
  apiKey: string | null,
): Promise<PathTask[]> {
  const tasks: PathTask[] = [];

  if (courses.length) {
    const best = courses[0];
    tasks.push({
      id: `${skillId}_course`,
      type: 'course',
      label: `Take the foundational course: ${best.title}`,
      provider: best.provider,
      url: best.url,
      thumbnail: null,
      meta: `⭐${best.rating || 'N/A'} · ${best.is_paid ? 'Paid' : 'Free'} · ${best.level}`,
    });
  }

  let videoTasks: PathTask[] = [];
  let mode = resourceMode;

  if (mode === 'playlist') {
    const playlists = await searchPlaylists(`${label} full course`, apiKey, 1);
    if (playlists.length) {
      const pl = playlists[0];
      const items = await getPlaylistVideos(pl.playlistId, apiKey, Math.max(subtopics.length, 8));
      videoTasks = items.map((v, j) => ({
        id: `${skillId}_pl${j}`,
        type: 'video' as const,
        label: v.title,
        provider: `${pl.channel} (playlist)`,
        url: v.url,
        thumbnail: v.thumbnail,
        meta: `Part ${j + 1} of playlist: ${pl.title}`,
      }));
    }
    if (!videoTasks.length) mode = 'same_channel';
  }

  if (mode === 'same_channel' && !videoTasks.length) {
    const channel = await findTopicChannel(label, apiKey);
    videoTasks = await Promise.all(
      subtopics.map(async (sub, j) => {
        let vids = await searchVideos(`${sub} tutorial`, apiKey, 1, channel?.channelId ?? null);
        if (!vids.length && channel) vids = await searchVideos(`${sub} tutorial`, apiKey, 1, null);
        const v = vids[0];
        return {
          id: `${skillId}_sub${j}`,
          type: 'video' as const,
          label: sub,
          provider: v?.channel ?? 'YouTube',
          url: v?.url ?? null,
          thumbnail: v?.thumbnail ?? null,
          meta: v?.title ?? '',
        };
      }),
    );
  }

  if (mode === 'mixed' && !videoTasks.length) {
    videoTasks = await Promise.all(
      subtopics.map(async (sub, j) => {
        const vids = await searchVideos(`${sub} tutorial`, apiKey, 1);
        const v = vids[0];
        return {
          id: `${skillId}_sub${j}`,
          type: 'video' as const,
          label: sub,
          provider: v?.channel ?? 'YouTube',
          url: v?.url ?? null,
          thumbnail: v?.thumbnail ?? null,
          meta: v?.title ?? '',
        };
      }),
    );
  }

  tasks.push(...videoTasks);
  tasks.push({
    id: `${skillId}_project`,
    type: 'project',
    label: `Mini-project: build something using ${label} to reinforce this module`,
    provider: 'Self-practice',
    url: null,
    thumbnail: null,
  });
  return tasks;
}

export interface GeneratedResult {
  learningPath: LearningPath;
  skills: Skill[];
  courses: Course[];
  note?: string;
  matchConfidence: number;
}

export async function generateLearningPath(params: GenerationParams): Promise<GeneratedResult> {
  const { goalText, daysAvailable, experienceLevel, freeOnly, resourceMode, youtubeApiKey } = params;
  const matches = parseGoal(goalText);

  const pathId = `gen_${Date.now()}`;
  const skillsOut: Skill[] = [];
  const coursesOut: Course[] = [];
  let stages: PathStage[];
  let domain: string;
  let matchConfidence = 0;
  let note: string | undefined;
  let goalLabel: string;
  const difficulty: LearningPath['difficulty'] =
    (experienceLevel === 'Expert' ? 'Advanced' : experienceLevel) as LearningPath['difficulty'];

  if (!matches.length) {
    // Generic fallback: no taxonomy overlap — still build a real path from
    // YouTube directly, rather than refusing. Every topic gets *something*.
    const topic = cleanTopicPhrase(goalText);
    goalLabel = topic;
    domain = 'custom';
    const subtopics = [
      `${topic} Basics`, `${topic} Core Concepts`,
      `${topic} Intermediate Concepts`, `${topic} Real-World Applications`,
    ];
    const tasks = await buildTasksForSkill('custom', topic, subtopics, [], resourceMode, youtubeApiKey);
    const weeks = daysAvailable ? Math.max(1, Math.ceil(daysAvailable / 7)) : 4;
    stages = [{
      id: 'custom', index: 1, title: topic,
      description: `A generic basics → core → intermediate → applied progression for "${topic}".`,
      status: 'active', durationWeeks: weeks,
      milestones: tasks.map((t) => t.label),
      prerequisites: [],
      why: `"${topic}" isn't in our curated skill catalog yet, so this path is built directly `
        + `from YouTube search rather than our course dataset.`,
      skillIds: ['gen_custom'],
      tasks,
    }];
    skillsOut.push({
      id: 'gen_custom', name: topic, icon: 'Sparkles', current: 0, target: 100,
      targetLabel: params.purpose, level: experienceLevel, mastered: false,
      nextMilestone: tasks[0]?.label ?? 'Get started', domain: 'Custom',
    });
    note = `No exact catalog match for "${goalText}" — generated a generic YouTube-based path `
      + `instead of blocking. Try mentioning a closer domain (e.g. Python, Java, web development, `
      + `data science) for a richer course-backed path.`;
  } else {
    const [goalSkill, score] = matches[0];
    matchConfidence = score;
    const meta = SKILLS[goalSkill];
    goalLabel = meta.label;
    domain = meta.domain;
    const known = inferKnownSkills(experienceLevel, domain);
    let order = shortestLearningOrder(known, goalSkill);
    if (!order.length) order = [goalSkill];

    const n = order.length;
    const daysPerSkill = daysAvailable ? Math.max(1, Math.floor(daysAvailable / n)) : null;
    let dayCursor = 1;

    stages = await Promise.all(
      order.map(async (sid, i) => {
        const smeta = SKILLS[sid];
        const courses = recommendCourses(sid, { level: experienceLevel, freeOnly, topN: 3 });
        const subtopics = getSubtopics(sid, smeta.label);

        const prereqLabels = smeta.prereqs
          .filter((p) => order.includes(p) || known.includes(p))
          .map((p) => SKILLS[p].label);
        let why = `'${smeta.label}' is needed because `
          + (prereqLabels.length ? `it builds on ${prereqLabels.join(', ')}, ` : '')
          + `and is a direct prerequisite on the path to your goal ('${meta.label}').`;
        if (sid === goalSkill) {
          why = `This is your target skill — matched to your goal with ${Math.round(score * 100)}% confidence.`;
        }

        const tasks = await buildTasksForSkill(sid, smeta.label, subtopics, courses, resourceMode, youtubeApiKey);

        const dayStart = dayCursor;
        const dayEnd = daysPerSkill ? dayCursor + daysPerSkill - 1 : null;
        if (daysPerSkill) dayCursor += daysPerSkill;
        const weeks = daysPerSkill ? Math.max(1, Math.ceil(daysPerSkill / 7)) : 2;

        // seed a Course entry per skill (foundational course task) so CoursesPage stays populated
        if (courses.length) {
          const best = courses[0];
          coursesOut.push({
            id: `${pathId}_${sid}_c`,
            title: best.title,
            description: `Recommended ${smeta.label} course to progress toward "${goalText}".`,
            icon: DOMAIN_ICON[smeta.domain] ?? 'BookOpen',
            subject: smeta.label,
            subjectColor: DOMAIN_COLOR[smeta.domain] ?? 'iris',
            resourceType: 'course',
            status: i === 0 ? 'in-progress' : 'recommended',
            progress: 0,
            prerequisites: prereqLabels,
            whyRecommended: why,
            pathId,
            durationHours: best.duration_hours ?? 8,
            bookmarked: false,
          });
        }

        skillsOut.push({
          id: `gen_${sid}`, name: smeta.label, icon: DOMAIN_ICON[smeta.domain] ?? 'Sparkles',
          current: known.includes(sid) ? 70 : 0, target: 100, targetLabel: params.purpose,
          level: experienceLevel, mastered: false,
          nextMilestone: tasks[0]?.label ?? 'Get started', domain: smeta.domain,
        });

        return {
          id: sid, index: i + 1, title: smeta.label,
          description: why,
          status: i === 0 ? 'active' : 'locked',
          durationWeeks: weeks,
          milestones: tasks.map((t) => t.label),
          prerequisites: prereqLabels,
          why,
          skillIds: [`gen_${sid}`],
          tasks,
          dayRange: dayEnd ? `Day ${dayStart}-${dayEnd}` : null,
        };
      }),
    );
  }

  const pathType: PathType =
    params.purpose.toLowerCase().includes('placement') || params.purpose.toLowerCase().includes('job')
      ? 'career'
      : experienceLevel === 'Beginner' ? 'beginner' : 'skill';

  const totalWeeks = stages.reduce((sum, s) => sum + s.durationWeeks, 0);

  const learningPath: LearningPath = {
    id: pathId,
    title: `${goalLabel} — Personalized Path`,
    subtitle: goalText.length > 80 ? goalText.slice(0, 77) + '...' : goalText,
    domain,
    type: pathType,
    difficulty,
    stageCount: stages.length,
    durationWeeks: totalWeeks,
    color: DOMAIN_COLOR[domain] ?? 'iris',
    stages,
    active: true,
  };

  return { learningPath, skills: skillsOut, courses: coursesOut, note, matchConfidence };
}
