import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Tooltip = ({
  content,
  children,
  position = 'top',
  delay = 0,
  className = '',
  tooltipClassName = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e) => {
    setCoords({ x: e.target.getBoundingClientRect() });
    setTimeout(() => setIsVisible(true), delay);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
    'top-left': 'bottom-full right-0 mb-2',
    'top-right': 'bottom-full left-0 mb-2',
    'bottom-left': 'top-full right-0 mt-2',
    'bottom-right': 'top-full left-0 mt-2',
  };

  const arrowClasses = {
    top: 'bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45',
    bottom: 'top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-45',
    left: 'top-1/2 right-0 transform -translate-y-1/2 translate-x-1/2 rotate-45',
    right: 'top-1/2 left-0 transform -translate-y-1/2 -translate-x-1/2 rotate-45',
    'top-left': 'bottom-0 right-2 transform translate-y-1/2 rotate-45',
    'top-right': 'bottom-0 left-2 transform translate-y-1/2 rotate-45',
    'bottom-left': 'top-0 right-2 -translate-y-1/2 rotate-45',
    'bottom-right': 'top-0 left-2 -translate-y-1/2 rotate-45',
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex"
      >
        {children}
      </div>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-[9999] overflow-visible ${positionClasses[position]}`}
          >
            <div
              className={`relative bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap ${tooltipClassName}`}
            >
              {content}
              <div
                className={`absolute w-2 h-2 bg-gray-800 ${arrowClasses[position]}`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tooltip;
