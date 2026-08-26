import { useEffect, useState } from 'react';
import { ArrowRight, ArrowLeft, Sparkles, Loader2 } from 'lucide-react';

import { useApp } from '@/store';
import {
  getCareerPaths,
  getSkillOptions,
  type CareerPathOption,
  type SkillOption,
} from '@/lib/profileApi';
import type { SkillLevel } from '@/types';

const PURPOSES = [
  'Placement / job opportunity',
  'Skill upgrade for current role',
  'Academic project / coursework',
  'Personal interest / hobby',
  'Startup / freelancing',
];

const STEPS = ['Basics', 'Career path', 'Goals', 'What you know'] as const;

export function OnboardingPage() {
  const { completeOnboarding } = useApp();

  const [step, setStep] = useState(0);
  const [careerPaths, setCareerPaths] = useState<CareerPathOption[]>([]);
  const [skillOptions, setSkillOptions] = useState<SkillOption[]>([]);

  const [fullName, setFullName] = useState('');
  const [careerPath, setCareerPath] = useState<string | null>(null);
  const [goals, setGoals] = useState('');
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [experienceLevel, setExperienceLevel] = useState<SkillLevel>('Beginner');
  const [weeklyHours, setWeeklyHours] = useState(10);
  const [knownSkills, setKnownSkills] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCareerPaths().then(setCareerPaths).catch(() => setCareerPaths([]));
    getSkillOptions().then(setSkillOptions).catch(() => setSkillOptions([]));
  }, []);

  const toggleSkill = (id: string) => {
    setKnownSkills((current) =>
      current.includes(id) ? current.filter((s) => s !== id) : [...current, id],
    );
  };

  const canProceed = () => {
    if (step === 0) return fullName.trim().length > 0;
    if (step === 1) return true; // career path optional -- "Something else" is valid
    if (step === 2) return careerPath !== null || goals.trim().length > 0;
    return true;
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await completeOnboarding({
        full_name: fullName.trim(),
        career_path: careerPath,
        goals: goals.trim() || null,
        purpose,
        experience_level: experienceLevel,
        weekly_hours: weeklyHours,
        known_skills: knownSkills,
      });
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError('Could not save your profile. Make sure the backend is running and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const relevantSkills = careerPath
    ? skillOptions.filter((s) => s.domain === careerPaths.find((c) => c.id === careerPath)?.domain)
    : skillOptions;

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-10 dark:bg-ink-900">
      <div className="surface w-full max-w-xl rounded-xl2 p-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400 text-ink-900">
            <Sparkles size={18} />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-ink-800 dark:text-ink-50">
              Let's set up your profile
            </h1>
            <p className="text-2xs text-ink-400">
              A couple of quick questions so we can recommend the right learning path.
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="mb-6 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-2xs font-semibold ${
                  i <= step ? 'bg-amber-400 text-ink-900' : 'bg-ink-100 text-ink-400 dark:bg-ink-700'
                }`}
              >
                {i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 ${i < step ? 'bg-amber-400' : 'bg-ink-100 dark:bg-ink-700'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="min-h-[280px]">
          {/* Step 0: Basics */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <div className="label mb-1.5">What should we call you?</div>
                <input
                  className="input-base"
                  placeholder="Your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <div className="label mb-1.5">Current experience level</div>
                <div className="flex rounded-lg border border-ink-200 p-0.5 dark:border-ink-700">
                  {(['Beginner', 'Intermediate', 'Advanced'] as SkillLevel[]).map((level) => (
                    <button
                      type="button"
                      key={level}
                      onClick={() => setExperienceLevel(level)}
                      className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-all ${
                        experienceLevel === level ? 'bg-amber-400 text-ink-900' : 'text-ink-400'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="label mb-1.5">Hours per week you can commit: {weeklyHours}h</div>
                <input
                  type="range"
                  min={2}
                  max={40}
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-ink-100 accent-amber-400 dark:bg-ink-700"
                />
              </div>
            </div>
          )}

          {/* Step 1: Career path */}
          {step === 1 && (
            <div>
              <div className="label mb-2">Pick a track that matches your goal</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {careerPaths.map((cp) => (
                  <button
                    type="button"
                    key={cp.id}
                    onClick={() => setCareerPath(cp.id)}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      careerPath === cp.id
                        ? 'border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20'
                        : 'border-ink-200 dark:border-ink-700'
                    }`}
                  >
                    <div className="text-xs font-semibold text-ink-700 dark:text-ink-200">{cp.label}</div>
                    <div className="mt-0.5 text-2xs text-ink-400">{cp.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Goals */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <div className="label mb-1.5">
                  In your own words, what do you want to achieve?
                  {careerPath && ' (optional — your track already sets a target)'}
                </div>
                <textarea
                  className="input-base min-h-[90px] resize-none"
                  placeholder="e.g. become a backend developer and get placed in 6 months"
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                />
              </div>
              <div>
                <div className="label mb-1.5">Purpose</div>
                <select className="input-base" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                  {PURPOSES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Known skills */}
          {step === 3 && (
            <div>
              <div className="label mb-2">
                Anything here you already know? We'll skip these in your generated path.
              </div>
              <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto pr-1">
                {relevantSkills.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => toggleSkill(s.id)}
                    className={`chip border text-2xs transition-all ${
                      knownSkills.includes(s.id)
                        ? 'border-sage-400 bg-sage-400 text-ink-900'
                        : 'border-ink-200 text-ink-500 dark:border-ink-700 dark:text-ink-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {relevantSkills.length === 0 && (
                <p className="text-2xs text-ink-400">No suggestions for this track yet — that's fine, skip ahead.</p>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="btn-secondary text-xs disabled:opacity-40"
          >
            <ArrowLeft size={14} /> Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              disabled={!canProceed()}
              className="btn-primary text-xs disabled:opacity-50"
            >
              Next <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary text-xs disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  Finish setup <ArrowRight size={14} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
