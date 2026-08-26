import type { UserProfile } from '@/types';
import { SKILLS } from '@/lib/skillGraph';

/*
 * Empty starting profile.
 * No fake progress, streak, or generated learning path.
 */
export const emptyUser: UserProfile = {
  name: 'You',
  avatarInitials: 'Y',
  careerGoal: '',
  interests: [],
  weeklyHours: 10,
  streak: 0,
  longestStreak: 0,
  overallProgress: 0,
  activeDays: [],
  prevMonthActiveDays: [],
  nextMonthActiveDays: [],
};

export const chatQuickSuggestions: string[] = [
  'I want to learn Java for placement',
  'DSA roadmap for coding interviews',
  'Learn Python for data science',
  'Web development roadmap in 60 days',
];

const DOMAIN_LABELS: Record<string, string> = {
  programming: 'Programming',
  data_science: 'Data Science',
  web_dev: 'Web Development',
  cloud: 'Cloud',
  business: 'Business',
  design: 'Design',
  custom: 'Custom',
};

const DOMAIN_ICONS: Record<string, string> = {
  programming: 'Code2',
  data_science: 'BarChart3',
  web_dev: 'Atom',
  cloud: 'Cloud',
  business: 'Compass',
  design: 'Palette',
  custom: 'Sparkles',
};

export const pathDomainFilters = [
  {
    id: 'all',
    label: 'All',
    icon: 'LayoutGrid',
  },

  ...Array.from(
    new Set(
      Object.values(SKILLS).map((skill) => skill.domain)
    )
  ).map((domain) => ({
    id: domain,
    label: DOMAIN_LABELS[domain] ?? domain,
    icon: DOMAIN_ICONS[domain] ?? 'Sparkles',
  })),
];