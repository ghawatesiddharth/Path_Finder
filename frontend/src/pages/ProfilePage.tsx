import { useState } from 'react';
import { Check, Pencil, Save, Sparkles, BookOpen, Target } from 'lucide-react';
import { useApp } from '@/store';
import { Icon } from '@/components/Icon';
import { ProgressBar } from '@/components/Progress';

export function ProfilePage() {
  const { user, updateUser, skills, courses, sendMessage } = useApp();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: user.name,
    careerGoal: user.careerGoal,
    interests: user.interests.join(', '),
    weeklyHours: user.weeklyHours,
  });

  const save = () => {
    updateUser({
      name: draft.name,
      careerGoal: draft.careerGoal,
      interests: draft.interests.split(',').map((s) => s.trim()).filter(Boolean),
      weeklyHours: draft.weeklyHours,
    });
    setEditing(false);
  };

  const completedCourses = courses.filter((c) => c.status === 'completed');

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink-800 dark:text-ink-50">Profile</h1>
        <p className="mt-1.5 text-sm text-ink-400">Your skills, goal, and learning preferences</p>
      </div>

      {/* Basics */}
      <section className="surface mb-6 rounded-xl2 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-iris-500 text-sm font-semibold text-white">
              {user.avatarInitials}
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-ink-800 dark:text-ink-50">{user.name}</h2>
            </div>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-ghost text-xs">
              <Pencil size={13} /> Edit
            </button>
          ) : (
            <button onClick={save} className="btn-primary text-xs">
              <Save size={13} /> Save
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="label mb-1.5">Name</div>
            {editing ? (
              <input className="input-base" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            ) : (
              <p className="text-sm text-ink-700 dark:text-ink-200">{user.name}</p>
            )}
          </div>
          <div>
            <div className="label mb-1.5">Career goal</div>
            {editing ? (
              <input className="input-base" value={draft.careerGoal} onChange={(e) => setDraft({ ...draft, careerGoal: e.target.value })} placeholder="Not set yet" />
            ) : (
              <p className="text-sm text-ink-700 dark:text-ink-200">{user.careerGoal || '—'}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <div className="label mb-1.5">Interests</div>
            {editing ? (
              <input className="input-base" value={draft.interests} onChange={(e) => setDraft({ ...draft, interests: e.target.value })} placeholder="Comma-separated" />
            ) : user.interests.length ? (
              <div className="flex flex-wrap gap-1.5">
                {user.interests.map((i) => (
                  <span key={i} className="chip bg-iris-50 text-iris-600 dark:bg-iris-900/30 dark:text-iris-300">
                    {i}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-400">None set yet</p>
            )}
          </div>
          <div>
            <div className="label mb-1.5">Weekly time commitment</div>
            {editing ? (
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={2}
                  max={30}
                  value={draft.weeklyHours}
                  onChange={(e) => setDraft({ ...draft, weeklyHours: Number(e.target.value) })}
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-ink-100 accent-amber-400 dark:bg-ink-700"
                />
                <span className="w-16 text-sm font-semibold text-amber-500">{draft.weeklyHours}h</span>
              </div>
            ) : (
              <p className="text-sm text-ink-700 dark:text-ink-200">{user.weeklyHours} hours / week</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-iris-200 bg-iris-50 p-3 dark:border-iris-800 dark:bg-iris-900/20">
          <Sparkles size={14} className="shrink-0 text-iris-500" />
          <p className="text-xs text-iris-800 dark:text-iris-200">
            Want a new path? Head to Home, or ask your Learning Guide directly.
          </p>
          <button onClick={() => sendMessage('Help me set a new career goal')} className="ml-auto text-xs font-semibold text-iris-500 hover:text-iris-600">
            Ask Guide
          </button>
        </div>
      </section>

      {/* Skill grid */}
      <section className="mb-6">
        <div className="mb-4 flex items-center gap-2">
          <Target size={18} className="text-iris-500" />
          <h2 className="font-display text-base font-semibold text-ink-800 dark:text-ink-50">Skills</h2>
          <span className="text-2xs text-ink-400">{skills.length} tracked</span>
        </div>
        {skills.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl2 border border-dashed border-ink-200 py-12 text-center text-ink-400 dark:border-ink-700">
            <Target size={28} className="mb-2 opacity-40" />
            <p className="text-sm">No skills tracked yet — generate a learning path from Home to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className={`surface rounded-xl p-4 transition-all hover:shadow-lift ${
                  skill.mastered ? 'border-sage-300 bg-sage-50 dark:border-sage-800 dark:bg-sage-900/20' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    skill.mastered ? 'bg-sage-500 text-white' : 'bg-iris-50 text-iris-600 dark:bg-iris-900/30 dark:text-iris-300'
                  }`}>
                    {skill.mastered ? <Check size={18} /> : <Icon name={skill.icon} size={18} />}
                  </div>
                  <span className={`text-2xs font-semibold ${
                    skill.mastered ? 'text-sage-600 dark:text-sage-300' : 'text-ink-400'
                  }`}>
                    {skill.mastered ? 'Mastered' : skill.level}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-ink-800 dark:text-ink-50">{skill.name}</h3>
                <div className="mt-2.5">
                  <ProgressBar value={skill.current} color={skill.mastered ? 'sage' : 'iris'} />
                </div>
                <div className="mt-1.5 flex justify-between text-2xs text-ink-400">
                  <span>{skill.current}/{skill.target} to {skill.targetLabel}</span>
                  {skill.mastered && <span className="text-sage-500">+{skill.current - skill.target} beyond</span>}
                </div>
                <p className="mt-2 line-clamp-2 text-2xs leading-relaxed text-ink-400">
                  {skill.nextMilestone}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Completed courses */}
      <section className="surface rounded-xl2 p-5">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen size={18} className="text-sage-500" />
          <h2 className="font-display text-base font-semibold text-ink-800 dark:text-ink-50">Completed Courses</h2>
          <span className="text-2xs text-ink-400">{completedCourses.length} done</span>
        </div>
        {completedCourses.length === 0 ? (
          <p className="text-sm text-ink-400">Nothing completed yet — check items off in your Learning Path.</p>
        ) : (
          <div className="space-y-2">
            {completedCourses.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border border-ink-100 p-3 dark:border-ink-700">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  c.subjectColor === 'amber' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300' :
                  c.subjectColor === 'iris' ? 'bg-iris-50 text-iris-600 dark:bg-iris-900/30 dark:text-iris-300' :
                  'bg-sage-50 text-sage-600 dark:bg-sage-900/30 dark:text-sage-300'
                }`}>
                  <Icon name={c.icon} size={16} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-ink-700 dark:text-ink-200">{c.title}</div>
                  <div className="text-2xs text-ink-400">{c.subject} · {c.durationHours}h</div>
                </div>
                <Check size={16} className="text-sage-500" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
