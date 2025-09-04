import React from 'react';
import PropTypes from 'prop-types';

const isGroup = (opt) => Array.isArray(opt?.options);

const Select = ({ 
  value, 
  onChange, 
  options, 
  className = '',
  placeholder = '',
  disabled = false,
  leftIcon: LeftIcon,
  error,
  ...props 
}) => {
  return (
    <div className="relative">
      {LeftIcon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <LeftIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
        </div>
      )}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`block w-full ${LeftIcon ? 'pl-10' : 'pl-3'} py-2 border ${
          error ? 'border-red-300' : 'border-gray-300'
        } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm ${className} ${
          disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-900'
        }`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option, idx) => (
          isGroup(option) ? (
            <optgroup key={`group-${idx}`} label={option.label}>
              {option.options.map((child) => (
                <option
                  key={child.value}
                  value={child.value}
                  disabled={child.disabled}
                  className="text-gray-900"
                >
                  {child.label}
                </option>
              ))}
            </optgroup>
          ) : (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="text-gray-900"
            >
              {option.label}
            </option>
          )
        ))}
      </select>
      {error && (
        <p className="mt-1 text-xs sm:text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

Select.propTypes = {
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number]))
  ]),
  onChange: PropTypes.func.isRequired,
  // options can be flat options or grouped options
  options: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.shape({
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        label: PropTypes.string.isRequired,
        disabled: PropTypes.bool,
      }),
      PropTypes.shape({
        label: PropTypes.string.isRequired,
        options: PropTypes.arrayOf(
          PropTypes.shape({
            value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
            label: PropTypes.string.isRequired,
            disabled: PropTypes.bool,
          })
        ).isRequired,
      }),
    ])
  ).isRequired,
  className: PropTypes.string,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  leftIcon: PropTypes.elementType,
  error: PropTypes.string,
};

export default Select;
