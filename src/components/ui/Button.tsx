import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'relative inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-secondary-900 transform';
  
  const variants = {
    primary: 'btn-primary focus:ring-primary-500',
    secondary: 'btn-secondary focus:ring-secondary-500',
    outline: 'btn-outline focus:ring-primary-500',
    ghost: 'btn-ghost focus:ring-secondary-500',
    success: 'bg-gradient-to-r from-success-600 to-success-700 hover:from-success-700 hover:to-success-800 text-white font-medium px-6 py-3 rounded-xl shadow-soft hover:shadow-medium transition-all duration-200 transform hover:scale-105 active:scale-95 focus:ring-success-500',
    warning: 'bg-gradient-to-r from-warning-600 to-warning-700 hover:from-warning-700 hover:to-warning-800 text-white font-medium px-6 py-3 rounded-xl shadow-soft hover:shadow-medium transition-all duration-200 transform hover:scale-105 active:scale-95 focus:ring-warning-500',
    danger: 'bg-gradient-to-r from-danger-600 to-danger-700 hover:from-danger-700 hover:to-danger-800 text-white font-medium px-6 py-3 rounded-xl shadow-soft hover:shadow-medium transition-all duration-200 transform hover:scale-105 active:scale-95 focus:ring-danger-500',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    xl: 'px-10 py-5 text-xl',
  };

  const isDisabled = disabled || isLoading;

  return (
    <motion.button
      whileHover={!isDisabled ? { scale: 1.05 } : {}}
      whileTap={!isDisabled ? { scale: 0.95 } : {}}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {isLoading && (
        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
      )}
      {children}
    </motion.button>
  );
};