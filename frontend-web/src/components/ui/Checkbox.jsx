import * as React from 'react';

const Checkbox = React.forwardRef(({ className, id, name = 'checkbox', ...props }, ref) => {
  const autoId = React.useId();
  const inputId = id || autoId;
  return (
    <div className="flex items-center">
      <input
        type="checkbox"
        id={inputId}
        name={name}
        className={`
          h-4 w-4 sm:h-5 sm:w-5 rounded border-gray-300 text-blue-600 
          focus:ring-blue-500 focus:ring-offset-0
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className || ''}
        `}
        ref={ref}
        {...props}
      />
    </div>
  );
});
Checkbox.displayName = 'Checkbox';

export { Checkbox };
