// ORDINE 4 — Struttura notifiche push (pronta da attivare)
//
// Per attivare le push:
//   1. npm install web-push
//   2. node -e "const wp=require('web-push'); console.log(JSON.stringify(wp.generateVAPIDKeys()))"
//   3. Aggiungi in .env.local:
//        NEXT_PUBLIC_VAPID_PUBLIC_KEY=<valore publicKey>
//        VAPID_PRIVATE_KEY=<valore privateKey>
//        VAPID_SUBJECT=mailto:info@tuaimpresa.it
//   4. Decommentare il blocco "ATTIVARE" qui sotto

export async function inviaPushRapportino(operaioId: string, giornataId: string): Promise<void> {
  // TODO — ATTIVARE quando web-push è installato e le env var sono configurate:
  //
  // import webpush from 'web-push'
  // import { prisma } from '@/lib/prisma'
  //
  // if (!process.env.VAPID_PRIVATE_KEY) return  // silenzio se non configurato
  //
  // webpush.setVapidDetails(
  //   process.env.VAPID_SUBJECT!,
  //   process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  //   process.env.VAPID_PRIVATE_KEY!,
  // )
  //
  // const subs = await prisma.$queryRaw<{subscription: any}[]>`
  //   SELECT subscription FROM push_subscriptions WHERE operaio_id = ${operaioId}::uuid
  // `
  // const payload = JSON.stringify({
  //   title: 'QUADRO — Rapportino da compilare',
  //   body: 'La tua giornata è terminata. Compila il rapportino ora.',
  //   url: `/operaio/giornata/${giornataId}/rapportino`,
  // })
  // await Promise.allSettled(subs.map(s => webpush.sendNotification(s.subscription, payload)))
}

export async function salvaSubscription(operaioId: string, subscription: object): Promise<void> {
  // Salva la subscription push nel DB
  // Richiede web-push + variabili d'ambiente configurate
  const endpoint = (subscription as any).endpoint as string
  const { prisma } = await import('@/lib/prisma')

  await prisma.$executeRaw`
    INSERT INTO push_subscriptions (operaio_id, endpoint, subscription)
    VALUES (${operaioId}::uuid, ${endpoint}, ${JSON.stringify(subscription)}::jsonb)
    ON CONFLICT (operaio_id, endpoint) DO UPDATE SET subscription = EXCLUDED.subscription
  `
}
