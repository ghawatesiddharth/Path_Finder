import api from './api';

export interface LearningPathCreateRequest {
  title: string;
  description?: string | null;
  goal?: string | null;
}

export interface LearningPathResponse {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  goal: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function getLearningPaths(): Promise<LearningPathResponse[]> {
  const response = await api.get<LearningPathResponse[]>(
    '/learning-paths'
  );

  return response.data;
}

export async function getLearningPath(
  learningPathId: string
): Promise<LearningPathResponse> {
  const response = await api.get<LearningPathResponse>(
    `/learning-paths/${learningPathId}`
  );

  return response.data;
}

export async function createLearningPath(
  data: LearningPathCreateRequest
): Promise<LearningPathResponse> {
  const response = await api.post<LearningPathResponse>(
    '/learning-paths',
    data
  );

  return response.data;
}

export async function deleteLearningPath(
  learningPathId: string
): Promise<void> {
  await api.delete(`/learning-paths/${learningPathId}`);
}