import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

const LoginPage = lazy(() => import('./features/epic-1/components/LoginPage'));
const RegisterPage = lazy(() => import('./features/epic-1/components/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./features/epic-1/components/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./features/epic-1/components/ResetPasswordPage'));
const VerificationResultPage = lazy(() => import('./features/epic-1/components/VerificationResultPage'));
const ProjectDashboard = lazy(() => import('./features/epic-1/components/ProjectDashboard'));
const CreateProjectModal = lazy(() => import('./features/epic-1/components/CreateProjectModal'));
const ProjectSettingsPage = lazy(() => import('./features/epic-1/components/ProjectSettingsPage'));
const VolumeOutline = lazy(() => import('./features/epic-1/components/VolumeOutline'));
const WorkbenchShell = lazy(() => import('./components/WorkbenchShell/WorkbenchShell'));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment">
      <div className="w-16 h-16 border-4 border-border border-t-amber rounded-full animate-spin" />
    </div>
  );
}

function DashboardWithModal() {
  return (
    <>
      <ProjectDashboard />
      <CreateProjectModal onClose={() => window.history.back()} />
    </>
  );
}

function OutlinePage() {
  const { projectId } = useParams<{ projectId: string }>();
  if (!projectId) return null;
  return <VolumeOutline projectId={projectId} />;
}

function DevNavigation() {
  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 shadow-lg rounded-md border border-border/60 text-sm z-50 text-ink">
      <h3 className="font-bold mb-2 text-amber">Dev Navigation</h3>
      <ul className="space-y-1">
        <li><Link to="/login" className="hover:underline">/login</Link></li>
        <li><Link to="/register" className="hover:underline">/register</Link></li>
        <li><Link to="/forgot-password" className="hover:underline">/forgot-password</Link></li>
        <li><Link to="/reset-password?token=dev" className="hover:underline">/reset-password</Link></li>
        <li><Link to="/verify?token=dev" className="hover:underline">/verify</Link></li>
        <li><Link to="/dashboard" className="hover:underline">/dashboard</Link></li>
        <li><Link to="/projects/1/settings" className="hover:underline">/projects/1/settings</Link></li>
        <li><Link to="/projects/1/outline" className="hover:underline">/projects/1/outline</Link></li>
        <li><Link to="/projects/1/workspace" className="hover:underline">/projects/1/workspace</Link></li>
      </ul>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <a href="#main-content" className="skip-to-content">
          跳转到主要内容
        </a>
        <main id="main-content">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify" element={<VerificationResultPage />} />
            <Route path="/dashboard" element={<ProjectDashboard />} />
            <Route path="/projects/new" element={<DashboardWithModal />} />
            <Route path="/projects/:projectId/settings" element={<ProjectSettingsPage />} />
            <Route path="/projects/:projectId/outline" element={<OutlinePage />} />
            <Route path="/projects/:projectId/workspace" element={<WorkbenchShell />} />
            <Route path="/projects/:projectId/workspace/:chapterId" element={<WorkbenchShell />} />
          </Routes>
        </Suspense>
        </main>
      </AuthProvider>
      {import.meta.env.DEV && <DevNavigation />}
    </BrowserRouter>
  );
}

export default App;
