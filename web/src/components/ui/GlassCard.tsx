import React, { ReactNode } from 'react';

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    className = '',
    hoverEffect = false
}) => {
    return (
        <div
            className={`
        bg-premium-card backdrop-blur-xl border border-premium-border rounded-lg
        shadow-[0_8px_30px_rgb(0,0,0,0.04)]
        transition-all duration-500 ease-out
        ${hoverEffect ? 'hover:bg-white/[0.04] hover:border-white/[0.12] hover:shadow-[0_8px_30px_rgb(255,255,255,0.02)]' : ''}
        ${className}
      `}
        >
            {children}
        </div>
    );
};
