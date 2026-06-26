import Image from 'next/image'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon = '📋', title, description, action }: EmptyStateProps) {
  const isImage = icon.startsWith('/')
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 px-6 text-center shadow-card">
      {isImage ? (
        <div className="mb-5">
          <Image src={icon} width={72} height={72} alt="" className="opacity-70 mx-auto" />
        </div>
      ) : (
        <span className="text-5xl mb-5 select-none" role="img" aria-hidden="true">
          {icon}
        </span>
      )}
      <p className="text-sm font-bold text-gray-700">{title}</p>
      {description && (
        <p className="mt-1.5 text-xs text-gray-400 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
