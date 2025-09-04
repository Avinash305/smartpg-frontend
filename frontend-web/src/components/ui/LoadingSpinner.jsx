import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  className = '',
  color = 'text-blue-500',
  borderWidth = 'border-2',
  label = 'Loading...'
}) => {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  return (
    <div 
      className={`
        inline-block 
        animate-spin 
        rounded-full 
        ${borderWidth} 
        ${color} 
        border-r-transparent 
        align-[-0.125em] 
        ${sizeClasses[size] || sizeClasses.md} 
        ${className}
      `} 
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
};

export default LoadingSpinner;
