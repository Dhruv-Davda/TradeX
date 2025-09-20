import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  options,
  className = '',
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-white mb-2 text-shadow">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={`select ${error ? 'select-error' : ''} ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-secondary-800 text-white">
            {option.label}
          </option>
        ))}
      </select>
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