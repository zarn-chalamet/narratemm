import React from 'react';
import { Film } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const sizes = {
    sm: { icon: 'w-6 h-6', container: 'w-8 h-8', text: 'text-lg' },
    md: { icon: 'w-8 h-8', container: 'w-12 h-12', text: 'text-2xl' },
    lg: { icon: 'w-12 h-12', container: 'w-16 h-16', text: 'text-3xl' },
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`${sizes[size].container} rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30`}>
        <Film className={`${sizes[size].icon} text-white`} />
      </div>
      {showText && (
        <div>
          <h1 className={`${sizes[size].text} font-bold text-white tracking-tight`}>
            Narrate<span className="text-violet-400">MM</span>
          </h1>
          {size !== 'sm' && (
            <p className="text-xs text-gray-500 -mt-0.5">Myanmar Drama Recap</p>
          )}
        </div>
      )}
    </div>
  );
};
