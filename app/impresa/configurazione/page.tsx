import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ConfigForm from './ConfigForm'

export default async function ConfigurazionePage() {
  await requireImpresa()

  const config = await prisma.configurazioneOrari.findFirst() ?? {
    durataMattinaMinuti: 240,
    durataPausaMinuti: 60,
    durataPomeriggioMinuti: 240,
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Configurazione orari</h1>
      <ConfigForm config={config} />
    </div>
  )
}
