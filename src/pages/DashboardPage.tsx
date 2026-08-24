import { ArrowRight, Target, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '@/store';
import { ProgressBar } from '@/components/Progress';
import { PathBuilderForm } from '@/components/PathBuilderForm';

export function DashboardPage() {
  const { user, skills, paths, setRoute, taskCompletion } = useApp();
  const activePath = paths.find((p) => p.active);
  const [formCollapsed, setFormCollapsed] = useState(!!activePath);

  const totalTasks = activePath?.stages.reduce((sum, s) => sum + (s.tasks?.length ?? 0), 0) ?? 0;
  const doneTasks = activePath?.stages.reduce(
    (sum, s) => sum + (s.tasks?.filter((t) => taskCompletion[t.id]).length ?? 0), 0,
  ) ?? 0;
  const pct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const activeStage = activePath?.stages.find((s) => {
    const t = s.tasks;
    if (!t?.length) return s.status === 'active';
    return t.some((task) => !taskCompletion[task.id]);
  });

  const skillGaps = skills
    .filter((s) => !s.mastered && s.target > s.current)
    .sort((a, b) => b.target - b.current - (a.target - a.current))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink-800 dark:text-ink-50">
          {activePath ? `Welcome back, ${user.name}.` : `Hi ${user.name}, let's build your first learning path.`}
        </h1>
        <p className="mt-1.5 text-sm text-ink-400">
          {activePath
            ? <>You're <span className="font-semibold text-amber-500">{pct}%</span> through <span className="font-semibold text-iris-500">{activePath.title}</span>.</>
            : 'Describe a goal below and get a real, sequenced roadmap — not a template.'}
        </p>
      </div>

      {/* Path builder — the primary homepage section */}
      {formCollapsed ? (
        <button
          onClick={() => setFormCollapsed(false)}
          className="surface mb-6 flex w-full items-center justify-between rounded-xl2 border border-amber-200 p-4 text-left transition-all hover:shadow-lift dark:border-amber-900/40"
        >
          <span className="text-sm font-semibold text-ink-700 dark:text-ink-200">
            + Build another learning path
          </span>
          <ChevronDown size={16} className="text-ink-400" />
        </button>
      ) : (
        <div className="mb-6">
          <PathBuilderForm />
          {activePath && (
            <button
              onClick={() => setFormCollapsed(true)}
              className="btn-ghost mt-2 text-xs"
            >
              <ChevronUp size={13} /> Collapse
            </button>
          )}
        </div>
      )}

      {!activePath ? (
        <div className="flex flex-col items-center justify-center rounded-xl2 border border-dashed border-ink-200 py-16 text-center text-ink-400 dark:border-ink-700">
          <Target size={32} className="mb-3 opacity-40" />
          <p className="text-sm">No learning path yet — fill in the form above to generate one.</p>
        </div>
      ) : (
        <>
          {/* Active path summary */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="surface rounded-xl2 p-5 lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="label">Active path</div>
                  <h2 className="font-display text-lg font-semibold text-ink-800 dark:text-ink-50">{activePath.title}</h2>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl font-bold text-amber-500">{pct}%</div>
                  <div className="text-2xs text-ink-400">{doneTasks}/{totalTasks} tasks</div>
                </div>
              </div>
              <ProgressBar value={pct} color="amber" />
              <button onClick={() => setRoute('path')} className="btn-primary mt-4 w-full">
                View roadmap <ArrowRight size={15} />
              </button>
            </section>

            <section className="surface flex flex-col p-5">
              <div className="mb-3 flex items-center gap-2">
                <Target size={18} className="text-amber-400" />
                <h2 className="font-display text-base font-semibold text-ink-800 dark:text-ink-50">Current stage</h2>
              </div>
              {activeStage ? (
                <>
                  <h3 className="font-display text-base font-semibold leading-tight text-ink-800 dark:text-ink-50">
                    {activeStage.title}
                  </h3>
                  {activeStage.dayRange && (
                    <p className="mt-1 text-2xs text-ink-400">{activeStage.dayRange}</p>
                  )}
                  <p className="mt-2 line-clamp-3 text-2xs leading-relaxed text-ink-400">{activeStage.why}</p>
                </>
              ) : (
                <p className="text-xs text-ink-400">All stages complete — nice work!</p>
              )}
            </section>
          </div>

          {/* Skill gaps — real generated skills only */}
          {skillGaps.length > 0 && (
            <section className="surface mt-6 rounded-xl2 p-5">
              <div className="mb-5 flex items-center gap-2">
                <TrendingUp size={18} className="text-iris-500" />
                <h2 className="font-display text-base font-semibold text-ink-800 dark:text-ink-50">
                  Skills in progress
                </h2>
              </div>
              <div className="space-y-4">
                {skillGaps.map((skill) => {
                  const gap = skill.target - skill.current;
                  return (
                    <div key={skill.id}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-ink-700 dark:text-ink-200">{skill.name}</span>
                          <span className="text-2xs text-ink-400">{skill.level}</span>
                        </div>
                        <span className="text-xs font-semibold text-iris-500">+{gap} to go</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <ProgressBar value={skill.current} color="iris" />
                        </div>
                        <span className="w-16 text-right text-2xs tabular-nums text-ink-400">
                          {skill.current}/{skill.target}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
