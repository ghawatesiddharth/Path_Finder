import api from './api';

export interface BackendCourse {
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
  match_score: number;
}

export interface BackendStage {
  id: string;
  index: number;
  title: string;
  description: string;
  status: string;
  duration_weeks: number;
  prerequisites: string[];
  why: string;
  skill_id: string;
  domain?: string;
  subtopics: string[];
  courses: BackendCourse[];
  // populated client-side after YouTube enrichment, then persisted back
  tasks?: BackendTask[];
}

export interface BackendTask {
  id: string;
  type: 'course' | 'video' | 'project';
  label: string;
  provider: string;
  url: string | null;
  thumbnail: string | null;
  meta?: string;
  completed?: boolean;
}

export interface BackendPathContent {
  title: string;
  subtitle: string;
  domain: string;
  type?: string;
  difficulty: string;
  career_path: string | null;
  match_confidence: number;
  color: 'amber' | 'iris' | 'sage';
  duration_weeks?: number;
  stages: BackendStage[];
  note: string | null;
}

export interface BackendLearningPath {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  goal: string | null;
  career_path: string | null;
  content: BackendPathContent;
  progress: number;
  status: string;
}

export interface GenerateRequest {
  goal_text: string;
  career_path?: string | null;
  experience_level: string;
  purpose?: string;
  days_available?: number | null;
  free_only?: boolean;
  known_skills?: string[] | null;
}

export async function generateRecommendation(data: GenerateRequest): Promise<BackendLearningPath> {
  const res = await api.post<BackendLearningPath>('/recommendations/generate', data);
  return res.data;
}

export async function getBackendLearningPaths(): Promise<BackendLearningPath[]> {
  const res = await api.get<BackendLearningPath[]>('/learning-paths');
  return res.data;
}

export async function updateLearningPathContent(
  pathId: string,
  content: BackendPathContent,
): Promise<BackendLearningPath> {
  const res = await api.put<BackendLearningPath>(`/learning-paths/${pathId}/content`, { content });
  return res.data;
}

export async function updateTaskProgress(
  pathId: string,
  stageId: string,
  taskId: string,
  completed: boolean,
): Promise<BackendLearningPath> {
  const res = await api.patch<BackendLearningPath>(`/learning-paths/${pathId}/progress`, {
    stage_id: stageId,
    task_id: taskId,
    completed,
  });
  return res.data;
}

export async function deleteBackendLearningPath(pathId: string): Promise<void> {
  await api.delete(`/learning-paths/${pathId}`);
}
