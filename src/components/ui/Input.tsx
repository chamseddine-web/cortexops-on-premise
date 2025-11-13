import { InputHTMLAttributes, forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {label}
            {props.required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            className={`
              w-full px-4 py-3 bg-slate-800 border rounded-lg text-white
              placeholder-slate-500 transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              ${icon ? 'pl-10' : ''}
              ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-700'}
              ${className}
            `}
            {...props}
          />

          {error && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400">
              <AlertCircle size={18} />
            </div>
          )}
        </div>

        {error && (
          <p className="mt-1.5 text-sm text-red-400 flex items-center gap-1">
            {error}
          </p>
        )}

        {hint && !error && (
          <p className="mt-1.5 text-sm text-slate-500">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
