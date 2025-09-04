import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable Label component for form fields
 * @param {Object} props - Component props
 * @param {string} props.htmlFor - The id of the input element the label is for
 * @param {boolean} [props.required] - Whether the field is required
 * @param {React.ReactNode} props.children - The label text
 * @param {string} [props.className] - Additional CSS classes
 * @returns {JSX.Element} Label component
 */
const Label = ({ htmlFor, required, children, className = '' }) => {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-xs sm:text-sm font-medium text-gray-700 ${className}`}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
};

Label.propTypes = {
  htmlFor: PropTypes.string.isRequired,
  required: PropTypes.bool,
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

export default Label;
