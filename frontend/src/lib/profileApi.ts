import api from './api';

export interface CareerPathOption {
  id: string;
  label: string;
  domain: string;
  description: string;
}

export interface SkillOption {
  id: string;
  label: string;
  domain: string;
  level: string;
}

export interface ProfileData {
  id: string;
  user_id: string;
  full_name: string | null;
  career_path: string | null;
  goals: string | null;
  purpose: string | null;
  experience_level: string;
  weekly_hours: number | null;
  known_skills: string[];
  onboarding_completed: boolean;
}

export interface ProfileUpsertPayload {
  full_name?: string | null;
  career_path?: string | null;
  goals?: string | null;
  purpose?: string | null;
  experience_level: string;
  weekly_hours?: number | null;
  known_skills: string[];
}

export async function getCareerPaths(): Promise<CareerPathOption[]> {
  const res = await api.get<CareerPathOption[]>('/career-paths');
  return res.data;
}

export async function getSkillOptions(): Promise<SkillOption[]> {
  const res = await api.get<SkillOption[]>('/skills');
  return res.data;
}

/** Returns null (instead of throwing) when the profile hasn't been created yet. */
export async function getProfile(): Promise<ProfileData | null> {
  try {
    const res = await api.get<ProfileData>('/profile');
    return res.data;
  } catch (err: unknown) {
    if (isAxios404(err)) return null;
    throw err;
  }
}

export async function saveProfile(data: ProfileUpsertPayload): Promise<ProfileData> {
  const res = await api.post<ProfileData>('/profile', data);
  return res.data;
}

function isAxios404(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    (err as { response?: { status?: number } }).response?.status === 404
  );
}
