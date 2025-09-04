import React from 'react';
import { cva } from 'class-variance-authority';
import Tooltip from './Tooltip';
import { useCan } from '../../context/AuthContext';
import { emitToast } from '../../context/ToastContext';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-xs sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        destructive: 'bg-red-300 text-white hover:bg-red-700',
        outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        ghost: 'hover:bg-gray-100 text-gray-700',
        link: 'text-blue-600 hover:underline underline-offset-4',
      },
      size: {
        default: 'h-10 py-2 px-4 max-[400px]:h-8 max-[400px]:px-2 max-[400px]:py-1 max-[400px]:text-[10px]',
        sm: 'h-9 px-3 rounded-md text-xs sm:text-sm max-[400px]:h-8 max-[400px]:px-2 max-[400px]:py-1 max-[400px]:text-[10px]',
        lg: 'h-11 px-8 rounded-md text-sm sm:text-base max-[400px]:h-9 max-[400px]:px-2 max-[400px]:py-1 max-[400px]:text-[10px]',
        icon: 'h-10 w-10 p-0',
      },
      loading: {
        true: 'opacity-70 cursor-not-allowed',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
      loading: false,
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={buttonVariants({ variant, size, loading, className })}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-3 w-3 sm:h-4 sm:w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Permission-aware button that disables itself and shows a tooltip when permission is missing
// Props:
// - module: permission module key (e.g., 'invoices')
// - action: 'view' | 'add' | 'edit' | 'delete'
// - scopeId: building id or 'global' (default 'global')
// - reason: optional tooltip override text
// - denyMessage: optional toast message on denied click (defaults to reason)
// - denyToastType: optional toast type on denied click (defaults to 'warning')
// - toastOnDeny: whether to show toast on denied click (default true)
// - blocked: whether the button is blocked (e.g., building inactive)
// - blockedReason: optional tooltip override text when blocked
// - blockedDenyMessage: optional toast message on blocked click (defaults to reason)
// - All other Button props are supported
export const PermissionButton = ({
  module,
  action,
  scopeId = 'global',
  reason,
  denyMessage,
  denyToastType = 'warning',
  toastOnDeny = true,
  blocked = false,
  blockedReason,
  blockedDenyMessage,
  children,
  ...btnProps
}) => {
  const { can, isPGAdmin } = useCan();
  const allowed = isPGAdmin || (typeof can === 'function' && can(module, action, scopeId));

  const warningIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="mr-1 h-4 w-4 text-red-600"
      aria-hidden="true"
    >
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.584c.75 1.333-.213 2.992-1.742 2.992H3.48c-1.53 0-2.492-1.659-1.743-2.992L8.257 3.1zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-2a1 1 0 01-1-1V8a1 1 0 112 0v3a1 1 0 01-1 1z" clipRule="evenodd" />
    </svg>
  );

  // Permission denied branch
  if (!allowed) {
    const fallbackText = reason || `You lack ${module}:${action} permission${scopeId && scopeId !== 'global' ? ` for building ${scopeId}` : ''}.`;
    const toastText = denyMessage || fallbackText;

    // Faux-disabled button: visually disabled, still clickable to show toast
    const fauxDisabledClass = 'opacity-50 cursor-not-allowed';

    const onDeniedClick = (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      if (toastOnDeny) emitToast({ type: denyToastType, message: toastText });
      if (typeof btnProps.onDenied === 'function') btnProps.onDenied(e);
    };

    return (
      <Tooltip content={fallbackText} position="top" zIndex={Number.MAX_SAFE_INTEGER}>
        <button
          type={btnProps.type || 'button'}
          className={buttonVariants({ variant: btnProps.variant, size: btnProps.size, loading: false, className: `${btnProps.className || ''} ${fauxDisabledClass}` })}
          aria-disabled="true"
          onClick={onDeniedClick}
        >
          {warningIcon}
          {children}
        </button>
      </Tooltip>
    );
  }

  // Explicitly blocked (e.g., building inactive) branch
  if (blocked) {
    const fallbackText = blockedReason || reason || 'Action blocked.';
    const toastText = blockedDenyMessage || denyMessage || fallbackText;

    const fauxDisabledClass = 'opacity-50 cursor-not-allowed';

    const onDeniedClick = (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      if (toastOnDeny) emitToast({ type: denyToastType, message: toastText });
      if (typeof btnProps.onDenied === 'function') btnProps.onDenied(e);
    };

    return (
      <Tooltip content={fallbackText} position="top" zIndex={Number.MAX_SAFE_INTEGER}>
        <button
          type={btnProps.type || 'button'}
          className={buttonVariants({ variant: btnProps.variant, size: btnProps.size, loading: false, className: `${btnProps.className || ''} ${fauxDisabledClass}` })}
          aria-disabled="true"
          onClick={onDeniedClick}
        >
          {warningIcon}
          {children}
        </button>
      </Tooltip>
    );
  }

  // Allowed and not blocked
  return (
    <Button {...btnProps}>
      {children}
    </Button>
  );
};

export { Button, buttonVariants };
