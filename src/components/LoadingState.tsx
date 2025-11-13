import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export function LoadingState({ message = 'Chargement...', size = 'md', fullScreen = false }: LoadingStateProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50'
    : 'flex items-center justify-center p-8';

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className={`${sizeClasses[size]} text-cyan-400 animate-spin`} />
        {message && (
          <p className="text-sm text-slate-400 animate-pulse">{message}</p>
        )}
      </div>
    </div>
  );
}

export function SkeletonLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-800 rounded ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
      <SkeletonLoader className="h-6 w-3/4" />
      <SkeletonLoader className="h-4 w-full" />
      <SkeletonLoader className="h-4 w-5/6" />
      <div className="flex gap-2 pt-2">
        <SkeletonLoader className="h-8 w-24" />
        <SkeletonLoader className="h-8 w-24" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <SkeletonLoader className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <SkeletonLoader className="h-4 w-1/3" />
              <SkeletonLoader className="h-3 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden">
      <div className="bg-slate-900 p-4 border-b border-slate-800 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonLoader key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="bg-slate-950 p-4 border-b border-slate-800 flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonLoader key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

interface LazyLoadWrapperProps {
  loading: boolean;
  error?: string | null;
  skeleton?: React.ReactNode;
  children: React.ReactNode;
  onRetry?: () => void;
}

export function LazyLoadWrapper({ loading, error, skeleton, children, onRetry }: LazyLoadWrapperProps) {
  if (loading) {
    return skeleton || <LoadingState />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors"
          >
            Réessayer
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
