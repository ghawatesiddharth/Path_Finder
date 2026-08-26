import { useMemo, useState } from 'react';
import { ArrowLeft, Bookmark, Clock, FileText, BookOpen, FlaskConical, Boxes, Sparkles, Layers } from 'lucide-react';
import { useApp } from '@/store';
import { Icon } from '@/components/Icon';
import { ProgressBar } from '@/components/Progress';
import type { Course, CourseStatus, ResourceType } from '@/types';

const STATUS_TABS: { id: CourseStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'recommended', label: 'Recommended' },
  { id: 'bookmarked', label: 'Bookmarked' },
];

const RESOURCE_META: Record<ResourceType, { label: string; icon: typeof BookOpen }> = {
  course: { label: 'Course', icon: BookOpen },
  project: { label: 'Project', icon: Boxes },
  article: { label: 'Article', icon: FileText },
  quiz: { label: 'Quiz', icon: FlaskConical },
};

const colorMap = {
  amber: { band: 'bg-amber-400', text: 'text-amber-600', dark: 'dark:text-amber-300', tint: 'bg-amber-50 dark:bg-amber-900/20' },
  iris: { band: 'bg-iris-500', text: 'text-iris-600', dark: 'dark:text-iris-300', tint: 'bg-iris-50 dark:bg-iris-900/20' },
  sage: { band: 'bg-sage-500', text: 'text-sage-600', dark: 'dark:text-sage-300', tint: 'bg-sage-50 dark:bg-sage-900/20' },
};

export function CoursesPage() {
  const { courses, toggleBookmark } = useApp();
  const [topic, setTopic] = useState('all');
  const [statusTab, setStatusTab] = useState<CourseStatus | 'all'>('all');
  const [selected, setSelected] = useState<Course | null>(null);

  // Topic pills derived from the real subjects present — no hardcoded persona list.
  const topicFilters = useMemo(() => {
    const seen = new Map<string, string>();
    for (const c of courses) {
      if (!seen.has(c.subject)) seen.set(c.subject, c.icon);
    }
    return [{ id: 'all', label: 'All', icon: 'LayoutGrid' }, ...[...seen.entries()].map(([subject, icon]) => ({ id: subject, label: subject, icon }))];
  }, [courses]);

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (topic !== 'all' && c.subject !== topic) return false;
      if (statusTab === 'bookmarked') return c.bookmarked;
      if (statusTab === 'all') return true;
      return c.status === statusTab;
    });
  }, [courses, topic, statusTab]);

  if (selected) {
    const cm = colorMap[selected.subjectColor];
    const res = RESOURCE_META[selected.resourceType];
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <button onClick={() => setSelected(null)} className="btn-ghost mb-6 -ml-2">
          <ArrowLeft size={16} /> Back to courses
        </button>

        <div className={`h-2 w-full rounded-full ${cm.band}`} />
        <div className="surface mt-0 rounded-b-xl2 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${cm.tint} ${cm.text}`}>
                <Icon name={selected.icon} size={24} />
              </div>
              <div>
                <div className={`mb-1 text-2xs font-semibold uppercase tracking-wider ${cm.text}`}>{selected.subject}</div>
                <h1 className="font-display text-2xl font-bold text-ink-800 dark:text-ink-50">{selected.title}</h1>
              </div>
            </div>
            <button
              onClick={() => toggleBookmark(selected.id)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${
                selected.bookmarked
                  ? 'border-amber-300 bg-amber-50 text-amber-500 dark:border-amber-700 dark:bg-amber-900/30'
                  : 'border-ink-200 text-ink-300 hover:text-amber-400 dark:border-ink-600'
              }`}
            >
              <Bookmark size={17} fill={selected.bookmarked ? 'currentColor' : 'none'} />
            </button>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-ink-600 dark:text-ink-300">{selected.description}</p>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className={`chip ${cm.tint} ${cm.text}`}>
              <res.icon size={13} /> {res.label}
            </span>
            {selected.provider && (
              <span className="chip border border-ink-200 text-ink-500 dark:border-ink-600">
                {selected.provider}
              </span>
            )}
            {typeof selected.rating === 'number' && (
              <span className="chip border border-ink-200 text-ink-500 dark:border-ink-600">
                ⭐ {selected.rating}
              </span>
            )}
            <span className="chip border border-ink-200 text-ink-500 dark:border-ink-600">
              <Clock size={13} /> {selected.durationHours}h
            </span>
            {selected.isPaid !== undefined && (
              <span className="chip border border-ink-200 text-ink-500 dark:border-ink-600">
                {selected.isPaid ? (selected.price ? `$${selected.price}` : 'Paid') : 'Free'}
              </span>
            )}
            <span className="chip border border-ink-200 text-ink-500 dark:border-ink-600">
              {selected.progress}% complete
            </span>
          </div>

          {selected.progress > 0 && selected.progress < 100 && (
            <div className="mt-5">
              <ProgressBar value={selected.progress} color={selected.subjectColor} />
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-ink-100 p-4 dark:border-ink-700">
              <div className="label mb-2">Prerequisites</div>
              <ul className="space-y-1.5">
                {selected.prerequisites.map((p, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-ink-600 dark:text-ink-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-ink-300" /> {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-iris-200 bg-iris-50 p-4 dark:border-iris-800 dark:bg-iris-900/20">
              <div className="label mb-2 text-iris-500">Why recommended</div>
              <p className="text-xs leading-relaxed text-iris-800 dark:text-iris-200">{selected.whyRecommended}</p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            {selected.status === 'completed' ? (
              <div className="flex items-center gap-2 rounded-lg bg-sage-50 px-4 py-2 text-sm font-semibold text-sage-600 dark:bg-sage-900/30 dark:text-sage-300">
                <Sparkles size={16} /> Completed
              </div>
            ) : (
              <button className="btn-primary">
                {selected.progress > 0 ? 'Continue' : 'Start course'}
              </button>
            )}
            {selected.url && (
              <a
                href={selected.url}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost"
              >
                Open on {selected.provider ?? 'provider site'}
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink-800 dark:text-ink-50">My Courses</h1>
        <p className="mt-1.5 text-sm text-ink-400">{filtered.length} courses — filtered by your selection</p>
      </div>

      {/* Topic pills */}
      <div className="relative mb-4">
        <div className="no-scrollbar flex gap-2 overflow-x-auto py-1">
          {topicFilters.map((t) => {
            const active = topic === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTopic(t.id)}
                className={`chip border ${
                  active
                    ? 'border-amber-400 bg-amber-400 text-ink-900 shadow-sm'
                    : 'border-ink-200 bg-white text-ink-500 hover:border-ink-300 dark:border-ink-600 dark:bg-ink-800 dark:text-ink-300'
                }`}
              >
                <Icon name={t.icon} size={14} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status tabs */}
      <div className="mb-6 flex gap-6 border-b border-ink-100 dark:border-ink-700">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusTab(tab.id)}
            className={`tab-underline ${statusTab === tab.id ? 'tab-underline-active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Course cards */}
      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl2 border border-dashed border-ink-200 py-16 text-center text-ink-400 dark:border-ink-700">
          <Layers size={32} className="mb-3 opacity-40" />
          <p className="text-sm">No courses yet — generate a learning path from Home to populate this page.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl2 border border-dashed border-ink-200 py-16 text-ink-400 dark:border-ink-700">
          <BookOpen size={32} className="mb-3 opacity-40" />
          <p className="text-sm">No courses match this filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => {
            const cm = colorMap[course.subjectColor];
            const res = RESOURCE_META[course.resourceType];
            return (
              <button
                key={course.id}
                onClick={() => setSelected(course)}
                className="surface group overflow-hidden rounded-xl2 text-left transition-all hover:shadow-lift hover:-translate-y-0.5"
              >
                <div className={`h-1.5 ${cm.band}`} />
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${cm.tint} ${cm.text}`}>
                      <Icon name={course.icon} size={20} />
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleBookmark(course.id); }}
                      className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                        course.bookmarked ? 'text-amber-400' : 'text-ink-300 hover:text-amber-400'
                      }`}
                    >
                      <Bookmark size={14} fill={course.bookmarked ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  <h3 className="mt-3 font-display text-sm font-semibold leading-snug text-ink-800 dark:text-ink-50">
                    {course.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs text-ink-400">{course.description}</p>

                  <div className="mt-3">
                    <ProgressBar
                      value={course.progress}
                      color={course.subjectColor}
                      className={course.progress === 0 ? 'opacity-30' : ''}
                    />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-2xs text-ink-400">
                    <span className={`flex items-center gap-1 ${cm.text}`}>
                      <res.icon size={11} /> {res.label}
                      {course.provider && <span className="text-ink-300">· {course.provider}</span>}
                    </span>
                    <span>{course.progress > 0 ? `${course.progress}%` : 'Not started'}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
