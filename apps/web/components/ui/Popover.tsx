'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import { cn } from '../../../lib/utils';

interface PopoverProps {
  children: ReactNode;
  content: ReactNode;
  trigger?: 'hover' | 'click';
  placement?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Popover({
  children,
  content,
  trigger = 'click',
  placement = 'bottom',
  className
}: PopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleTriggerClick = () => {
    if (trigger === 'click') {
      setIsOpen(!isOpen);
    }
  };

  const handleTriggerHover = () => {
    if (trigger === 'hover') {
      setIsOpen(true);
    }
  };

  const handleTriggerLeave = () => {
    if (trigger === 'hover') {
      setIsOpen(false);
    }
  };

  const getPlacementClasses = () => {
    const baseClasses = 'absolute z-50 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg';

    switch (placement) {
      case 'top':
        return cn(baseClasses, 'bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2');
      case 'bottom':
        return cn(baseClasses, 'top-full left-1/2 transform -translate-x-1/2 translate-y-2');
      case 'left':
        return cn(baseClasses, 'right-full top-1/2 transform -translate-x-2 -translate-y-1/2');
      case 'right':
        return cn(baseClasses, 'left-full top-1/2 transform translate-x-2 -translate-y-1/2');
      default:
        return cn(baseClasses, 'top-full left-1/2 transform -translate-x-1/2 translate-y-2');
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <div
        ref={triggerRef}
        onClick={handleTriggerClick}
        onMouseEnter={handleTriggerHover}
        onMouseLeave={handleTriggerLeave}
        className="cursor-pointer"
      >
        {children}
      </div>

      {isOpen && (
        <div className={cn(getPlacementClasses(), className)}>
          {content}
        </div>
      )}
    </div>
  );
}

interface PopoverTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

export function PopoverTrigger({ children }: PopoverTriggerProps) {
  return <>{children}</>;
}

interface PopoverContentProps {
  children: ReactNode;
  className?: string;
}

export function PopoverContent({ children, className }: PopoverContentProps) {
  return (
    <div className={cn('p-4', className)}>
      {children}
    </div>
  );
}