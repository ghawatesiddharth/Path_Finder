import { useEffect, useState } from 'react';

import { AppProvider, useApp } from '@/store';
import { AppShell } from '@/components/AppShell';

import { DashboardPage } from '@/pages/DashboardPage';
import { CoursesPage } from '@/pages/CoursesPage';
import { PathPage } from '@/pages/PathPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AssessmentPage } from '@/pages/AssessmentPage';
import { AuthPage } from '@/pages/AuthPage';
import { OnboardingPage } from '@/pages/OnboardingPage';

import {
  getCurrentUser,
  isAuthenticated,
  logoutUser,
} from '@/lib/authApi';

function Router() {
  const { route } = useApp();

  return (
    <AppShell route={route}>
      {route === 'dashboard' && <DashboardPage />}
      {route === 'courses' && <CoursesPage />}
      {route === 'path' && <PathPage />}
      {route === 'profile' && <ProfilePage />}
      {route === 'assessment' && <AssessmentPage />}
    </AppShell>
  );
}

function OnboardingGate() {
  const { profileLoading, onboardingNeeded } = useApp();

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 dark:bg-ink-900">
        <div className="text-sm text-ink-400">Loading your account...</div>
      </div>
    );
  }

  if (onboardingNeeded) {
    return <OnboardingPage />;
  }

  return <Router />;
}

function AuthenticatedApp({
  onLogout,
}: {
  onLogout: () => void;
}) {
  useEffect(() => {
    getCurrentUser().catch(() => {
      logoutUser();
      onLogout();
    });
  }, [onLogout]);

  return <OnboardingGate />;
}

function App() {
  const [authenticated, setAuthenticated] =
    useState<boolean>(() => isAuthenticated());

  if (!authenticated) {
    return (
      <AuthPage
        onLoginSuccess={() => {
          setAuthenticated(true);
        }}
      />
    );
  }

  return (
    <AppProvider>
      <AuthenticatedApp
        onLogout={() => {
          setAuthenticated(false);
        }}
      />
    </AppProvider>
  );
}

export default App;