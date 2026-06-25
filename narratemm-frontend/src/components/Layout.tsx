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
import { useNotificationStore } from '../store/notificationStore';

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

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

  const notificationsMap = useNotificationStore((s) => s.notifications);
  const notifications = React.useMemo(
    () => Object.values(notificationsMap),
    [notificationsMap]
  );
  const unreadCount = React.useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const removeNotification = useNotificationStore((s) => s.removeNotification);
  const clearAllNotifications = useNotificationStore((s) => s.clearAll);
  const [notifOpen, setNotifOpen] = React.useState(false);

  // Sort newest first
  const sortedNotifs = [...notifications].sort((a, b) => b.createdAt - a.createdAt);

  // Helper: icon per type (supports future types automatically)
  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'export-done': return '✅';
      case 'export-failed': return '❌';
      case 'export-progress': return '⚙️';
      case 'product-update': return '🎉';
      case 'announcement': return '📢';
      case 'promotion': return '🎁';
      case 'system': return '⚙️';
      default: return '🔔';
    }
  };

  const getNotifColor = (type: string) => {
    switch (type) {
      case 'export-done': return 'bg-green-400';
      case 'export-failed': return 'bg-red-400';
      case 'export-progress': return 'bg-violet-400 animate-pulse';
      case 'product-update': return 'bg-purple-400';
      case 'promotion': return 'bg-pink-400';
      default: return 'bg-gray-400';
    }
  };

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
              <div className="relative">
                <button
                  onClick={() => {
                    setNotifOpen(!notifOpen);
                    if (!notifOpen && unreadCount > 0) markAllAsRead();
                  }}
                  className="relative p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 bg-violet-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#1a1a24] border border-[#2a2a3e] rounded-xl shadow-2xl z-20 overflow-hidden">
                      {/* Header */}
                      <div className="px-4 py-3 border-b border-[#2a2a3e] flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white">Notifications</h3>
                        {notifications.length > 0 && (
                          <button
                            onClick={() => {
                              clearAllNotifications();
                              setNotifOpen(false);
                            }}
                            className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                          >
                            Clear all
                          </button>
                        )}
                      </div>

                      {/* List */}
                      <div className="max-h-96 overflow-y-auto">
                        {sortedNotifs.length === 0 ? (
                          <div className="p-8 text-center text-gray-500 text-sm">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            No notifications yet
                          </div>
                        ) : (
                          sortedNotifs.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => {
                                if (n.link) navigate(n.link);
                                markAsRead(n.id);
                                setNotifOpen(false);
                              }}
                              className={`p-4 border-b border-[#2a2a3e] cursor-pointer hover:bg-white/5 transition-colors ${
                                !n.read ? 'bg-violet-500/5' : ''
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${getNotifColor(n.type)}`} />
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{getNotifIcon(n.type)}</span>
                                    <p className="text-sm font-medium text-white truncate">
                                      {n.title}
                                    </p>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                                    {n.message}
                                  </p>
                                  
                                  {/* Progress bar for in-progress exports */}
                                  {n.type === 'export-progress' && (
                                    <div className="mt-2 h-1 bg-[#2a2a3e] rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all"
                                        style={{ width: `${n.metadata?.progress || 0}%` }}
                                      />
                                    </div>
                                  )}
                                  
                                  <p className="text-[10px] text-gray-600 mt-1">
                                    {formatTimeAgo(n.createdAt)}
                                  </p>
                                </div>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeNotification(n.id);
                                  }}
                                  className="text-gray-600 hover:text-red-400 flex-shrink-0 p-1"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

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
