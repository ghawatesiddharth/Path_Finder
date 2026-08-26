// Bridges the backend ML recommendation output (skills, ranked courses,
// sub-topics) into the frontend's existing LearningPath/Skill/Course shapes.
// The backend owns goal matching + course ranking + prerequisite ordering;
// this module's only job is turning each stage's sub-topic list into real
// YouTube video tasks (client-side, since the YouTube key lives in the
// browser) and shaping the result into what PathPage/CoursesPage/
// ProfilePage already know how to render.

import { buildTasksForSkill } from './pathGenerator';
import type { BackendLearningPath, BackendStage } from './recommendationsApi';
import type {
  Course, GenerationParams, LearningPath, PathStage, PathTask, Skill,
} from '@/types';

const DOMAIN_ICON: Record<string, string> = {
  programming: 'Code2', data_science: 'BarChart3', web_dev: 'Atom',
  cloud: 'Cloud', cybersecurity: 'ShieldCheck', business: 'Compass',
  design: 'Palette', custom: 'Sparkles',
};

export interface AdaptedResult {
  learningPath: LearningPath;
  skills: Skill[];
  courses: Course[];
  note: string | null;
  matchConfidence: number;
}

async function enrichStage(
  stage: BackendStage,
  pathId: string,
  resourceMode: GenerationParams['resourceMode'],
  youtubeApiKey: string | null,
): Promise<PathTask[]> {
  // Reuse the existing course/video/project task builder — it already knows
  // how to fall back to mock YouTube results when no API key is set.
  const coursesForBuilder = stage.courses.map((c) => ({
    title: c.title,
    provider: c.provider,
    level: c.level,
    rating: c.rating,
    popularity: c.popularity,
    is_paid: c.is_paid,
    price: c.price,
    duration_hours: c.duration_hours,
    url: c.url,
    skills: c.skills,
  }));

  const tasks = await buildTasksForSkill(
    stage.skill_id,
    stage.title,
    stage.subtopics,
    coursesForBuilder,
    resourceMode,
    youtubeApiKey,
  );

  // Namespace task ids by learning path so the same skill appearing in two
  // different generated paths (e.g. "python_basics" in both a Data Science
  // and an AI/ML path) doesn't collide in the global completion map.
  return tasks.map((t) => ({ ...t, id: `${pathId}__${t.id}` }));
}

export async function adaptBackendPath(
  backendPath: BackendLearningPath,
  params: Pick<GenerationParams, 'resourceMode' | 'youtubeApiKey' | 'purpose' | 'experienceLevel'>,
): Promise<AdaptedResult> {
  const content = backendPath.content;
  const pathId = backendPath.id;

  const skillsOut: Skill[] = [];
  const coursesOut: Course[] = [];

  const stages: PathStage[] = await Promise.all(
    content.stages.map(async (stage, i): Promise<PathStage> => {
      const tasks = await enrichStage(stage, pathId, params.resourceMode, params.youtubeApiKey);

      // Surface every ranked course for this stage (not just the top pick) so
      // both Udemy and Coursera recommendations are visible on the Courses
      // page, each clearly labeled with its provider.
      stage.courses.forEach((c, ci) => {
        coursesOut.push({
          id: `${pathId}_${stage.skill_id}_c${ci}`,
          title: c.title,
          description: `Recommended ${stage.title} course on ${c.provider}, ranked by our model on rating, popularity, price, and level match.`,
          icon: DOMAIN_ICON[stage.domain ?? content.domain] ?? 'BookOpen',
          subject: stage.title,
          subjectColor: content.color,
          resourceType: 'course',
          status: i === 0 && ci === 0 ? 'in-progress' : 'recommended',
          progress: 0,
          prerequisites: stage.prerequisites,
          whyRecommended: stage.why,
          pathId,
          durationHours: c.duration_hours ?? 8,
          bookmarked: false,
          provider: c.provider,
          rating: c.rating,
          isPaid: c.is_paid,
          price: c.price,
          url: c.url,
        });
      });

      skillsOut.push({
        id: `${pathId}_${stage.skill_id}`,
        name: stage.title,
        icon: DOMAIN_ICON[stage.domain ?? content.domain] ?? 'Sparkles',
        current: i === 0 ? 0 : 0,
        target: 100,
        targetLabel: params.purpose,
        level: params.experienceLevel,
        mastered: false,
        nextMilestone: tasks[0]?.label ?? 'Get started',
        domain: stage.domain ?? content.domain,
      });

      return {
        id: stage.id,
        index: stage.index,
        title: stage.title,
        description: stage.description,
        status: i === 0 ? 'active' : 'locked',
        durationWeeks: stage.duration_weeks,
        milestones: tasks.map((t) => t.label),
        prerequisites: stage.prerequisites,
        why: stage.why,
        skillIds: [`${pathId}_${stage.skill_id}`],
        tasks,
        dayRange: null,
      };
    }),
  );

  const totalWeeks = stages.reduce((sum, s) => sum + s.durationWeeks, 0);

  const learningPath: LearningPath = {
    id: pathId,
    title: content.title,
    subtitle: content.subtitle,
    domain: content.domain,
    type: (content.type as LearningPath['type']) ?? 'skill',
    difficulty: content.difficulty as LearningPath['difficulty'],
    stageCount: stages.length,
    durationWeeks: totalWeeks,
    color: content.color,
    stages,
    active: true,
  };

  return {
    learningPath,
    skills: skillsOut,
    courses: coursesOut,
    note: content.note,
    matchConfidence: content.match_confidence,
  };
}

/** For paths that were already generated + enriched in a previous session
 * (content.stages[].tasks already populated and persisted on the backend).
 * Skips YouTube calls entirely — just reshapes the stored JSON. */
export function hydrateBackendPath(backendPath: BackendLearningPath): AdaptedResult {
  const content = backendPath.content;
  const pathId = backendPath.id;

  const skillsOut: Skill[] = [];
  const coursesOut: Course[] = [];

  const stages: PathStage[] = content.stages.map((stage, i) => {
    const tasks = stage.tasks ?? [];

    stage.courses.forEach((c, ci) => {
      coursesOut.push({
        id: `${pathId}_${stage.skill_id}_c${ci}`,
        title: c.title,
        description: `Recommended ${stage.title} course on ${c.provider}, ranked by our model on rating, popularity, price, and level match.`,
        icon: DOMAIN_ICON[stage.domain ?? content.domain] ?? 'BookOpen',
        subject: stage.title,
        subjectColor: content.color,
        resourceType: 'course',
        status: i === 0 && ci === 0 ? 'in-progress' : 'recommended',
        progress: 0,
        prerequisites: stage.prerequisites,
        whyRecommended: stage.why,
        pathId,
        durationHours: c.duration_hours ?? 8,
        bookmarked: false,
        provider: c.provider,
        rating: c.rating,
        isPaid: c.is_paid,
        price: c.price,
        url: c.url,
      });
    });

    skillsOut.push({
      id: `${pathId}_${stage.skill_id}`,
      name: stage.title,
      icon: DOMAIN_ICON[stage.domain ?? content.domain] ?? 'Sparkles',
      current: 0,
      target: 100,
      targetLabel: '',
      level: 'Beginner',
      mastered: false,
      nextMilestone: tasks[0]?.label ?? 'Get started',
      domain: stage.domain ?? content.domain,
    });

    return {
      id: stage.id,
      index: stage.index,
      title: stage.title,
      description: stage.description,
      status: (stage.status as PathStage['status']) ?? (i === 0 ? 'active' : 'locked'),
      durationWeeks: stage.duration_weeks,
      milestones: tasks.map((t) => t.label),
      prerequisites: stage.prerequisites,
      why: stage.why,
      skillIds: [`${pathId}_${stage.skill_id}`],
      tasks,
      dayRange: null,
    };
  });

  const totalWeeks = stages.reduce((sum, s) => sum + s.durationWeeks, 0);

  const learningPath: LearningPath = {
    id: pathId,
    title: content.title,
    subtitle: content.subtitle,
    domain: content.domain,
    type: (content.type as LearningPath['type']) ?? 'skill',
    difficulty: content.difficulty as LearningPath['difficulty'],
    stageCount: stages.length,
    durationWeeks: totalWeeks,
    color: content.color,
    stages,
    active: false,
  };

  return {
    learningPath,
    skills: skillsOut,
    courses: coursesOut,
    note: content.note,
    matchConfidence: content.match_confidence,
  };
}

/** Serializes enriched stages (with real video tasks) back into the shape
 * the backend's PUT /learning-paths/{id}/content endpoint expects, so
 * progress persists across reloads instead of being re-fetched from
 * YouTube every time. */
export function stagesToBackendContent(
  original: BackendLearningPath['content'],
  stages: PathStage[],
): BackendLearningPath['content'] {
  const byId = new Map(stages.map((s) => [s.id, s]));
  return {
    ...original,
    stages: original.stages.map((bs) => {
      const enriched = byId.get(bs.id);
      if (!enriched?.tasks) return bs;
      return {
        ...bs,
        tasks: enriched.tasks,
      };
    }),
  };
}
