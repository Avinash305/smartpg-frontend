import * as React from 'react';

const Input = React.forwardRef(({ 
  className = '', 
  type = 'text', 
  error,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  onRightIconClick,
  label,
  id,
  ...props 
}, ref) => {
  const autoId = React.useId();
  const inputId = id || autoId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {LeftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {React.isValidElement(LeftIcon) ? LeftIcon : <LeftIcon className="h-4 w-4 text-gray-400" />}
          </div>
        )}
        <input
          id={inputId}
          type={type}
          className={`
            flex h-9 sm:h-10 w-full rounded-md border 
            ${LeftIcon ? 'pl-10' : 'pl-3'}
            ${RightIcon ? 'pr-10' : 'pr-3'}
            py-2 text-xs sm:text-sm text-gray-900 placeholder-gray-500 
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:cursor-not-allowed disabled:opacity-50
            ${error ? 'border-red-500' : 'border-gray-300'}
            ${className}
          `}
          ref={ref}
          {...props}
        />
        {RightIcon && (
          <div 
            className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
            onClick={onRightIconClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRightIconClick?.();
              }
            }}
          >
            {React.isValidElement(RightIcon) ? RightIcon : 
              <RightIcon className="h-4 w-4 text-gray-400" />
            }
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs sm:text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export { Input };