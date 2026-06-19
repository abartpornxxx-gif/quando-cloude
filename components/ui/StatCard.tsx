import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

type Variant = 'default' | 'danger' | 'warning' | 'success' | 'info' | 'purple'

const VARIANTS: Record<Variant, { card: string; label: string; value: string; sub: string }> = {
  default: {
    card: 'bg-white border-gray-200',
    label: 'text-gray-500',
    value: 'text-gray-900',
    sub: 'text-gray-400',
  },
  danger: {
    card: 'bg-red-50 border-red-200',
    label: 'text-red-600',
    value: 'text-red-700',
    sub: 'text-red-400',
  },
  warning: {
    card: 'bg-amber-50 border-amber-200',
    label: 'text-amber-700',
    value: 'text-amber-800',
    sub: 'text-amber-500',
  },
  success: {
    card: 'bg-emerald-50 border-emerald-200',
    label: 'text-emerald-700',
    value: 'text-emerald-800',
    sub: 'text-emerald-500',
  },
  info: {
    card: 'bg-blue-50 border-blue-200',
    label: 'text-blue-700',
    value: 'text-blue-900',
    sub: 'text-blue-400',
  },
  purple: {
    card: 'bg-violet-50 border-violet-200',
    label: 'text-violet-700',
    value: 'text-violet-900',
    sub: 'text-violet-400',
  },
}

const ICON_BG: Record<Variant, string> = {
  default: 'bg-gray-100',
  danger:  'bg-red-100',
  warning: 'bg-amber-100',
  success: 'bg-emerald-100',
  info:    'bg-blue-100',
  purple:  'bg-violet-100',
}

const ICON_CLS: Record<Variant, string> = {
  default: 'text-gray-500',
  danger:  'text-red-500',
  warning: 'text-amber-600',
  success: 'text-emerald-600',
  info:    'text-blue-600',
  purple:  'text-violet-600',
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
  const cls = VARIANTS[variant]
  const inner = (
    <div className={`rounded-2xl border ${cls.card} p-5 shadow-sm hover:shadow-md transition-all group`}>
      {Icon && (
        <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${ICON_BG[variant]}`}>
          <Icon size={20} className={ICON_CLS[variant]} />
        </div>
      )}
      <p className={`text-[11px] font-bold uppercase tracking-wider ${cls.label}`}>{label}</p>
      <p className={`mt-1.5 text-4xl font-bold leading-none ${cls.value}`}>{value}</p>
      {sub && <p className={`mt-2 text-xs ${cls.sub}`}>{sub}</p>}
      {href && (
        <p className={`mt-3 text-xs font-medium opacity-0 group-hover:opacity-70 transition-opacity ${cls.label}`}>
          Vedi tutti →
        </p>
      )}
    </div>
  )
  if (href) return <Link href={href} className="block">{inner}</Link>
  return inner
}
