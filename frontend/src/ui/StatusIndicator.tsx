import { FiCheckCircle, FiAlertTriangle, FiXCircle, FiLoader } from 'react-icons/fi';
import { ReactNode } from 'react';

const STATUS_STYLES = {
  success: {
    icon: <FiCheckCircle className="text-emerald-600" aria-hidden="true" />,
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    label: 'Success',
  },
  warning: {
    icon: <FiAlertTriangle className="text-amber-500" aria-hidden="true" />,
    bg: 'bg-amber-50',
    text: 'text-amber-500',
    label: 'Warning',
  },
  error: {
    icon: <FiXCircle className="text-red-600" aria-hidden="true" />,
    bg: 'bg-red-50',
    text: 'text-red-600',
    label: 'Error',
  },
  loading: {
    icon: <FiLoader className="animate-spin text-slate-600" aria-hidden="true" />,
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    label: 'Loading',
  },
};

type StatusIndicatorProps = {
  status: keyof typeof STATUS_STYLES;
  children?: ReactNode;
  className?: string;
  rounded?: boolean;
};

export function StatusIndicator({
  status,
  children,
  className = '',
  rounded = true,
}: StatusIndicatorProps) {
  const style = STATUS_STYLES[status];
  return (
    <div
      className={`inline-flex items-center gap-2 ${style.bg} ${rounded ? 'rounded-xl' : ''} px-3 py-1 ${className}`}
      role="status"
      aria-label={style.label}
    >
      {style.icon}
      <span className={`font-medium ${style.text} text-sm`}>{children ?? style.label}</span>
    </div>
  );
}

