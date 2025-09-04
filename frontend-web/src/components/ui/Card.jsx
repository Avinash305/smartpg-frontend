import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../lib/utils';

const Card = React.forwardRef(
  ({
    className,
    children,
    title,
    description,
    actions,
    hoverEffect = true,
    padding = 'none', // 'xs', 'sm', 'md', 'lg', or 'none'
    footer,
    ...props
  }, ref) => {
    const paddingClasses = {
      xs: 'p-2',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      none: 'p-0',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden',
          hoverEffect && 'transition-all duration-200 hover:shadow-md hover:border-gray-300',
          className
        )}
        {...props}
      >
        {(title || description || actions) ? (
          <div className={cn('border-b border-gray-100', paddingClasses[padding])}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                {title && (
                  typeof title === 'string' ? (
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{title}</h3>
                  ) : (
                    <div className="text-base sm:text-lg font-semibold text-gray-900 truncate">{title}</div>
                  )
                )}
                {description && (
                  typeof description === 'string' ? (
                    <p className="mt-1 text-xs sm:text-sm text-gray-500">{description}</p>
                  ) : (
                    <div className="mt-1 text-xs sm:text-sm text-gray-500">{description}</div>
                  )
                )}
              </div>
              {actions && <div className="flex-shrink-0 ml-2">{actions}</div>}
            </div>
          </div>
        ) : null}

        <div className={cn(paddingClasses[padding])}>
          {children}
        </div>

        {footer && (
          <div className={cn('bg-gray-50 border-t border-gray-100', paddingClasses[padding])}>
            {footer}
          </div>
        )}
      </div>
    );
  }
);

Card.displayName = 'Card';

Card.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
  title: PropTypes.node,
  description: PropTypes.node,
  actions: PropTypes.node,
  hoverEffect: PropTypes.bool,
  padding: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'none']),
  footer: PropTypes.node,
};

export { Card };
export default Card;
