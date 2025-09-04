import * as React from 'react';

const Switch = React.forwardRef(
  ({ 
    className = '',
    checked = false,
    onChange,
    disabled = false,
    variant = 'default',
    id,
    name = 'switch',
    ...props 
  }, ref) => {
    const autoId = React.useId();
    const inputId = id || autoId;
    const variantClasses = {
      default: checked ? 'bg-blue-500' : 'bg-gray-300',
      primary: checked ? 'bg-blue-600' : 'bg-gray-300',
      destructive: checked ? 'bg-red-500' : 'bg-gray-300',
    };

    return (
      <div className={`relative inline-flex items-center ${className}`}>
        <input
          type="checkbox"
          id={inputId}
          name={name}
          className="sr-only"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          ref={ref}
          {...props}
        />
        <div 
          className={`w-10 h-5 sm:w-11 sm:h-6 rounded-full transition-colors ${
            variantClasses[variant] || variantClasses.default
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onClick={() => !disabled && onChange?.(!checked)}
          role="switch"
          aria-checked={checked}
          aria-disabled={disabled}
        >
          <span 
            className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 sm:w-5 sm:h-5 rounded-full shadow-sm transform transition-transform ${
              checked ? 'translate-x-5 sm:translate-x-5' : 'translate-x-0'
            }`}
          />
        </div>
      </div>
    );
  }
);

Switch.displayName = 'Switch';

export { Switch };

// Usage example:
// <Switch 
//   checked={isActive} 
//   onChange={(checked) => setIsActive(checked)}
//   variant="primary"
// />
