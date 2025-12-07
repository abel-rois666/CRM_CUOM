// components/common/FormElements.tsx
import React from 'react';

// --- INPUT ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5 ml-1">
            {label} {props.required && <span className="text-red-500">*</span>}
          </label>
        )}
        <input
          ref={ref}
          title={props.value as string}
          className={`
            block w-full px-4 py-2.5 
            bg-white dark:bg-slate-900 
            border border-gray-200 dark:border-slate-700 
            rounded-xl 
            text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none focus:ring-4 focus:ring-brand-secondary/10 focus:border-brand-secondary
            transition-all duration-200 disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:text-gray-500
            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}
            ${className}
          `}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-500 font-medium ml-1">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

// --- SELECT ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string }[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', ...props }, ref) => {
    const selectedLabel = options.find(o => String(o.value) === String(props.value))?.label || props.value;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5 ml-1">
            {label} {props.required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
            <select
            ref={ref}
            title={selectedLabel as string}
            className={`
                block w-full pl-4 pr-10 py-2.5 
                bg-white dark:bg-slate-900
                border border-gray-200 dark:border-slate-700
                rounded-xl 
                text-gray-900 dark:text-white text-sm text-ellipsis overflow-hidden whitespace-nowrap
                focus:outline-none focus:ring-4 focus:ring-brand-secondary/10 focus:border-brand-secondary
                appearance-none transition-all duration-200 cursor-pointer
                disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:text-gray-500 disabled:cursor-not-allowed
                ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}
                ${className}
            `}
            {...props}
            >
            {placeholder && <option value="" disabled className="text-gray-400 dark:text-gray-500">{placeholder}</option>}
            
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                {opt.label}
                </option>
            ))}
            </select>
            {/* Flecha personalizada */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
        {error && <p className="mt-1 text-xs text-red-500 font-medium ml-1">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

// --- TEXTAREA ---
interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
    ({ label, error, className = '', ...props }, ref) => {
      return (
        <div className="w-full">
          {label && (
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5 ml-1">
              {label} {props.required && <span className="text-red-500">*</span>}
            </label>
          )}
          <textarea
            ref={ref}
            className={`
              block w-full px-4 py-3 
              bg-white dark:bg-slate-900
              border border-gray-200 dark:border-slate-700
              rounded-xl 
              text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500
              focus:outline-none focus:ring-4 focus:ring-brand-secondary/10 focus:border-brand-secondary
              transition-all duration-200
              ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}
              ${className}
            `}
            {...props}
          />
          {error && <p className="mt-1 text-xs text-red-500 font-medium ml-1">{error}</p>}
        </div>
      );
    }
  );
TextArea.displayName = 'TextArea';