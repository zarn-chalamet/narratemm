import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, History, Settings, Plus } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  
  // Hide bottom nav on auth pages and project workflow
  if (location.pathname.startsWith('/login') || 
      location.pathname.startsWith('/register') ||
      location.pathname.startsWith('/project/')) {
    return null;
  }

  const items = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { path: '/new-project', icon: Plus, label: 'Create', isMain: true },
    { path: '/history', icon: History, label: 'History' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#12121a]/95 backdrop-blur-xl border-t border-[#2a2a3e] pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          
          if (item.isMain) {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex items-center justify-center -mt-8"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30 flex items-center justify-center">
                  <item.icon className="w-7 h-7 text-white" />
                </div>
              </NavLink>
            );
          }
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors ${
                isActive ? 'text-violet-400' : 'text-gray-500'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
