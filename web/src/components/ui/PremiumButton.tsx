import React, { ReactNode } from 'react';

interface PremiumButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    icon?: ReactNode;
}

export const PremiumButton: React.FC<PremiumButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    icon,
    className = '',
    ...props
}) => {
    const baseStyles = "relative inline-flex items-center justify-center font-medium transition-all duration-300 rounded-lg focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group tracking-wide";

    const variants = {
        // Solid white/off-white for high contrast premium feel
        primary: "bg-premium-accent-white text-premium-dark hover:bg-white shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]",
        // Glassy secondary
        secondary: "bg-white/[0.08] text-premium-accent-white hover:bg-white/[0.12] border border-white/[0.05]",
        // Clean outline
        outline: "border border-white/20 text-premium-accent-white hover:border-white/40 hover:bg-white/[0.05]",
        // Minimal ghost
        ghost: "text-premium-accent-slate hover:text-white hover:bg-white/[0.05]"
    };

    const sizes = {
        sm: "px-4 py-2 text-xs",
        md: "px-6 py-3 text-sm",
        lg: "px-8 py-3.5 text-base"
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : icon ? (
                <span className="mr-2 opacity-80 group-hover:opacity-100 transition-opacity">{icon}</span>
            ) : null}

            <span className="relative z-10">{children}</span>
        </button>
    );
};
