import { AppProvider, useApp } from '@/store';
import { AppShell } from '@/components/AppShell';
import { DashboardPage } from '@/pages/DashboardPage';
import { CoursesPage } from '@/pages/CoursesPage';
import { PathPage } from '@/pages/PathPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AssessmentPage } from '@/pages/AssessmentPage';

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

function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}

export default App;
