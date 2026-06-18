import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderPlus, 
  History, 
  Settings, 
  LogOut, 
  ChevronDown,
  Bell,
  Menu,
  X
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Logo } from './Logo';
import { MobileBottomNav } from './MobileBottomNav';

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'New Project', href: '/new-project', icon: FolderPlus },
    { name: 'History', href: '/history', icon: History },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  // Close sidebar on route change
  React.useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentPage = navigation.find(n => n.href === location.pathname);

  return (
    <div className="min-h-screen bg-[#0f0f14]">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop always visible, Mobile as drawer */}
      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-72 bg-[#12121a] border-r border-[#2a2a3e]
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:w-64
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-[#2a2a3e]">
            <Logo size="sm" />
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 -mr-2 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                    transition-all duration-200
                    ${isActive 
                      ? 'bg-violet-500/10 text-violet-400 border border-violet-500/30' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-[#2a2a3e]">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1a1a24]">
              <img
                src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=8b5cf6&color=fff`}
                alt={user?.name}
                className="w-10 h-10 rounded-full flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full mt-3 px-4 py-2.5 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-[#0f0f14]/80 backdrop-blur-xl border-b border-[#2a2a3e]">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Page title - hidden on mobile (shown in content) */}
            <div className="hidden lg:block">
              <h1 className="text-lg font-semibold text-white">
                {currentPage?.name || 'NarrateMM'}
              </h1>
            </div>

            {/* Spacer for mobile */}
            <div className="lg:hidden w-8" />

            {/* Right side actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-violet-500 rounded-full" />
              </button>

              {/* User dropdown - mobile shows avatar only, desktop shows name */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <img
                    src={user?.avatar}
                    alt={user?.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <ChevronDown className={`hidden sm:block w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setUserMenuOpen(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-[#1a1a24] border border-[#2a2a3e] rounded-xl shadow-xl z-20 py-1">
                      <div className="px-4 py-2 border-b border-[#2a2a3e] sm:hidden">
                        <p className="text-sm text-white font-medium truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      </div>
                      <Link
                        to="/settings"
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
                      >
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content - extra bottom padding on mobile for bottom nav */}
        <main className="p-4 lg:p-8 pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav />
    </div>
  );
};
