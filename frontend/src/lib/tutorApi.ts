import api from './api';

export interface TutorMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface TutorContext {
  learning_path_title?: string | null;
  stage_title?: string | null;
  skill?: string | null;
}

export interface TutorChatResponse {
  reply: string;
  provider: string;
  mocked: boolean;
}

export async function tutorChat(
  message: string,
  history: TutorMessage[],
  context?: TutorContext,
): Promise<TutorChatResponse> {
  const res = await api.post<TutorChatResponse>('/tutor/chat', { message, history, context });
  return res.data;
}
