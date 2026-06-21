import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/PageHeader'
import { TaskLibreriaView } from './TaskLibreriaView'

export default async function TaskLibreriaPage() {
  await requireImpresa()

  let tasks: { id: string; titolo: string; ordine: number }[] = []
  let dbError: string | null = null

  try {
    tasks = await prisma.taskLibreria.findMany({
      orderBy: [{ ordine: 'asc' }, { createdAt: 'asc' }],
    })
  } catch {
    dbError = 'Tabella non trovata. Esegui task-libreria-schema.sql in Supabase SQL Editor.'
  }

  return (
    <div>
      <PageHeader
        title="Libreria task"
        subtitle="Attività standard riutilizzabili nella pianificazione"
        backHref="/impresa/dashboard"
      />
      {dbError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          <p className="font-semibold mb-1">Migrazione DB necessaria</p>
          <p>{dbError}</p>
        </div>
      ) : (
        <TaskLibreriaView iniziali={tasks} />
      )}
    </div>
  )
}
