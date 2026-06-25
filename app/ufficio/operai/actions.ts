'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresaOUfficio } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { createAuthUser, resetAuthPassword, generateTempPassword } from '@/lib/auth-admin'
import { getAdminClient } from '@/lib/supabase/admin'

export async function creaOperaioUfficio(data: {
  nome: string
  email: string
  ruolo?: string
  zona?: string
  note?: string
}) {
  const adminUser = await requireImpresaOUfficio()
  
  if (!data.email) {
    throw new Error('Email obbligatoria')
  }

  // 1. Crea l'utente in Supabase Auth
  let authUserId = ''
  let tempPassword = ''
  try {
    const res = await createAuthUser({
      email: data.email,
      role: 'operaio'
    })
    authUserId = res.authUserId
    tempPassword = res.tempPassword
  } catch (err: any) {
    console.error('Errore creazione auth user:', err)
    throw new Error(`Errore creazione utente: ${err.message}`)
  }

  // 2. Crea il record nel database QUADRO
  const operaio = await prisma.operaio.create({
    data: {
      nome: data.nome,
      email: data.email,
      ruolo: data.ruolo || null,
      zona: data.zona || null,
      note: data.note || null,
      costoOrario: 0,
      authUserId,
      primoAccesso: true,
      passwordResetRichiesto: true,
    }
  })

  revalidatePath('/ufficio/operai')
  return { success: true, id: operaio.id, tempPassword }
}

export async function modificaOperaioUfficio(id: string, data: {
  nome: string
  email: string
  ruolo?: string
  zona?: string
  note?: string
}) {
  await requireImpresaOUfficio()

  const operaio = await prisma.operaio.findUnique({ where: { id } })
  if (!operaio) throw new Error('Operaio non trovato')

  // Se l'email è cambiata, aggiorna anche Supabase Auth
  if (data.email !== operaio.email && operaio.authUserId) {
    const supabaseAdmin = getAdminClient()
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      operaio.authUserId,
      { email: data.email, email_confirm: true }
    )
    if (error) {
      throw new Error(`Errore aggiornamento email auth: ${error.message}`)
    }
  }

  await prisma.operaio.update({
    where: { id },
    data: {
      nome: data.nome,
      email: data.email,
      ruolo: data.ruolo || null,
      zona: data.zona || null,
      note: data.note || null,
    }
  })

  revalidatePath('/ufficio/operai')
  return { success: true }
}

export async function ripristinaPasswordOperaio(id: string) {
  const adminUser = await requireImpresaOUfficio()

  const operaio = await prisma.operaio.findUnique({ where: { id } })
  if (!operaio) throw new Error('Operaio non trovato')

  let authUserId = operaio.authUserId
  let tempPassword = ''

  // Se per qualche motivo manca authUserId, creiamo l'utente
  if (!authUserId) {
    if (!operaio.email) throw new Error('Email mancante per creare l\'utente auth')
    try {
      const res = await createAuthUser({
        email: operaio.email,
        role: 'operaio'
      })
      authUserId = res.authUserId
      tempPassword = res.tempPassword
    } catch (err: any) {
      throw new Error(`Impossibile creare utente auth: ${err.message}`)
    }
  } else {
    // Altrimenti eseguiamo il reset
    try {
      const res = await resetAuthPassword(authUserId)
      tempPassword = res.tempPassword
    } catch (err: any) {
      throw new Error(`Errore reset auth: ${err.message}`)
    }
  }

  // Aggiorna il database QUADRO
  await prisma.operaio.update({
    where: { id },
    data: {
      authUserId,
      primoAccesso: true,
      passwordResetRichiesto: true,
      ultimoResetPasswordAt: new Date(),
      ultimoResetPasswordBy: adminUser.email || 'Admin',
    }
  })

  revalidatePath('/ufficio/operai')
  return { success: true, tempPassword }
}

export async function eliminaOperaioUfficio(id: string) {
  await requireImpresaOUfficio()
  
  const operaio = await prisma.operaio.findUnique({ where: { id } })
  if (!operaio) throw new Error('Operaio non trovato')

  const [nGiornate, nRichieste, nUsi] = await Promise.all([
    prisma.giornata.count({ where: { operaioId: id } }),
    prisma.richiestaMateriale.count({ where: { operaioId: id } }),
    prisma.attrezzaturaUso.count({ where: { operaioId: id } }),
  ])
  const totale = nGiornate + nRichieste + nUsi
  if (totale > 0) {
    const parti: string[] = []
    if (nGiornate > 0) parti.push(`${nGiornate} giornate`)
    if (nRichieste > 0) parti.push(`${nRichieste} richieste materiale`)
    if (nUsi > 0) parti.push(`${nUsi} usi attrezzatura`)
    throw new Error(`Impossibile eliminare l'operaio: ha ${parti.join(', ')} registrati.`)
  }

  // Elimina l'utente anche da Supabase Auth se esiste
  if (operaio.authUserId) {
    const supabaseAdmin = getAdminClient()
    await supabaseAdmin.auth.admin.deleteUser(operaio.authUserId).catch(err => {
      console.warn('Errore durante la cancellazione utente auth:', err)
    })
  }

  await prisma.operaio.delete({ where: { id } })
  revalidatePath('/ufficio/operai')
}

export async function salvaOperaioUfficio(formData: FormData) {
  await requireImpresaOUfficio()
  const id = formData.get('id') as string | null
  const nome = formData.get('nome') as string
  const email = formData.get('email') as string
  const ruolo = (formData.get('ruolo') as string) || undefined
  const zona = (formData.get('zona') as string) || undefined
  const note = (formData.get('note') as string) || undefined

  if (id) {
    await modificaOperaioUfficio(id, { nome, email, ruolo, zona, note })
  } else {
    await creaOperaioUfficio({ nome, email, ruolo, zona, note })
  }
  const { redirect } = await import('next/navigation')
  redirect('/ufficio/operai')
}

