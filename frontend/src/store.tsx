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
  AssessmentStatus,
  ChatMessage,
  Course,
  GenerationParams,
  LearningPath,
  Route,
  Skill,
  UserProfile,
} from '@/types';

import { emptyUser } from '@/data';
import {
  adaptBackendPath,
  hydrateBackendPath,
  stagesToBackendContent,
} from '@/lib/backendPathAdapter';
import {
  generateRecommendation,
  getBackendLearningPaths,
  updateLearningPathContent,
  updateTaskProgress,
} from '@/lib/recommendationsApi';
import {
  getProfile,
  saveProfile,
  type ProfileData,
  type ProfileUpsertPayload,
} from '@/lib/profileApi';
import { tutorChat } from '@/lib/tutorApi';

/* =========================================================
   INITIAL DATA
   ========================================================= */

const initialUser: UserProfile = {
  ...emptyUser,
};

// Skills, courses, and paths all start empty — they're populated only by
// what the backend ML model actually generates for this user's paths.
const initialSkills: Skill[] = [];

const initialCourses: Course[] = [];

const initialPaths: LearningPath[] = [];

const initialAssessments: Assessment[] = [];

function dedupeSkills(skills: Skill[]): Skill[] {
  const seen = new Set<string>();
  return skills.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
}

function dedupeCourses(courses: Course[]): Course[] {
  const seen = new Set<string>();
  return courses.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
}

/* =========================================================
   APP STATE
   ========================================================= */

export interface AppState {
  /* Routing */
  route: Route;
  setRoute: (route: Route) => void;

  /* Theme */
  dark: boolean;
  toggleTheme: () => void;

  /* Sidebar */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  /* Chat */
  chatOpen: boolean;
  toggleChat: () => void;

  chatMinimized: boolean;
  toggleChatMinimize: () => void;

  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  clearChat: () => void;

  /* User */
  user: UserProfile;
  updateUser: (updates: Partial<UserProfile>) => void;

  /* Profile / onboarding */
  profile: ProfileData | null;
  profileLoading: boolean;
  onboardingNeeded: boolean;
  refreshProfile: () => Promise<void>;
  completeOnboarding: (data: ProfileUpsertPayload) => Promise<void>;

  /* Learning data */
  skills: Skill[];
  courses: Course[];
  paths: LearningPath[];
  assessments: Assessment[];

  /* Courses */
  toggleBookmark: (courseId: string) => void;

  /* Assessments */
  setAssessmentStatus: (
    assessmentId: string,
    status: AssessmentStatus
  ) => void;

  /* Path generation */
  generating: boolean;
  lastGenerationNote: string | null;

  generateFromProfile: (
    params: GenerationParams
  ) => Promise<void>;

  pathsLoading: boolean;
  setActivePath: (pathId: string) => void;

  /* Tasks */
  taskCompletion: Record<string, boolean>;
  toggleTask: (pathId: string, stageId: string, taskId: string) => void;

  /* YouTube */
  youtubeApiKey: string | null;
  setYoutubeApiKey: (key: string | null) => void;

  /* Search */
  askFromSearch: (text: string) => void;
}

/* =========================================================
   CONTEXT
   ========================================================= */

const AppContext = createContext<AppState | undefined>(
  undefined
);

/* =========================================================
   PROVIDER
   ========================================================= */

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({
  children,
}: AppProviderProps) {
  /* -------------------------------------------------------
     Routing
     ------------------------------------------------------- */

  const [route, setRoute] =
    useState<Route>('dashboard');

  /* -------------------------------------------------------
     Theme
     ------------------------------------------------------- */

  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    return (
      localStorage.getItem('pathfinder_theme') ===
      'dark'
    );
  });

  /* -------------------------------------------------------
     Sidebar
     ------------------------------------------------------- */

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState<boolean>(false);

  /* -------------------------------------------------------
     Chat
     ------------------------------------------------------- */

  const [chatOpen, setChatOpen] =
    useState<boolean>(true);

  const [chatMinimized, setChatMinimized] =
    useState<boolean>(false);

  const [messages, setMessages] =
    useState<ChatMessage[]>([
      {
        id: 'welcome',
        role: 'guide',
        text:
          "Hi! I'm your Path Finder guide. Tell me what you want to learn and I'll help you build a learning path.",
        ts: Date.now(),
      },
    ]);

  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /* -------------------------------------------------------
     User
     ------------------------------------------------------- */

  const [user, setUser] =
    useState<UserProfile>(initialUser);

  /* -------------------------------------------------------
     Profile / onboarding
     ------------------------------------------------------- */

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const p = await getProfile();
      setProfile(p);
      if (p) {
        setUser((current) => ({
          ...current,
          name: p.full_name || current.name,
          careerGoal: p.goals || current.careerGoal,
        }));
      }
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const completeOnboarding = useCallback(async (data: ProfileUpsertPayload) => {
    const saved = await saveProfile(data);
    setProfile(saved);
    setUser((current) => ({
      ...current,
      name: saved.full_name || current.name,
      careerGoal: saved.goals || current.careerGoal,
    }));
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  /* -------------------------------------------------------
     Learning Data
     ------------------------------------------------------- */

  const [skills, setSkills] =
    useState<Skill[]>(initialSkills);

  const [courses, setCourses] =
    useState<Course[]>(initialCourses);

  const [paths, setPaths] =
    useState<LearningPath[]>(initialPaths);

  const pathsRef = useRef<LearningPath[]>(initialPaths);
  useEffect(() => {
    pathsRef.current = paths;
  }, [paths]);

  const [pathsLoading, setPathsLoading] = useState<boolean>(true);

  const [assessments, setAssessments] =
    useState<Assessment[]>(initialAssessments);

  /* -------------------------------------------------------
     Generation
     ------------------------------------------------------- */

  const [generating, setGenerating] =
    useState<boolean>(false);

  const [lastGenerationNote, setLastGenerationNote] =
    useState<string | null>(null);

  /* -------------------------------------------------------
     Tasks
     ------------------------------------------------------- */

  const [taskCompletion, setTaskCompletion] =
    useState<Record<string, boolean>>({});

  const taskCompletionRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    taskCompletionRef.current = taskCompletion;
  }, [taskCompletion]);

  /* -------------------------------------------------------
     YouTube API Key
     ------------------------------------------------------- */

  const [youtubeApiKey, setYoutubeApiKeyState] =
    useState<string | null>(() => {
      if (typeof window === 'undefined') {
        return null;
      }

      return (
        localStorage.getItem(
          'youtube_api_key'
        ) ?? null
      );
    });

  /* =======================================================
     THEME EFFECT
     ======================================================= */

  useEffect(() => {
    const root =
      document.documentElement;

    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem(
      'pathfinder_theme',
      dark ? 'dark' : 'light'
    );
  }, [dark]);

  /* =======================================================
     SIDEBAR
     ======================================================= */

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(
      (current) => !current
    );
  }, []);

  /* =======================================================
     THEME
     ======================================================= */

  const toggleTheme = useCallback(() => {
    setDark(
      (current) => !current
    );
  }, []);

  /* =======================================================
     CHAT
     ======================================================= */

  const toggleChat = useCallback(() => {
    setChatOpen(
      (current) => !current
    );

    setChatMinimized(false);
  }, []);

  const toggleChatMinimize =
    useCallback(() => {
      setChatMinimized(
        (current) => !current
      );
    }, []);

  /* =======================================================
     SEND CHAT MESSAGE
     ======================================================= */

  const sendMessage = useCallback(
    (text: string) => {
      const cleanText =
        text.trim();

      if (!cleanText) {
        return;
      }

      const now = Date.now();

      const userMessage: ChatMessage = {
        id: `user-${now}`,
        role: 'user',
        text: cleanText,
        ts: now,
      };

      setMessages(
        (current) => [
          ...current,
          userMessage,
        ]
      );

      const activePath = pathsRef.current.find((p) => p.active);
      const activeStage = activePath?.stages.find((s) => s.status === 'active');

      const history = messagesRef.current
        .slice(-8)
        .map((m) => ({ role: (m.role === 'guide' ? 'assistant' : 'user') as 'assistant' | 'user', text: m.text }));

      tutorChat(cleanText, history, {
        learning_path_title: activePath?.title ?? null,
        stage_title: activeStage?.title ?? null,
        skill: activeStage?.skillIds?.[0] ?? null,
      })
        .then((res) => {
          const guideMessage: ChatMessage = {
            id: `guide-${Date.now()}`,
            role: 'guide',
            text: res.reply,
            ts: Date.now(),
          };
          setMessages((current) => [...current, guideMessage]);
        })
        .catch(() => {
          const guideMessage: ChatMessage = {
            id: `guide-${Date.now()}`,
            role: 'guide',
            text: "I couldn't reach the tutor service. Make sure the backend is running and try again.",
            ts: Date.now(),
          };
          setMessages((current) => [...current, guideMessage]);
        });
    },
    []
  );

  /* =======================================================
     CLEAR CHAT
     ======================================================= */

  const clearChat = useCallback(() => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'guide',
        text:
          "Hi! I'm your Path Finder guide. Tell me what you want to learn and I'll help you build a learning path.",
        ts: Date.now(),
      },
    ]);
  }, []);

  /* =======================================================
     USER UPDATE
     ======================================================= */

  const updateUser = useCallback(
    (
      updates: Partial<UserProfile>
    ) => {
      setUser(
        (current) => ({
          ...current,
          ...updates,
        })
      );
    },
    []
  );

  /* =======================================================
     COURSE BOOKMARK
     ======================================================= */

  const toggleBookmark = useCallback(
    (courseId: string) => {
      setCourses(
        (current) =>
          current.map(
            (course) => {
              if (
                course.id !==
                courseId
              ) {
                return course;
              }

              const nextBookmarked =
                !course.bookmarked;

              let nextStatus =
                course.status;

              if (
                nextBookmarked
              ) {
                nextStatus =
                  'bookmarked';
              } else if (
                course.status ===
                'bookmarked'
              ) {
                nextStatus =
                  'recommended';
              }

              return {
                ...course,
                bookmarked:
                  nextBookmarked,
                status:
                  nextStatus,
              };
            }
          )
      );
    },
    []
  );

  /* =======================================================
     ASSESSMENT STATUS
     ======================================================= */

  const setAssessmentStatus =
    useCallback(
      (
        assessmentId: string,
        status: AssessmentStatus
      ) => {
        setAssessments(
          (current) =>
            current.map(
              (assessment) =>
                assessment.id ===
                assessmentId
                  ? {
                      ...assessment,
                      status,
                    }
                  : assessment
            )
        );
      },
      []
    );

  /* =======================================================
     TASK TOGGLE
     ======================================================= */

  const toggleTask = useCallback(
    (pathId: string, stageId: string, taskId: string) => {
      const nextCompleted = !taskCompletionRef.current[taskId];

      setTaskCompletion((current) => ({
        ...current,
        [taskId]: nextCompleted,
      }));

      // reflect it in the path's own stage/task data too (drives progress %)
      setPaths((current) =>
        current.map((p) => {
          if (p.id !== pathId) return p;
          return {
            ...p,
            stages: p.stages.map((s) => {
              if (s.id !== stageId) return s;
              return {
                ...s,
                tasks: s.tasks?.map((t) =>
                  t.id === taskId ? { ...t, completed: nextCompleted } : t,
                ),
              };
            }),
          };
        }),
      );

      updateTaskProgress(pathId, stageId, taskId, nextCompleted).catch((err) => {
        console.error('Failed to sync task progress:', err);
      });
    },
    [],
  );

  /* =======================================================
     YOUTUBE API KEY
     ======================================================= */

  const setYoutubeApiKey =
    useCallback(
      (key: string | null) => {
        const cleanKey =
          key?.trim() || null;

        setYoutubeApiKeyState(
          cleanKey
        );

        if (cleanKey) {
          localStorage.setItem(
            'youtube_api_key',
            cleanKey
          );
        } else {
          localStorage.removeItem(
            'youtube_api_key'
          );
        }
      },
      []
    );

  /* =======================================================
     LOAD EXISTING LEARNING PATHS ON MOUNT
     ======================================================= */

  const didLoadPaths = useRef(false);

  useEffect(() => {
    if (didLoadPaths.current) return;
    didLoadPaths.current = true;

    (async () => {
      setPathsLoading(true);
      try {
        const backendPaths = await getBackendLearningPaths();
        // Already-generated + enriched paths (content.stages[].tasks
        // present) hydrate instantly with no YouTube calls. The most
        // recently created one becomes the active/dashboard path.
        const adapted = backendPaths.map((bp) => hydrateBackendPath(bp));
        const nextSkills = adapted.flatMap((a) => a.skills);
        const nextCourses = adapted.flatMap((a) => a.courses);
        const nextPaths = adapted.map((a, i) => ({
          ...a.learningPath,
          active: i === 0,
        }));
        if (nextPaths.length) {
          setPaths(nextPaths);
          setSkills((current) => dedupeSkills([...nextSkills, ...current]));
          setCourses((current) => dedupeCourses([...nextCourses, ...current]));

          const nextCompletion: Record<string, boolean> = {};
          for (const p of nextPaths) {
            for (const s of p.stages) {
              for (const t of s.tasks ?? []) {
                if (t.completed) nextCompletion[t.id] = true;
              }
            }
          }
          setTaskCompletion((current) => ({ ...nextCompletion, ...current }));
        }
      } catch {
        // not authenticated yet, or backend unreachable — leave state empty
      } finally {
        setPathsLoading(false);
      }
    })();
  }, []);

  const setActivePath = useCallback((pathId: string) => {
    setPaths((current) => current.map((p) => ({ ...p, active: p.id === pathId })));
  }, []);

  /* =======================================================
     GENERATE LEARNING PATH
     ======================================================= */

  const generateFromProfile = useCallback(
    async (params: GenerationParams) => {
      setGenerating(true);
      setLastGenerationNote(null);

      try {
        const backendPath = await generateRecommendation({
          goal_text: params.goalText,
          career_path: params.careerPath,
          experience_level: params.experienceLevel,
          purpose: params.purpose,
          days_available: params.daysAvailable,
          free_only: params.freeOnly,
        });

        const { learningPath, skills: newSkills, courses: newCourses, note } =
          await adaptBackendPath(backendPath, params);

        // Persist the YouTube-enriched tasks back to the backend so a page
        // reload doesn't re-hit the YouTube API and progress survives.
        const enrichedContent = stagesToBackendContent(backendPath.content, learningPath.stages);
        updateLearningPathContent(backendPath.id, enrichedContent).catch(() => {});

        setPaths((current) => [
          { ...learningPath, active: true },
          ...current.map((p) => ({ ...p, active: false })),
        ]);
        setSkills((current) => dedupeSkills([...newSkills, ...current]));
        setCourses((current) => dedupeCourses([...newCourses, ...current]));

        setLastGenerationNote(
          note ?? `Learning path generated for "${params.goalText || learningPath.title}".`,
        );
        setRoute('path');
      } catch (err) {
        console.error('Failed to generate learning path:', err);
        const axiosErr = err as {
          response?: { status?: number; data?: { detail?: string } };
          request?: unknown;
        };
        const status = axiosErr?.response?.status;
        const detail = axiosErr?.response?.data?.detail;

        let message: string;
        if (detail) {
          // Backend responded with a specific error (validation, etc.)
          message = detail;
        } else if (status === 401) {
          message = 'Your session has expired. Please log in again to generate a path.';
        } else if (axiosErr?.response) {
          // Backend responded but with no usable detail (500, etc.)
          message = `The recommendation service returned an error (status ${status ?? 'unknown'}). Check the backend logs for details.`;
        } else if (axiosErr?.request) {
          // Request was sent but no response came back at all — the classic
          // "backend isn't running" case.
          message =
            'Could not reach the recommendation service. Make sure the backend server is running (uvicorn) and reachable at the configured API URL, and that you are logged in.';
        } else {
          message = 'Something went wrong while generating your path. Please try again.';
        }
        setLastGenerationNote(message);
      } finally {
        setGenerating(false);
      }
    },
    [],
  );

  /* =======================================================
     SEARCH -> CHAT
     ======================================================= */

  const askFromSearch =
    useCallback(
      (text: string) => {
        setChatOpen(true);
        setChatMinimized(false);

        sendMessage(text);
      },
      [sendMessage]
    );

  /* =======================================================
     APP STATE VALUE
     ======================================================= */

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

      profile,
      profileLoading,
      onboardingNeeded: !profileLoading && !profile?.onboarding_completed,
      refreshProfile,
      completeOnboarding,

      skills,
      courses,
      paths,
      assessments,

      toggleBookmark,
      setAssessmentStatus,

      generating,
      lastGenerationNote,
      generateFromProfile,

      pathsLoading,
      setActivePath,

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
      profile,
      profileLoading,
      refreshProfile,
      completeOnboarding,
      skills,
      courses,
      paths,
      assessments,
      toggleBookmark,
      setAssessmentStatus,
      generating,
      lastGenerationNote,
      generateFromProfile,
      pathsLoading,
      setActivePath,
      taskCompletion,
      toggleTask,
      youtubeApiKey,
      setYoutubeApiKey,
      askFromSearch,
    ]
  );

  /* =======================================================
     PROVIDER
     ======================================================= */

  return (
    <AppContext.Provider
      value={value}
    >
      {children}
    </AppContext.Provider>
  );
}

/* =========================================================
   useApp HOOK
   ========================================================= */

export function useApp(): AppState {
  const context =
    useContext(AppContext);

  if (
    context === undefined
  ) {
    throw new Error(
      'useApp must be used inside AppProvider'
    );
  }

  return context;
}
export const chatQuickSuggestions = [
  'I want to learn Java for placement',
  'DSA roadmap for coding interviews',
  'Learn Python for data science',
  'Web development roadmap in 60 days',
];