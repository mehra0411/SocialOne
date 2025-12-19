type Variant = 'primary' | 'secondary';
type Size = 'sm' | 'md';

const base =
  'inline-flex items-center justify-center rounded-xl font-medium transition-colors disabled:opacity-60 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2';

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

const variants: Record<Variant, string> = {
  primary: 'bg-[#4F46E5] text-white hover:bg-[#4338CA]',
  secondary: 'border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50',
};

export function buttonClassName(opts?: { variant?: Variant; size?: Size; className?: string }) {
  const variant = opts?.variant ?? 'secondary';
  const size = opts?.size ?? 'md';
  return [base, sizes[size], variants[variant], opts?.className].filter(Boolean).join(' ');
}


