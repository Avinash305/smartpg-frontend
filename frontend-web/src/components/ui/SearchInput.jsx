import React from 'react';
import { FiSearch } from 'react-icons/fi';

const SearchInput = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  inputClassName = '',
  iconClassName = '',
  onSearch,
  name = 'search',
  id,
  ...props
}) => {
  const autoId = React.useId();
  const inputId = id || autoId;
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(e.target.value);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <FiSearch className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-400 ${iconClassName}`} />
      </div>
      <input
        type="text"
        id={inputId}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className={`block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white 
        placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
        text-xs sm:text-sm ${inputClassName}`}
        placeholder={placeholder}
        {...props}
      />
    </div>
  );
};

export default SearchInput;
