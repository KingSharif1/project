import React, { InputHTMLAttributes, ReactNode } from 'react';

interface PremiumInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    icon?: ReactNode;
    rightElement?: ReactNode;
}

export const PremiumInput: React.FC<PremiumInputProps> = ({
    label,
    icon,
    rightElement,
    className = '',
    ...props
}) => {
    return (
        <div className="space-y-1.5 group">
            <label className="block text-xs font-medium text-premium-accent-slate ml-1 transition-colors group-focus-within:text-premium-accent-white">
                {label}
            </label>
            <div className="relative">
                {icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-premium-accent-slate/50 group-focus-within:text-white transition-colors duration-300">
                        {icon}
                    </div>
                )}
                <input
                    className={`
            w-full bg-white/[0.03] border border-white/[0.08]
            rounded-lg py-3
            ${icon ? 'pl-11' : 'pl-4'} 
            ${rightElement ? 'pr-11' : 'pr-4'}
            text-premium-accent-white placeholder-premium-accent-slate/30
            focus:outline-none focus:bg-white/[0.06] focus:border-white/20
            transition-all duration-300 ease-out
            text-sm
            ${className}
          `}
                    {...props}
                />
                {rightElement && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {rightElement}
                    </div>
                )}
            </div>
        </div>
    );
};
