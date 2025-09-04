import { useState, useEffect, useRef, useMemo, useCallback, useId } from 'react';
import { FiSearch, FiCheck } from 'react-icons/fi';

export default function SearchableSelect({
  options = [],
  value,
  onChange,
  id,
  name = 'searchable',
  placeholder = 'Type a name',
  loading = false,
  className = '',
  optionRenderer = (option) => option.label,
  valueRenderer = optionRenderer,
  searchFields = ['label'],
  groupBy = 'category',
}) {
  const autoId = useId();
  const inputId = id || autoId;
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // Compute filtered options via useMemo to avoid setState loops
  const filteredOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return options;
    return options.filter(option => 
      searchFields.some(field => 
        String(option[field] || '').toLowerCase().includes(term)
      )
    );
  }, [searchTerm, options, searchFields]);
  const [displayValue, setDisplayValue] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Group options by category if groupBy is provided
  const groupOptions = (items) => {
    if (!groupBy) return { '': items };
    
    return items.reduce((acc, item) => {
      const group = item[groupBy] || '';
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(item);
      return acc;
    }, {});
  };

  // Update display value when value or options change
  useEffect(() => {
    if (!value) {
      setDisplayValue('');
      return;
    }

    // If value is a string/number (ID), find the corresponding option
    if (typeof value === 'string' || typeof value === 'number') {
      const option = options.find(opt => opt.value === value || opt.id === value);
      if (option) {
        const displayName = option.label || option.full_name || option.value || '';
        setDisplayValue(String(displayName));
      } else {
        setDisplayValue('');
      }
    } 
    // If value is an object
    else if (typeof value === 'object') {
      const option = 'value' in value 
        ? options.find(opt => opt.value === value.value)
        : value;
      
      if (option) {
        const displayName = option.label || option.full_name || option.value || '';
        setDisplayValue(String(displayName));
      } else {
        setDisplayValue('');
      }
    } else {
      setDisplayValue(String(value));
    }
  }, [value, options]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle option selection
  const handleSelect = (option) => {
    if (option?.disabled) return; // prevent selecting disabled
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Handle input click
  const handleInputClick = () => {
    setIsOpen(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle input blur
  const handleBlur = () => {
    if (!isOpen) return;
    setTimeout(() => {
      setIsOpen(false);
      setSearchTerm('');
    }, 200);
  };

  // Custom option renderer to show checkmark for selected tenant
  const renderOption = useCallback((option) => {
    const isSelected = value && (option.value === value || option.id === value || 
      (typeof value === 'object' && option.value === value.value));
    
    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex-1">
          {optionRenderer(option)}
        </div>
        {isSelected && (
          <span className="ml-2 text-green-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </span>
        )}
      </div>
    );
  }, [value, optionRenderer]);

  const groupedOptions = groupOptions(filteredOptions);

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div className="relative">
        <div className="absolute inset-y-0 start-0 flex items-center pointer-events-none z-20 ps-3.5">
          <FiSearch className="shrink-0 size-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          id={inputId}
          name={name}
          className="py-2.5 ps-10 pe-4 block w-full border border-gray-200 rounded-lg text-xs sm:text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none bg-white"
          placeholder={placeholder}
          value={isOpen ? searchTerm : displayValue}
          onChange={(e) => setSearchTerm(e.target.value)}
          onClick={handleInputClick}
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur}
          readOnly={!isOpen}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="max-h-72 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                Loading...
              </div>
            ) : Object.keys(groupedOptions).length > 0 ? (
              Object.entries(groupedOptions).map(([group, items]) => (
                <div key={group}>
                  {group && (
                    <div className="text-xs uppercase text-gray-500 m-3 mb-1">
                      {group}
                    </div>
                  )}
                  {items.map((option) => (
                    <div
                      key={option.value}
                      title={option.tooltip || ''}
                      className={`flex items-center cursor-pointer py-2 px-4 w-full text-sm text-gray-800 hover:bg-gray-100 ${
                        (value?.value === option.value || value === option.value) ? 'bg-blue-50' : ''
                      } ${option.disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                      onClick={() => handleSelect(option)}
                      aria-disabled={option.disabled ? true : undefined}
                    >
                      {option.image && (
                        <div className="flex items-center justify-center rounded-full bg-gray-200 size-6 overflow-hidden me-2.5">
                          <img 
                            src={option.image} 
                            alt={option.label} 
                            className="shrink-0 w-full h-full object-cover"
                          />
                        </div>
                      )}
                      {renderOption(option)}
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
