import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '../../lib/utils';

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuContent = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white p-1 text-popover-foreground shadow-md',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        'data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        'overscroll-auto touch-pan-y',
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));

const DropdownMenuItem = React.forwardRef(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs sm:text-sm outline-none',
      'focus:bg-accent focus:text-accent-foreground',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
));

const DropdownMenuLabel = React.forwardRef(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn('px-2 py-1.5 text-xs sm:text-sm font-semibold', inset && 'pl-8', className)}
    {...props}
  />
));

const DropdownMenuSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-muted', className)}
    {...props}
  />
));

const DropdownMenuShortcut = ({ className, ...props }) => {
  return (
    <span
      className={cn('ml-auto text-[10px] sm:text-xs tracking-widest opacity-60', className)}
      {...props}
    />
  );
};

// Checkbox item for multi-select menus
const DropdownMenuCheckboxItem = React.forwardRef(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    checked={checked}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs sm:text-sm outline-none',
      'focus:bg-accent focus:text-accent-foreground',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <DropdownMenuPrimitive.ItemIndicator className="absolute left-2 h-3.5 w-3.5">
      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 text-green-600"><path fill="currentColor" fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10a.75.75 0 01-1.127.06l-4-4a.75.75 0 011.06-1.06l3.383 3.382 7.48-9.351a.75.75 0 011.061-.083z" clipRule="evenodd" /></svg>
    </DropdownMenuPrimitive.ItemIndicator>
    <span className={cn(checked ? 'pl-5' : 'pl-0')}>{children}</span>
  </DropdownMenuPrimitive.CheckboxItem>
));

// Submenu trigger and content
const DropdownMenuSubTrigger = React.forwardRef(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      'flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs sm:text-sm outline-none',
      'focus:bg-accent focus:text-accent-foreground',
      'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
      inset && 'pl-8',
      className
    )}
    {...props}
  >
    {children}
    <svg aria-hidden="true" viewBox="0 0 20 20" className="ml-auto h-3.5 w-3.5 opacity-70"><path fill="currentColor" d="M7.5 5l5 5-5 5z" /></svg>
  </DropdownMenuPrimitive.SubTrigger>
));

const DropdownMenuSubContent = React.forwardRef(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    sideOffset={6}
    className={cn(
      'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white p-1 text-popover-foreground shadow-md',
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
      'data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
      'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
      'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      className
    )}
    {...props}
  />
));

// Radio item for status selection
const DropdownMenuRadioItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs sm:text-sm outline-none',
      'focus:bg-accent focus:text-accent-foreground',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <DropdownMenuPrimitive.ItemIndicator>
      <svg aria-hidden="true" viewBox="0 0 20 20" className="mr-2 h-4 w-4 text-green-600"><path fill="currentColor" fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10a.75.75 0 01-1.127.06l-4-4a.75.75 0 011.06-1.06l3.383 3.382 7.48-9.351a.75.75 0 011.061-.083z" clipRule="evenodd" /></svg>
    </DropdownMenuPrimitive.ItemIndicator>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));

const DropdownMenuItemIndicator = React.forwardRef(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.ItemIndicator
    ref={ref}
    className={cn('absolute left-2 h-3.5 w-3.5', className)}
    {...props}
  />
));

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuRadioGroup,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioItem,
  DropdownMenuItemIndicator,
  DropdownMenuCheckboxItem,
};
