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
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 ml-1">
            {label} {props.required && <span className="text-red-500">*</span>}
          </label>
        )}
        <input
          ref={ref}
          // Agregamos title para ver el valor completo al hacer hover
          title={props.value as string}
          className={`
            block w-full px-4 py-2.5 
            bg-gray-50 border border-gray-200 rounded-xl 
            text-gray-900 text-sm placeholder-gray-400 
            focus:outline-none focus:ring-2 focus:ring-brand-secondary/20 focus:border-brand-secondary focus:bg-white
            transition-all duration-200 disabled:bg-gray-100 disabled:text-gray-500
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
    // Buscamos el label de la opción seleccionada para el title
    const selectedLabel = options.find(o => String(o.value) === String(props.value))?.label || props.value;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 ml-1">
            {label} {props.required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
            <select
            ref={ref}
            // Title ayuda a leer el texto si el select es muy angosto
            title={selectedLabel as string}
            className={`
                block w-full pl-4 pr-10 py-2.5 
                bg-gray-50 border border-gray-200 rounded-xl 
                text-gray-900 text-sm text-ellipsis overflow-hidden whitespace-nowrap
                focus:outline-none focus:ring-2 focus:ring-brand-secondary/20 focus:border-brand-secondary focus:bg-white
                appearance-none transition-all duration-200 cursor-pointer
                disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
                ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}
                ${className}
            `}
            {...props}
            >
            {/* Renderizamos el placeholder como opción deshabilitada y oculta si se selecciona algo más */}
            {placeholder && <option value="" disabled className="text-gray-400">{placeholder}</option>}
            
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                {opt.label}
                </option>
            ))}
            </select>
            {/* Flecha personalizada */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
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
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 ml-1">
              {label} {props.required && <span className="text-red-500">*</span>}
            </label>
          )}
          <textarea
            ref={ref}
            className={`
              block w-full px-4 py-3 
              bg-gray-50 border border-gray-200 rounded-xl 
              text-gray-900 text-sm placeholder-gray-400 
              focus:outline-none focus:ring-2 focus:ring-brand-secondary/20 focus:border-brand-secondary focus:bg-white
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