import { randomBytes } from 'crypto'
import { getAdminClient } from '@/lib/supabase/admin'

// Genera una password temporanea con CSPRNG (non Math.random)
export function generateTempPassword(): string {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let pass = 'QDR-'
  const bytes = randomBytes(8)
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(bytes[i] % chars.length)
  }
  return pass
}

interface CreateUserParams {
  email: string
  role: 'operaio' | 'magazziniere' | 'ufficio'
}

export async function createAuthUser({ email, role }: CreateUserParams) {
  const password = generateTempPassword()
  const supabaseAdmin = getAdminClient()
  
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role }
  })

  if (error) {
    throw new Error(`Errore creazione utente auth: ${error.message}`)
  }

  return {
    authUserId: data.user.id,
    tempPassword: password
  }
}

export async function resetAuthPassword(authUserId: string) {
  const password = generateTempPassword()
  const supabaseAdmin = getAdminClient()

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    authUserId,
    { password }
  )

  if (error) {
    throw new Error(`Errore reset password auth: ${error.message}`)
  }

  return {
    tempPassword: password
  }
}
