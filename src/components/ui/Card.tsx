import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}: CardProps) {
  const variants = {
    default: 'bg-slate-900 border border-slate-800',
    elevated: 'bg-slate-900 border border-slate-800 shadow-xl shadow-black/20',
    bordered: 'bg-slate-900/50 border-2 border-cyan-500/30',
    glass: 'bg-slate-900/40 backdrop-blur-xl border border-slate-800/50'
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div
      className={`rounded-xl transition-all duration-200 ${variants[variant]} ${paddings[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mb-6 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-2xl font-bold text-white ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '' }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-slate-400 mt-2 ${className}`}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '' }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mt-6 pt-6 border-t border-slate-800 ${className}`}>
      {children}
    </div>
  );
}
