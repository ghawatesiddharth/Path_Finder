import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  Assessment,
  ChatMessage,
  Course,
  GenerationParams,
  LearningPath,
  Route,
  Skill,
  UserProfile,
} from '@/types';
import { chatQuickSuggestions, emptyUser } from '@/data';
import { generateLearningPath } from '@/lib/pathGenerator';

interface AppState {
  // routing
  route: Route;
  setRoute: (r: Route) => void;

  // theme
  dark: boolean;
  toggleTheme: () => void;

  // sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // chat — open/closed (fully hidden vs floating launcher) and
  // minimized (collapsed to a slim bar while still "open")
  chatOpen: boolean;
  toggleChat: () => void;
  chatMinimized: boolean;
  toggleChatMinimize: () => void;
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  clearChat: () => void;

  // data — all real, empty until the person generates something
  user: UserProfile;
  updateUser: (patch: Partial<UserProfile>) => void;
  skills: Skill[];
  courses: Course[];
  toggleBookmark: (id: string) => void;
  paths: LearningPath[];
  assessments: Assessment[];
  setAssessmentStatus: (id: string, status: Assessment['status']) => void;

  // generated path / task tracking
  generating: boolean;
  lastGenerationNote: string | null;
  generateFromProfile: (params: GenerationParams) => Promise<string[]>;
  taskCompletion: Record<string, boolean>;
  toggleTask: (taskId: string) => void;
  youtubeApiKey: string;
  setYoutubeApiKey: (key: string) => void;

  // search -> chat routing
  askFromSearch: (text: string) => void;
}

const Ctx = createContext<AppState | null>(null);

let idCounter = 0;
const nextId = () => `m${Date.now()}_${idCounter++}`;

const initialGuideMessages: ChatMessage[] = [
  {
    id: 'g0',
    role: 'guide',
    text: "Hi — I'm your Learning Guide. Tell me what you want to learn (e.g. \"I want to learn Java for placement\") and I'll build a real, sequenced roadmap from actual courses and YouTube videos.",
    ts: Date.now() - 60000,
  },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>('dashboard');
  const [dark, setDark] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialGuideMessages);
  const [user, setUser] = useState<UserProfile>(emptyUser);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [assessments] = useState<Assessment[]>([]);
  const [generating, setGenerating] = useState(false);
  const [lastGenerationNote, setLastGenerationNote] = useState<string | null>(null);
  const [taskCompletion, setTaskCompletion] = useState<Record<string, boolean>>({});
  const [youtubeApiKey, setYoutubeApiKeyState] = useState<string>(
    () => localStorage.getItem('yt_api_key') ?? '',
  );
  const generateFromProfileRef = useRef<(params: GenerationParams) => Promise<string[]>>(
    async () => [],
  );

  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [dark]);

  const toggleTheme = useCallback(() => setDark((d) => !d), []);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((c) => !c), []);
  const toggleChat = useCallback(() => {
    setChatOpen((o) => !o);
    setChatMinimized(false);
  }, []);
  const toggleChatMinimize = useCallback(() => setChatMinimized((m) => !m), []);
  const clearChat = useCallback(() => setMessages(initialGuideMessages), []);

  // Honest, state-derived replies only — no fabricated actions like a fake
  // "re-ranked your path" that doesn't actually do anything.
  const generateGuideReply = useCallback(
    (text: string): { text: string; preview?: ChatMessage['preview'] } => {
      const lower = text.toLowerCase();
      const activePath = paths.find((p) => p.active);

      if (lower.includes('skill gap') || lower.includes('gap')) {
        if (!skills.length) {
          return { text: 'You have no skills tracked yet — generate a learning path first and I can show you the gaps.' };
        }
        const gaps = skills
          .filter((s) => !s.mastered && s.target - s.current > 0)
          .sort((a, b) => b.target - b.current - (a.target - a.current))
          .slice(0, 5);
        return {
          text: activePath ? `Your skill gaps toward "${activePath.title}":` : 'Your current skill gaps:',
          preview: { type: 'skill', items: gaps.map((s) => `${s.name}: ${s.current}/${s.target} — ${s.target - s.current} to go`) },
        };
      }
      if (lower.includes('roadmap') || lower.includes('path')) {
        if (activePath) {
          return {
            text: `Here's your active roadmap — ${activePath.title}:`,
            preview: { type: 'roadmap', items: activePath.stages.map((s) => `${s.index}. ${s.title} — ${s.status}`) },
          };
        }
        return { text: 'You have no active path yet. Tell me a goal — e.g. "I want to learn Python" — and I\'ll build one.' };
      }
      if (lower.includes('next') || lower.includes('continue')) {
        if (!activePath) return { text: 'No active path yet — describe what you want to learn and I\'ll generate one.' };
        const nextStage = activePath.stages.find((s) => s.status === 'active') ?? activePath.stages[0];
        const nextTask = nextStage?.tasks?.find((t) => !taskCompletion[t.id]);
        return {
          text: nextTask
            ? `Your next task is "${nextTask.label}" in the ${nextStage.title} stage.`
            : `Your current stage is ${nextStage?.title ?? 'complete'}.`,
        };
      }
      if (lower.includes('goal') || lower.includes('career')) {
        return {
          text: user.careerGoal
            ? `Your goal is "${user.careerGoal}", committing ${user.weeklyHours}h/week. Want me to build or refresh a path for it?`
            : "You haven't set a goal yet — tell me what you want to learn and I'll generate a path.",
        };
      }
      return {
        text: "I can build a learning path, show your skill gaps, or tell you what's next in your active path. Try one of the chips above, or just tell me what you want to learn.",
      };
    },
    [skills, paths, user, taskCompletion],
  );

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const userMsg: ChatMessage = { id: nextId(), role: 'user', text: trimmed, ts: Date.now() };
      setMessages((prev) => [...prev, userMsg]);

      const lower = trimmed.toLowerCase();

      // "I want to learn X" -> actually generate a real path from the model,
      // instead of a canned reply, so the chat is a genuine intake channel too.
      const isLearnIntent = /\b(learn|i want to become|teach me|i want to study|roadmap for)\b/.test(lower)
        && !lower.includes('skill gap') && !lower.includes('gap')
        && !lower.includes('show my roadmap') && !lower.includes('re-rank') && !lower.includes('rerank');

      if (isLearnIntent) {
        window.setTimeout(() => {
          const thinking: ChatMessage = {
            id: nextId(), role: 'guide',
            text: `On it — building a personalized roadmap for "${trimmed}"...`, ts: Date.now(),
          };
          setMessages((prev) => [...prev, thinking]);
        }, 300);

        generateFromProfileRef.current({
          goalText: trimmed,
          daysAvailable: null,
          experienceLevel: 'Beginner',
          purpose: 'Personal interest / hobby',
          freeOnly: false,
          resourceMode: 'mixed',
          youtubeApiKey: null,
        }).then((stages) => {
          const guideMsg: ChatMessage = {
            id: nextId(), role: 'guide',
            text: `Done! I generated a roadmap for "${trimmed}" and opened it in your Learning Path tab. You can fine-tune the day budget, experience level, and video source (single playlist / same channel / mixed) from Home.`,
            preview: stages ? { type: 'roadmap', items: stages } : undefined,
            ts: Date.now(),
          };
          setMessages((prev) => [...prev, guideMsg]);
        });
        return;
      }

      window.setTimeout(() => {
        const reply = generateGuideReply(trimmed);
        const guideMsg: ChatMessage = {
          id: nextId(),
          role: 'guide',
          text: reply.text,
          preview: reply.preview,
          ts: Date.now(),
        };
        setMessages((prev) => [...prev, guideMsg]);
      }, 550);
    },
    [generateGuideReply],
  );

  const askFromSearch = useCallback(
    (text: string) => {
      setChatOpen(true);
      setChatMinimized(false);
      sendMessage(text);
    },
    [sendMessage],
  );

  const updateUser = useCallback((patch: Partial<UserProfile>) => {
    setUser((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleBookmark = useCallback((id: string) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, bookmarked: !c.bookmarked } : c)),
    );
  }, []);

  const setAssessmentStatus = useCallback(() => {
    // no-op placeholder: assessments aren't generated by the model yet
  }, []);

  const setYoutubeApiKey = useCallback((key: string) => {
    setYoutubeApiKeyState(key);
    if (key) localStorage.setItem('yt_api_key', key);
    else localStorage.removeItem('yt_api_key');
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    setTaskCompletion((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  }, []);

  const generateFromProfile = useCallback(
    async (params: GenerationParams): Promise<string[]> => {
      setGenerating(true);
      try {
        const result = await generateLearningPath({
          ...params,
          youtubeApiKey: params.youtubeApiKey || youtubeApiKey || null,
        });
        setPaths((prev) => [
          ...prev.map((p) => ({ ...p, active: false })),
          result.learningPath,
        ]);
        setSkills((prev) => {
          const merged = [...prev];
          for (const s of result.skills) {
            const idx = merged.findIndex((m) => m.id === s.id);
            if (idx >= 0) merged[idx] = s;
            else merged.push(s);
          }
          return merged;
        });
        setCourses((prev) => [...prev, ...result.courses]);
        setTaskCompletion({});
        setLastGenerationNote(result.note ?? null);
        updateUser({ careerGoal: params.goalText });
        setRoute('path');
        return result.learningPath.stages.map((s) => `${s.index}. ${s.title}`);
      } finally {
        setGenerating(false);
      }
    },
    [youtubeApiKey, updateUser],
  );
  generateFromProfileRef.current = generateFromProfile;

  const value = useMemo<AppState>(
    () => ({
      route,
      setRoute,
      dark,
      toggleTheme,
      sidebarCollapsed,
      toggleSidebar,
      chatOpen,
      toggleChat,
      chatMinimized,
      toggleChatMinimize,
      messages,
      sendMessage,
      clearChat,
      user,
      updateUser,
      skills,
      courses,
      toggleBookmark,
      paths,
      assessments,
      setAssessmentStatus,
      generating,
      lastGenerationNote,
      generateFromProfile,
      taskCompletion,
      toggleTask,
      youtubeApiKey,
      setYoutubeApiKey,
      askFromSearch,
    }),
    [
      route,
      dark,
      toggleTheme,
      sidebarCollapsed,
      toggleSidebar,
      chatOpen,
      toggleChat,
      chatMinimized,
      toggleChatMinimize,
      messages,
      sendMessage,
      clearChat,
      user,
      updateUser,
      skills,
      courses,
      toggleBookmark,
      paths,
      assessments,
      setAssessmentStatus,
      generating,
      lastGenerationNote,
      generateFromProfile,
      taskCompletion,
      toggleTask,
      youtubeApiKey,
      setYoutubeApiKey,
      askFromSearch,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { chatQuickSuggestions };
