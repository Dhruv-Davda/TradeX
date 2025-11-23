import React from 'react';
import { motion } from 'framer-motion';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  whiteBorder?: boolean; // For trade forms (buy/sell/settlement/transfer)
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  icon,
  whiteBorder = false,
  className = '',
  ...props
}, ref) => {
  // Prevent arrow keys from incrementing/decrementing number inputs
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (props.type === 'number' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
    }
    // Call the original onKeyDown if it exists
    if (props.onKeyDown) {
      props.onKeyDown(e);
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-white mb-2 text-shadow">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <div className="text-secondary-400">{icon}</div>
          </div>
        )}
        <input
          ref={ref}
          className={`input ${icon ? 'pl-12' : ''} ${error ? 'input-error' : ''} ${whiteBorder ? '!border-white/30 focus:!border-white/50 focus:!ring-white/30' : ''} ${className}`}
          onKeyDown={handleKeyDown}
          {...props}
        />
      </div>
      {error && (
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-sm text-danger-400 flex items-center"
        >
          <span className="w-1 h-1 bg-danger-400 rounded-full mr-2"></span>
          {error}
        </motion.p>
      )}
    </div>
  );
});