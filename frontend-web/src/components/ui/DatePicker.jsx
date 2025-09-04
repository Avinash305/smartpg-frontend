import React, { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Input } from './Input';

const CustomDatePicker = forwardRef(({ selected, onChange, label, error, className, id, name, ...props }, ref) => {
  return (
    <div className={`w-full ${className}`}>
      {label && <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1" htmlFor={id}>{label}</label>}
      <DatePicker
        selected={selected}
        onChange={onChange}
        customInput={
          <Input
            ref={ref}
            id={id}
            name={name}
            error={error}
            className="w-full"
          />
        }
        className="w-full"
        dateFormat="dd/MM/yyyy"
        showYearDropdown
        dropdownMode="select"
        {...props}
      />
      {error && <p className="mt-1 text-xs sm:text-sm text-destructive">{error}</p>}
    </div>
  );
});

CustomDatePicker.displayName = 'DatePicker';

export { CustomDatePicker as DatePicker };
