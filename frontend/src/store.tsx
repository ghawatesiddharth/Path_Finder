import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
import { SKILLS } from '@/lib/skillGraph';

/* =========================================================
   INITIAL DATA
   ========================================================= */

const initialUser: UserProfile = {
  ...emptyUser,
};

const initialSkills: Skill[] = Object.values(SKILLS).map(
  (skill): Skill => ({
    id: skill.id,
    name: skill.name,
    icon: skill.icon ?? 'Circle',
    current: 0,
    target: 100,
    targetLabel: 'Target',
    level: 'Beginner',
    mastered: false,
    nextMilestone: `Start learning ${skill.name}`,
    domain: skill.domain,
  })
);

const initialCourses: Course[] = [];

const initialPaths: LearningPath[] = [];

const initialAssessments: Assessment[] = [];

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
  ) => void;

  /* Tasks */
  taskCompletion: Record<string, boolean>;
  toggleTask: (taskId: string) => void;

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

  /* -------------------------------------------------------
     User
     ------------------------------------------------------- */

  const [user, setUser] =
    useState<UserProfile>(initialUser);

  /* -------------------------------------------------------
     Learning Data
     ------------------------------------------------------- */

  const [skills, setSkills] =
    useState<Skill[]>(initialSkills);

  const [courses, setCourses] =
    useState<Course[]>(initialCourses);

  const [paths, setPaths] =
    useState<LearningPath[]>(initialPaths);

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

      /*
       * Simple local guide response for now.
       * Backend/AI integration can be added later.
       */
      window.setTimeout(() => {
        const guideMessage: ChatMessage = {
          id: `guide-${Date.now()}`,
          role: 'guide',
          text:
            `I can help you with "${cleanText}". Start by creating a learning path from your goal, then use the Courses and Assessment sections to continue.`,
          ts: Date.now(),
        };

        setMessages(
          (current) => [
            ...current,
            guideMessage,
          ]
        );
      }, 300);
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
    (taskId: string) => {
      setTaskCompletion(
        (current) => ({
          ...current,
          [taskId]:
            !current[taskId],
        })
      );
    },
    []
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
     GENERATE LEARNING PATH
     ======================================================= */

  const generateFromProfile =
    useCallback(
      (
        params: GenerationParams
      ) => {
        setGenerating(true);
        setLastGenerationNote(
          null
        );

        /*
         * Temporary generation layer.
         *
         * The actual path generator can be connected here
         * once the backend/API integration is ready.
         */

        window.setTimeout(() => {
          setGenerating(false);

          setLastGenerationNote(
            `Learning path generated for "${params.goalText}".`
          );

          /*
           * Navigate to the path page.
           */
          setRoute('path');
        }, 500);
      },
      []
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

      skills,
      courses,
      paths,
      assessments,

      toggleBookmark,
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
      paths,
      assessments,
      toggleBookmark,
      setAssessmentStatus,
      generating,
      lastGenerationNote,
      generateFromProfile,
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