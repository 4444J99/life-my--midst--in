import React from 'react';
import { twMerge } from 'tailwind-merge';

interface NeoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'cyber' | 'obsidian' | 'hologram';
}

export const NeoCard: React.FC<NeoCardProps> = ({ className, variant = 'obsidian', children, ...props }) => {
  const baseStyles = "rounded-xl border p-4 transition-all duration-300";
  const variants = {
    cyber: "bg-black border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)] text-cyan-100",
    obsidian: "bg-neutral-900 border-neutral-700 hover:border-neutral-500 text-white",
    hologram: "bg-blue-900/20 border-blue-500/50 backdrop-blur-md text-blue-100"
  };

  return (
    <div className={twMerge(baseStyles, variants[variant], className)} {...props}>
      {children}
    </div>
  );
};
