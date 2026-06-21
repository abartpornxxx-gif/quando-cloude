import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/PageHeader'
import { TaskLibreriaView } from './TaskLibreriaView'

export default async function TaskLibreriaPage() {
  await requireImpresa()

  const tasks = await prisma.taskLibreria.findMany({
    orderBy: [{ ordine: 'asc' }, { createdAt: 'asc' }],
  })

  return (
    <div>
      <PageHeader
        title="Libreria task"
        subtitle="Attività standard riutilizzabili nella pianificazione"
        backHref="/impresa/dashboard"
      />
      <TaskLibreriaView iniziali={tasks} />
    </div>
  )
}
