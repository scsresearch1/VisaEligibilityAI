import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
  fullWidth?: boolean
  to?: string
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gold-500 text-navy-950 hover:bg-gold-400 shadow-lg shadow-gold-500/25 font-semibold',
  secondary:
    'bg-navy-900 text-white hover:bg-navy-800 shadow-lg shadow-navy-900/20 font-semibold',
  ghost: 'bg-transparent text-navy-900 hover:bg-navy-900/5 font-medium',
  outline:
    'border-2 border-white/30 text-white hover:bg-white/10 font-semibold backdrop-blur-sm',
}

const sizes: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm rounded-lg',
  md: 'px-6 py-3 text-sm rounded-xl',
  lg: 'px-8 py-4 text-base rounded-xl',
}

const baseClass =
  'inline-flex items-center justify-center gap-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]'

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className = '',
  children,
  to,
  type = 'button',
  disabled,
  ...props
}: ButtonProps) {
  const classes = [
    baseClass,
    variants[variant],
    sizes[size],
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (to) {
    if (disabled) {
      return (
        <span
          className={classes}
          aria-disabled="true"
          role="link"
        >
          {children}
        </span>
      )
    }
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} className={classes} disabled={disabled} {...props}>
      {children}
    </button>
  )
}
