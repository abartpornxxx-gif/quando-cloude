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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-14 px-6 text-center">
      {isImage ? (
        <div className="mb-4">
          <Image src={icon} width={80} height={80} alt="" className="opacity-80 mx-auto" />
        </div>
      ) : (
        <span className="text-5xl mb-4 select-none" role="img" aria-hidden="true">
          {icon}
        </span>
      )}
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {description && (
        <p className="mt-1.5 text-xs text-gray-400 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
