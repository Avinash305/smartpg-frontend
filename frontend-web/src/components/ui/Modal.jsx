import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { cn } from '../../lib/utils';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  maxWidth = 'md',
  closeOnOverlayClick = true,
  showCloseButton = true,
}) => {
  const modalRef = useRef(null);
  const lastFocusedElement = useRef(null);

  // Handle escape key
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && isOpen) {
      onClose?.();
    }
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (isOpen) {
      lastFocusedElement.current = document.activeElement;
      // Only focus container if current focus is outside the modal
      const el = modalRef.current;
      const active = document.activeElement;
      if (el && active && !el.contains(active)) {
        el.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = isOpen ? 'hidden' : '';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      // Restore focus only if the element still exists in the document
      const last = lastFocusedElement.current;
      if (last && document.contains(last)) {
        last.focus();
      }
    };
  }, [isOpen, handleKeyDown]);

  // Close on overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose?.();
    }
  };

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full',
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto"
      onClick={handleOverlayClick}
    >
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity"
          aria-hidden="true"
        />

        <span 
          className="hidden sm:inline-block sm:h-screen sm:align-middle" 
          aria-hidden="true"
        >
          &#8203;
        </span>

        <div
          ref={modalRef}
          tabIndex="-1"
          className={cn(
            'relative inline-block w-full transform overflow-hidden rounded-lg bg-white text-left align-middle shadow-xl transition-all sm:my-8 sm:align-middle',
            maxWidthClasses[maxWidth] || maxWidthClasses.md,
            'bg-white',
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
              {title && (
                <h3 className="text-base sm:text-lg font-semibold leading-6 text-gray-900">
                  {title}
                </h3>
              )}
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="relative rounded-md bg-white text-gray-400 hover:text-gray-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  aria-label="Close modal"
                >
                  <FiX className="h-5 w-5 sm:h-6 sm:w-6 absolute right-4 top-1 sm:right-6" />
                </button>
              )}
            </div>
          )}

          <div className="max-h-[80vh] overflow-y-auto p-4 sm:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
