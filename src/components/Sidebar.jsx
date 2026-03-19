import { NavLink, useLocation } from 'react-router-dom';
import { Droplets, LayoutDashboard, Settings, LogOut } from 'lucide-react';
import { clearAllData } from '../utils/storage';

export default function Sidebar() {
  const location = useLocation();
  const isOnboarding = location.pathname === '/' || location.pathname === '/onboarding';
  if (isOnboarding) return null;

  const links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const handleReset = () => {
    if (window.confirm('Reset all data and start fresh?')) {
      clearAllData();
      window.location.href = '/';
    }
  };

  return (
    <aside className="glass-strong flex flex-col items-center py-8 px-3 gap-2"
      style={{
        width: '78px',
        minHeight: '100vh',
        borderRadius: '0 20px 20px 0',
        borderLeft: 'none',
      }}
    >
      {/* Logo */}
      <div className="mb-6 animate-float" style={{ cursor: 'default' }}>
        <Droplets size={32} className="text-sky-400" strokeWidth={2.5} />
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-3 flex-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) =>
              `flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-sky-500/25 text-sky-300 shadow-lg shadow-sky-500/20'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/8'
              }`
            }
          >
            <Icon size={22} />
          </NavLink>
        ))}
      </nav>

      {/* Reset */}
      <button
        onClick={handleReset}
        title="Reset Data"
        className="flex items-center justify-center w-12 h-12 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
      >
        <LogOut size={20} />
      </button>
    </aside>
  );
}
