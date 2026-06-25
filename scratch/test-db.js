const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })
const { PrismaClient } = require('../app/generated/prisma')

// Ensure session port is used to bypass transaction pooler constraints
let dbUrl = process.env.DATABASE_URL
if (dbUrl) {
  const url = new URL(dbUrl)
  if (url.port === '6543') {
    url.port = '5432'
  }
  dbUrl = url.toString()
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
})

async function main() {
  console.log('--- START DATABASE INTEGRATION TEST (TEST_AI_FULL_QUADRO) ---')
  try {
    // 1. Fetch or create a test operaio
    let operaio = await prisma.operaio.findFirst()
    let createdTestOperaio = false
    if (!operaio) {
      console.log('No operaio found. Creating a test operaio...')
      operaio = await prisma.operaio.create({
        data: {
          nome: 'TEST_AI_FULL_QUADRO Operaio',
          email: 'test_ai_full_quadro_operaio@example.com',
          costoOrario: 25,
        },
      })
      createdTestOperaio = true
      console.log('Created test operaio:', operaio.nome)
    } else {
      console.log('Using existing operaio for testing:', operaio.nome)
    }

    // 2. Test ImpresaProfilo operations
    console.log('Testing ImpresaProfilo...')
    let profilo = await prisma.impresaProfilo.findFirst()
    if (!profilo) {
      profilo = await prisma.impresaProfilo.create({
        data: {
          nomeImpresa: 'TEST_AI_FULL_QUADRO Impresa',
          settore: 'Test Settore',
          colorePrimario: '#0f766e',
          stileCard: 'Classico',
        },
      })
      console.log('Created test ImpresaProfilo:', profilo.nomeImpresa)
    } else {
      const origNome = profilo.nomeImpresa
      profilo = await prisma.impresaProfilo.update({
        where: { id: profilo.id },
        data: {
          nomeImpresa: 'TEST_AI_FULL_QUADRO Impresa Updated',
        },
      })
      console.log('Updated ImpresaProfilo:', profilo.nomeImpresa)
      // Restore
      await prisma.impresaProfilo.update({
        where: { id: profilo.id },
        data: { nomeImpresa: origNome },
      })
      console.log('Restored original ImpresaProfilo name.')
    }

    // 3. Test Operaio profile customization fields
    console.log('Testing Operaio customization fields...')
    const origAvatar = operaio.avatarMascotte
    const origDesc = operaio.descrizione
    const origFrase = operaio.fraseDivertente
    const origHobbies = operaio.hobbies

    const updatedOperaio = await prisma.operaio.update({
      where: { id: operaio.id },
      data: {
        avatarMascotte: 'volpe',
        descrizione: 'TEST_AI_FULL_QUADRO bio',
        fraseDivertente: 'TEST_AI_FULL_QUADRO motto',
        hobbies: 'TEST_AI_FULL_QUADRO hobbies',
      },
    })
    console.log('Updated Operaio profile:', {
      id: updatedOperaio.id,
      avatarMascotte: updatedOperaio.avatarMascotte,
      descrizione: updatedOperaio.descrizione,
    })

    // 4. Test Promemoria Creation
    console.log('Testing Promemoria creation...')
    const promemoriaImpresa = await prisma.promemoria.create({
      data: {
        titolo: 'TEST_AI_FULL_QUADRO: Promemoria Impresa',
        descrizione: 'Test descrizione',
        dataOra: new Date(),
        perImpresa: true,
      },
    })
    console.log('Created Impresa Promemoria:', promemoriaImpresa.titolo)

    const promemoriaOperaio = await prisma.promemoria.create({
      data: {
        titolo: 'TEST_AI_FULL_QUADRO: Promemoria Operaio',
        descrizione: 'Test desc operaio',
        dataOra: new Date(),
        assegnatoAOperaioId: operaio.id,
        perImpresa: false,
      },
    })
    console.log('Created Operaio Promemoria:', promemoriaOperaio.titolo)

    // 5. Test Promemoria filtering/querying
    console.log('Testing Promemoria listing...')
    const list = await prisma.promemoria.findMany({
      where: {
        titolo: {
          startsWith: 'TEST_AI_FULL_QUADRO',
        },
      },
    })
    console.log(`Found ${list.length} test promemoria in database.`)
    if (list.length < 2) throw new Error('List count mismatch!')

    // 6. Test Promemoria completion
    console.log('Testing Promemoria completion...')
    await prisma.promemoria.update({
      where: { id: promemoriaImpresa.id },
      data: {
        stato: 'completato',
        completatoAt: new Date(),
      },
    })
    const completed = await prisma.promemoria.findUnique({ where: { id: promemoriaImpresa.id } })
    console.log('Promemoria stato:', completed.stato, 'completatoAt:', completed.completatoAt)
    if (completed.stato !== 'completato') throw new Error('Status not updated!')

    // 7. Cleanup
    console.log('Cleaning up test data...')
    const deleteCount = await prisma.promemoria.deleteMany({
      where: {
        titolo: {
          startsWith: 'TEST_AI_FULL_QUADRO',
        },
      },
    })
    console.log(`Deleted ${deleteCount.count} test promemoria records.`)

    // Restore operaio
    if (createdTestOperaio) {
      await prisma.operaio.delete({ where: { id: operaio.id } })
      console.log('Deleted temporary test operaio.')
    } else {
      await prisma.operaio.update({
        where: { id: operaio.id },
        data: {
          avatarMascotte: origAvatar,
          descrizione: origDesc,
          fraseDivertente: origFrase,
          hobbies: origHobbies,
        },
      })
      console.log('Restored original fields of the test operaio.')
    }

    console.log('✅ ALL DATABASE INTEGRATION TESTS PASSED SUCCESSFULLY!')
  } catch (err) {
    console.error('❌ DATABASE INTEGRATION TEST FAILED:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
