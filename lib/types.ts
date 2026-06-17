export type UserRole = 'impresa' | 'operaio' | 'cliente' | 'magazziniere'

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  email: string | null
  created_at: string
  updated_at: string
}
