import Link from 'next/link'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  backLabel?: string
  badge?: React.ReactNode
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, backHref, backLabel, badge, action }: PageHeaderProps) {
  return (
    <div className="mb-8 pb-5 border-b border-gray-100/80">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4 font-semibold uppercase tracking-wider transition-all group"
        >
          <span className="transition-transform duration-300 group-hover:translate-x-[-2px]">←</span> {backLabel ?? 'Indietro'}
        </Link>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight leading-tight">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="mt-1 text-sm text-gray-500 font-medium">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0 self-start sm:self-center">{action}</div>}
      </div>
    </div>
  )
}
