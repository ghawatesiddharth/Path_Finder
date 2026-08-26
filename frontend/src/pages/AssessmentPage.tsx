import { useState } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  Circle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Clock,
  Lightbulb,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { useApp } from '@/store';
import type { Assessment, AssessmentStatus } from '@/types';
const statusMeta: Record<AssessmentStatus, { icon: typeof CheckCircle2; label: string; color: string; bg: string }> = {
  'passed': { icon: CheckCircle2, label: 'Passed', color: 'text-sage-600 dark:text-sage-300', bg: 'bg-sage-50 dark:bg-sage-900/20' },
  'needs-review': { icon: AlertCircle, label: 'Needs review', color: 'text-amber-600 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  'not-started': { icon: Circle, label: 'Not started', color: 'text-ink-400', bg: 'bg-ink-50 dark:bg-ink-700/40' },
};

export function AssessmentPage() {
  const { assessments, setAssessmentStatus, sendMessage } = useApp();
  const [active, setActive] = useState<Assessment | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);

  if (active) {
    const q = active.questions[currentQ];
    const selected = answers[q.id];
    const isAnswered = selected !== undefined;
    const score = active.questions.reduce((acc, question) => acc + (answers[question.id] === question.correctIndex ? 1 : 0), 0);
    const allAnswered = active.questions.every((question) => answers[question.id] !== undefined);
    const passed = score >= Math.ceil(active.questions.length * 0.7);

    const finish = () => {
      setSubmitted(true);
      setAssessmentStatus(active.id, passed ? 'passed' : 'needs-review');
      if (passed) {
        window.setTimeout(() => {
          sendMessage(`I just passed the ${active.title} assessment — update my skill gaps`);
        }, 200);
      }
    };

    const reset = () => {
      setAnswers({});
      setSubmitted(false);
      setCurrentQ(0);
    };

    if (submitted) {
      return (
        <div className="mx-auto max-w-2xl px-6 py-8">
          <div className="surface rounded-xl2 p-8 text-center">
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${passed ? 'bg-sage-50 dark:bg-sage-900/30' : 'bg-amber-50 dark:bg-amber-900/30'}`}>
              {passed ? <Trophy size={32} className="text-sage-500" /> : <AlertCircle size={32} className="text-amber-500" />}
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold text-ink-800 dark:text-ink-50">
              {passed ? 'Passed!' : 'Needs review'}
            </h1>
            <p className="mt-1 text-sm text-ink-400">
              You scored {score}/{active.questions.length} ({Math.round((score / active.questions.length) * 100)}%)
            </p>

            <div className="mt-6 space-y-3 text-left">
              {active.questions.map((question, i) => {
                const ans = answers[question.id];
                const correct = ans === question.correctIndex;
                return (
                  <div key={question.id} className={`rounded-xl border p-4 ${correct ? 'border-sage-300 bg-sage-50 dark:border-sage-800 dark:bg-sage-900/20' : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'}`}>
                    <div className="flex items-start gap-2">
                      {correct ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-sage-500" /> : <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-500" />}
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-ink-800 dark:text-ink-50">{i + 1}. {question.prompt}</p>
                        <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">
                          Your answer: {question.options[ans]}
                        </p>
                        {!correct && (
                          <p className="mt-0.5 text-xs font-medium text-sage-600 dark:text-sage-300">
                            Correct: {question.options[question.correctIndex]}
                          </p>
                        )}
                        <p className="mt-1.5 flex items-start gap-1 text-2xs text-ink-400">
                          <Lightbulb size={11} className="mt-0.5 shrink-0 text-amber-400" />
                          {question.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-center gap-3">
              <button onClick={reset} className="btn-secondary text-xs">
                <RotateCcw size={13} /> Retry
              </button>
              <button onClick={() => { setActive(null); setSubmitted(false); setAnswers({}); }} className="btn-primary text-xs">
                Back to assessments
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <button onClick={() => setActive(null)} className="btn-ghost mb-6 -ml-2">
          <ArrowLeft size={16} /> Back to assessments
        </button>

        {/* Header */}
        <div className="surface mb-6 rounded-xl2 p-5">
          <h1 className="font-display text-xl font-bold text-ink-800 dark:text-ink-50">{active.title}</h1>
          <p className="mt-1 text-sm text-ink-400">{active.description}</p>
          <div className="mt-3 flex gap-4 text-2xs text-ink-400">
            <span className="flex items-center gap-1"><Clock size={11} /> ~{active.estMinutes} min</span>
            <span className="flex items-center gap-1"><ClipboardList size={11} /> {active.questionCount} questions</span>
          </div>
          {/* Progress dots */}
          <div className="mt-4 flex gap-1.5">
            {active.questions.map((question, i) => (
              <div
                key={question.id}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i === currentQ ? 'bg-amber-400' : answers[question.id] !== undefined ? 'bg-iris-400' : 'bg-ink-100 dark:bg-ink-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Question */}
        <div className="surface rounded-xl2 p-6">
          <div className="mb-1 text-2xs font-semibold text-ink-300">Question {currentQ + 1} of {active.questions.length}</div>
          <h2 className="font-display text-lg font-semibold text-ink-800 dark:text-ink-50">{q.prompt}</h2>

          <div className="mt-5 space-y-2">
            {q.options.map((opt, i) => {
              const selectedOpt = selected === i;
              return (
                <button
                  key={i}
                  onClick={() => setAnswers({ ...answers, [q.id]: i })}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition-all ${
                    selectedOpt
                      ? 'border-amber-400 bg-amber-50 text-ink-800 dark:bg-amber-900/20 dark:text-ink-50'
                      : 'border-ink-100 text-ink-600 hover:border-ink-200 dark:border-ink-700 dark:text-ink-300 dark:hover:border-ink-600'
                  }`}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-2xs font-bold ${
                    selectedOpt ? 'border-amber-400 bg-amber-400 text-ink-900' : 'border-ink-200 text-ink-400 dark:border-ink-600'
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Nav */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setCurrentQ((i) => Math.max(0, i - 1))}
              disabled={currentQ === 0}
              className="btn-ghost text-xs disabled:opacity-30"
            >
              <ArrowLeft size={14} /> Previous
            </button>
            {currentQ < active.questions.length - 1 ? (
              <button
                onClick={() => setCurrentQ((i) => i + 1)}
                disabled={!isAnswered}
                className="btn-primary text-xs disabled:opacity-30"
              >
                Next <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={finish}
                disabled={!allAnswered}
                className="btn-primary text-xs disabled:opacity-30"
              >
                Submit <CheckCircle2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink-800 dark:text-ink-50">Assessment</h1>
        <p className="mt-1.5 text-sm text-ink-400">Quizzes and skill checks tied to your path milestones</p>
      </div>

      <div className="space-y-3">
        {assessments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl2 border border-dashed border-ink-200 py-16 text-center text-ink-400 dark:border-ink-700">
            <ClipboardList size={32} className="mb-3 opacity-40" />
            <p className="text-sm">No assessments yet — these aren't generated automatically yet, but your task checklist in Learning Path tracks real progress.</p>
          </div>
        ) : assessments.map((a) => {
          const meta = statusMeta[a.status];
          const StatusIcon = meta.icon;
          return (
            <button
              key={a.id}
              onClick={() => { setActive(a); setAnswers({}); setSubmitted(false); setCurrentQ(0); }}
              className="surface flex w-full items-center gap-4 rounded-xl2 p-5 text-left transition-all hover:shadow-lift hover:-translate-y-0.5"
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${meta.bg} ${meta.color}`}>
                <StatusIcon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-sm font-semibold text-ink-800 dark:text-ink-50">{a.title}</h3>
                <p className="mt-0.5 line-clamp-1 text-xs text-ink-400">{a.description}</p>
                <div className="mt-1.5 flex items-center gap-3 text-2xs text-ink-400">
                  <span>{a.pathTitle}</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {a.estMinutes}m</span>
                  <span className="flex items-center gap-1"><ClipboardList size={10} /> {a.questionCount} Q</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`chip ${meta.bg} ${meta.color}`}>{meta.label}</span>
                {a.status === 'passed' ? (
                  <span className="text-2xs text-ink-300">Re-take</span>
                ) : (
                  <span className="text-2xs font-semibold text-amber-500">Start →</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
