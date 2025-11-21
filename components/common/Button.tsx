// components/common/Button.tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  as?: any;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  leftIcon, 
  as: Component = 'button', 
  className = '',
  ...props 
}) => {
  // Base: Transiciones suaves, sin outline feo, feedback activo
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shadow-sm';

  const variantClasses = {
    primary: 'bg-brand-secondary text-white hover:bg-blue-600 hover:shadow-blue-200 hover:shadow-lg focus:ring-brand-secondary',
    secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 focus:ring-gray-200',
    danger: 'bg-white text-red-600 border border-red-100 hover:bg-red-50 hover:border-red-200 focus:ring-red-200',
    ghost: 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900 shadow-none',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
  };

  return (
    <Component
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {leftIcon && <span className="mr-2 -ml-1">{leftIcon}</span>}
      {children}
    </Component>
  );
};

export default Button;
