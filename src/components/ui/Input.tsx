import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export default function Input({ label, error, id, className = '', ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={inputId}
        className={[
          'w-full px-4 py-3 rounded-xl border bg-white text-slate-900 placeholder:text-slate-400',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-navy-900/20 focus:border-navy-700',
          error ? 'border-red-400' : 'border-slate-200 hover:border-slate-300',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
