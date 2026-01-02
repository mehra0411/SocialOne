import { ReactNode } from 'react';
import { FiArrowRight, FiCheck, FiAlertTriangle, FiXCircle } from 'react-icons/fi';

const VARIANT_CLASSES = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus:ring-2 focus:ring-indigo-500 border border-transparent',
  secondary:
    'bg-transparent text-indigo-600 border border-indigo-600 hover:bg-indigo-50 active:bg-indigo-100',
  success:
    'bg-emerald-600 text-white hover:bg-emerald-700 border border-transparent',
  danger:
    'bg-red-600 text-white hover:bg-red-700 border border-transparent',
};

const COMMON_CLASSES =
  'inline-flex items-center justify-center rounded-xl font-medium transition-colors duration-150 disabled:opacity-60 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 px-4 py-2 text-sm gap-2';

const SIZE_CLASSES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

type ButtonProps = {
  children: ReactNode;
  variant?: keyof typeof VARIANT_CLASSES;
  size?: keyof typeof SIZE_CLASSES;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  disabled?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  iconLeft,
  iconRight,
  className,
  onClick,
  ariaLabel,
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${COMMON_CLASSES} ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className ?? ''}`}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {iconLeft && <span className="mr-1.5">{iconLeft}</span>}
      <span>{children}</span>
      {iconRight && <span className="ml-1.5">{iconRight}</span>}
    </button>
  );
}

// Status button icon samples for reference usage
export const ArrowRightIcon = FiArrowRight;
export const CheckIcon = FiCheck;
export const WarningIcon = FiAlertTriangle;
export const ErrorIcon = FiXCircle;

