import Link from 'next/link'

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

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  href?: string
  variant?: Variant
}

export function StatCard({ label, value, sub, href, variant = 'default' }: StatCardProps) {
  const cls = VARIANTS[variant]
  const inner = (
    <div className={`rounded-2xl border ${cls.card} p-5 shadow-sm hover:shadow-md transition-shadow`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${cls.label}`}>{label}</p>
      <p className={`mt-2 text-4xl font-bold leading-none ${cls.value}`}>{value}</p>
      {sub && <p className={`mt-2 text-xs ${cls.sub}`}>{sub}</p>}
    </div>
  )
  if (href) return <Link href={href} className="block">{inner}</Link>
  return inner
}
