import { useState } from 'react';
import { Wand2, Youtube } from 'lucide-react';
import { useApp } from '@/store';
import type { GenerationParams, ResourceMode, SkillLevel } from '@/types';

const RESOURCE_MODE_OPTIONS: { id: ResourceMode; label: string; hint: string }[] = [
  { id: 'playlist', label: 'Single playlist', hint: 'One real YouTube playlist, same creator, in order' },
  { id: 'same_channel', label: 'Same channel', hint: 'One channel across every video in the path' },
  { id: 'mixed', label: 'Mixed sources', hint: 'Best-matching video per topic, from anywhere' },
];

export function PathBuilderForm({ compact = false }: { compact?: boolean }) {
  const { generateFromProfile, generating, lastGenerationNote, youtubeApiKey, setYoutubeApiKey } = useApp();

  const [goalText, setGoalText] = useState('');
  const [hasDeadline, setHasDeadline] = useState(true);
  const [days, setDays] = useState(30);
  const [experience, setExperience] = useState<SkillLevel>('Beginner');
  const [purpose, setPurpose] = useState('Placement / job opportunity');
  const [freeOnly, setFreeOnly] = useState(false);
  const [resourceMode, setResourceMode] = useState<ResourceMode>('playlist');
  const [ytKeyDraft, setYtKeyDraft] = useState(youtubeApiKey);

  const handleGenerate = () => {
    if (!goalText.trim()) return;
    setYoutubeApiKey(ytKeyDraft.trim());
    const params: GenerationParams = {
      goalText: goalText.trim(),
      daysAvailable: hasDeadline ? days : null,
      experienceLevel: experience,
      purpose,
      freeOnly,
      resourceMode,
      youtubeApiKey: ytKeyDraft.trim() || null,
    };
    void generateFromProfile(params);
  };

  return (
    <section className={`surface rounded-xl2 border border-amber-200 dark:border-amber-900/40 ${compact ? 'p-4' : 'p-6'}`}>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400 text-ink-900">
          <Wand2 size={17} />
        </div>
        <div>
          <h2 className="font-display text-base font-semibold text-ink-800 dark:text-ink-50">
            Build your learning path
          </h2>
          <p className="text-2xs text-ink-400">
            Real Coursera + Udemy courses, sequenced with YouTube resources — generated live, not templated.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <div className="label mb-1.5">What do you want to learn?</div>
          <textarea
            className="input-base min-h-[70px] resize-none"
            placeholder="e.g. I want to learn Java for placement interviews"
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="label mb-1.5">Day constraint</div>
            <div className="flex items-center gap-3">
              <div className="flex rounded-lg border border-ink-200 p-0.5 dark:border-ink-700">
                <button
                  onClick={() => setHasDeadline(true)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                    hasDeadline ? 'bg-amber-400 text-ink-900' : 'text-ink-400'
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setHasDeadline(false)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                    !hasDeadline ? 'bg-amber-400 text-ink-900' : 'text-ink-400'
                  }`}
                >
                  Self-paced
                </button>
              </div>
              {hasDeadline && (
                <>
                  <input
                    type="range" min={7} max={180} value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-ink-100 accent-amber-400 dark:bg-ink-700"
                  />
                  <span className="w-16 text-right text-sm font-semibold text-amber-500">{days}d</span>
                </>
              )}
            </div>
          </div>

          <div>
            <div className="label mb-1.5">Experience level</div>
            <div className="flex rounded-lg border border-ink-200 p-0.5 dark:border-ink-700">
              {(['Beginner', 'Intermediate', 'Advanced'] as SkillLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setExperience(lvl)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-all ${
                    experience === lvl ? 'bg-amber-400 text-ink-900' : 'text-ink-400'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="label mb-1.5">Purpose of learning</div>
            <select
              className="input-base"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            >
              <option>Placement / job opportunity</option>
              <option>Skill upgrade for current role</option>
              <option>Academic project / coursework</option>
              <option>Personal interest / hobby</option>
              <option>Startup / freelancing</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
              <input
                type="checkbox"
                checked={freeOnly}
                onChange={(e) => setFreeOnly(e.target.checked)}
                className="h-4 w-4 rounded accent-amber-400"
              />
              Only show free resources
            </label>
          </div>
        </div>

        <div>
          <div className="label mb-1.5">Video resource style</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {RESOURCE_MODE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setResourceMode(opt.id)}
                className={`rounded-lg border p-2.5 text-left transition-all ${
                  resourceMode === opt.id
                    ? 'border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20'
                    : 'border-ink-200 dark:border-ink-700'
                }`}
              >
                <div className="text-xs font-semibold text-ink-700 dark:text-ink-200">{opt.label}</div>
                <div className="mt-0.5 text-2xs text-ink-400">{opt.hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="label mb-1.5 flex items-center gap-1.5">
            <Youtube size={12} /> YouTube API key (optional — needed for live videos + playlist/same-channel modes)
          </div>
          <input
            type="password"
            className="input-base"
            placeholder="Paste your YouTube Data API v3 key"
            value={ytKeyDraft}
            onChange={(e) => setYtKeyDraft(e.target.value)}
          />
          {resourceMode !== 'mixed' && !ytKeyDraft && (
            <p className="mt-1 text-2xs text-amber-500">
              ⚠️ Without a key, {resourceMode === 'playlist' ? 'playlist' : 'same-channel'} mode falls back to mixed mock results.
            </p>
          )}
        </div>

        <button
          onClick={handleGenerate}
          disabled={!goalText.trim() || generating}
          className="btn-primary w-full justify-center disabled:opacity-50"
        >
          {generating ? 'Building your roadmap...' : (<><Wand2 size={15} /> Generate My Learning Path</>)}
        </button>

        {lastGenerationNote && (
          <div className="rounded-lg border border-iris-200 bg-iris-50 p-3 text-2xs text-iris-800 dark:border-iris-800 dark:bg-iris-900/20 dark:text-iris-200">
            {lastGenerationNote}
          </div>
        )}
      </div>
    </section>
  );
}
