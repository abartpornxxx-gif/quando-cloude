import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

type Variant = 'default' | 'danger' | 'warning' | 'success' | 'info' | 'purple'

const ACCENT_TOP: Record<Variant, string> = {
  default: 'bg-gray-300',
  danger:  'bg-red-500',
  warning: 'bg-amber-500',
  success: 'bg-emerald-500',
  info:    'bg-blue-500',
  purple:  'bg-violet-500',
}

const ICON_BG: Record<Variant, string> = {
  default: 'bg-gray-100 ring-gray-200',
  danger:  'bg-red-50 ring-red-200',
  warning: 'bg-amber-50 ring-amber-200',
  success: 'bg-emerald-50 ring-emerald-200',
  info:    'bg-blue-50 ring-blue-200',
  purple:  'bg-violet-50 ring-violet-200',
}

const ICON_CLS: Record<Variant, string> = {
  default: 'text-gray-500',
  danger:  'text-red-500',
  warning: 'text-amber-600',
  success: 'text-emerald-600',
  info:    'text-blue-600',
  purple:  'text-violet-600',
}

const LABEL_CLS: Record<Variant, string> = {
  default: 'text-gray-400',
  danger:  'text-red-500',
  warning: 'text-amber-600',
  success: 'text-emerald-600',
  info:    'text-blue-500',
  purple:  'text-violet-600',
}

const VALUE_CLS: Record<Variant, string> = {
  default: 'text-gray-900',
  danger:  'text-red-700',
  warning: 'text-amber-800',
  success: 'text-emerald-800',
  info:    'text-slate-900',
  purple:  'text-violet-900',
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  href?: string
  variant?: Variant
  icon?: LucideIcon
}

export function StatCard({ label, value, sub, href, variant = 'default', icon: Icon }: StatCardProps) {
  const inner = (
    <div className={`relative rounded-2xl border border-gray-200 bg-white overflow-hidden transition-all duration-200 ${href ? 'hover:shadow-lg hover:border-gray-300 cursor-pointer group' : ''} shadow-card`}>
      {/* Colored top accent strip */}
      <div className={`h-[3px] ${ACCENT_TOP[variant]}`} />

      <div className="p-5">
        {Icon && (
          <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${ICON_BG[variant]}`}>
            <Icon size={19} className={`${ICON_CLS[variant]} transition-transform duration-200 ${href ? 'group-hover:scale-110' : ''}`} />
          </div>
        )}

        <p className={`text-[10px] font-bold uppercase tracking-widest ${LABEL_CLS[variant]}`}>{label}</p>
        <p className={`mt-1.5 text-3xl font-black tracking-tight leading-none ${VALUE_CLS[variant]}`}>{value}</p>
        {sub && <p className="mt-2 text-xs font-medium text-gray-400 leading-snug">{sub}</p>}

        {href && (
          <p className={`mt-4 text-[11px] font-bold flex items-center gap-0.5 transition-colors duration-200 ${LABEL_CLS[variant]}`}>
            Vedi tutti
            <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
          </p>
        )}
      </div>
    </div>
  )

  if (href) return <Link href={href} className="block no-underline">{inner}</Link>
  return inner
}
