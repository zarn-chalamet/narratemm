import React from 'react';

const ChevronDownIcon: React.FC = () => (
  <svg
    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<SelectOption>;
  icon: React.ReactNode;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  value,
  onChange,
  options,
  icon,
}) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none z-10">
      {icon}
    </span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="pl-10 pr-10 py-3 bg-[#16161e] border border-[#2a2a3e] rounded-xl
                 text-white text-sm appearance-none cursor-pointer
                 focus:outline-none focus:ring-2 focus:ring-violet-500
                 min-w-[160px] transition-all"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    <ChevronDownIcon />
  </div>
);