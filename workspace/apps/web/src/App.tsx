import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import LoginPage from './features/epic-1/components/LoginPage';
import RegisterPage from './features/epic-1/components/RegisterPage';
import ForgotPasswordPage from './features/epic-1/components/ForgotPasswordPage';
import ResetPasswordPage from './features/epic-1/components/ResetPasswordPage';
import VerificationResultPage from './features/epic-1/components/VerificationResultPage';
import ProjectDashboard from './features/epic-1/components/ProjectDashboard';
import CreateProjectModal from './features/epic-1/components/CreateProjectModal';

function DashboardWithModal() {
  return (
    <>
      <ProjectDashboard />
      <CreateProjectModal onClose={() => window.history.back()} />
    </>
  );
}

function DevNavigation() {
  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 shadow-lg rounded-md border border-[#D4C4A8] text-sm z-50">
      <h3 className="font-bold mb-2 text-[#8B6914]">Dev Navigation</h3>
      <ul className="space-y-1">
        <li><Link to="/login" className="hover:underline">/login</Link></li>
        <li><Link to="/register" className="hover:underline">/register</Link></li>
        <li><Link to="/forgot-password" className="hover:underline">/forgot-password</Link></li>
        <li><Link to="/reset-password?token=dev" className="hover:underline">/reset-password</Link></li>
        <li><Link to="/verify?token=dev" className="hover:underline">/verify</Link></li>
        <li><Link to="/dashboard" className="hover:underline">/dashboard</Link></li>
      </ul>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify" element={<VerificationResultPage />} />
        <Route path="/dashboard" element={<ProjectDashboard />} />
        <Route path="/projects/new" element={<DashboardWithModal />} />
      </Routes>
      <DevNavigation />
    </BrowserRouter>
  );
}

export default App;
