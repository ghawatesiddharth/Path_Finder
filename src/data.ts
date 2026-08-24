import type { UserProfile } from '@/types';
import { SKILLS } from '@/lib/skillGraph';

/** Blank starting profile — no fabricated name, streak, or progress.
 *  Everything here is 0/empty until the person actually generates a path. */
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

export const chatQuickSuggestions = [
  'I want to learn Java for placement',
  'DSA roadmap for coding interviews',
  'Learn Python for data science',
  'Web development roadmap in 60 days',
];

const DOMAIN_LABELS: Record<string, string> = {
  programming: 'Programming',
  data_science: 'Data Science',
  web_dev: 'Web Dev',
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

/** Domain filter chips for the Path browse view — derived from the real
 *  skill taxonomy, not a hardcoded list tied to a persona. */
export const pathDomainFilters = [
  { id: 'all', label: 'All', icon: 'LayoutGrid' },
  ...Array.from(new Set(Object.values(SKILLS).map((s) => s.domain))).map((d) => ({
    id: DOMAIN_LABELS[d] ?? d,
    label: DOMAIN_LABELS[d] ?? d,
    icon: DOMAIN_ICONS[d] ?? 'Sparkles',
  })),
];
