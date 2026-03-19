import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import { loadProfile } from './utils/storage';

export default function App() {
  const hasProfile = !!loadProfile();

  return (
    <BrowserRouter>
      <div className="flex h-screen w-screen overflow-hidden">
        <Sidebar />
        <Routes>
          <Route path="/" element={hasProfile ? <Navigate to="/dashboard" /> : <Navigate to="/onboarding" />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
