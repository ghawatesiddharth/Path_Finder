export type Route = 'dashboard' | 'courses' | 'path' | 'profile' | 'assessment';

export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export type ResourceType = 'course' | 'project' | 'article' | 'quiz';

export type CourseStatus = 'in-progress' | 'completed' | 'recommended' | 'bookmarked';

export type PathType = 'beginner' | 'career' | 'skill' | 'interview';

export type StageStatus = 'completed' | 'active' | 'locked' | 'upcoming';

export type AssessmentStatus = 'not-started' | 'passed' | 'needs-review';

export interface Skill {
  id: string;
  name: string;
  icon: string; // lucide icon name
  current: number; // measured progress 0-100
  target: number; // target-role level
  targetLabel: string; // e.g. "Senior"
  level: SkillLevel;
  mastered: boolean;
  nextMilestone: string; // hint text
  domain: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  subject: string;
  subjectColor: 'amber' | 'iris' | 'sage';
  resourceType: ResourceType;
  status: CourseStatus;
  progress: number; // 0-100
  prerequisites: string[];
  whyRecommended: string;
  pathId?: string;
  durationHours: number;
  bookmarked: boolean;
}

export interface PathTask {
  id: string;
  type: 'course' | 'video' | 'project';
  label: string;
  provider: string;
  url: string | null;
  thumbnail: string | null;
  meta?: string;
  completed?: boolean;
}

export interface PathStage {
  id: string;
  index: number;
  title: string;
  description: string;
  status: StageStatus;
  durationWeeks: number;
  milestones: string[];
  prerequisites: string[];
  why: string;
  skillIds: string[];
  tasks?: PathTask[];
  dayRange?: string | null;
}

export interface LearningPath {
  id: string;
  title: string;
  subtitle: string;
  domain: string;
  type: PathType;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  stageCount: number;
  durationWeeks: number;
  color: 'amber' | 'iris' | 'sage';
  stages: PathStage[];
  active: boolean;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Assessment {
  id: string;
  title: string;
  description: string;
  pathId: string;
  pathTitle: string;
  stageId: string;
  status: AssessmentStatus;
  questionCount: number;
  estMinutes: number;
  questions: QuizQuestion[];
  skillId: string;
}

export interface StreakDay {
  date: number; // day of month
  active: boolean;
  isToday: boolean;
  label?: string; // what was completed
}

export interface UserProfile {
  name: string;
  avatarInitials: string;
  careerGoal: string;
  interests: string[];
  weeklyHours: number;
  streak: number;
  longestStreak: number;
  overallProgress: number; // 0-100
  activeDays: number[]; // days of current month active
  prevMonthActiveDays: number[];
  nextMonthActiveDays: number[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'guide';
  text: string;
  preview?: {
    type: 'roadmap' | 'skill' | 'next';
    items: string[];
  };
  ts: number;
}

export type ResourceMode = 'playlist' | 'same_channel' | 'mixed';

export interface GenerationParams {
  goalText: string;
  careerPath: string | null;
  daysAvailable: number | null;
  experienceLevel: SkillLevel;
  purpose: string;
  freeOnly: boolean;
  resourceMode: ResourceMode;
  youtubeApiKey: string | null;
}
// ===============================
// Backend / API Types
// ===============================

export interface ApiUser {
  id: string;
  email: string;
  is_active: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface ApiLearningPath {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  goal: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLearningPathRequest {
  title: string;
  description?: string | null;
  goal?: string | null;
}