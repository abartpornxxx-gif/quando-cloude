-- ============================================================
-- QUADRO — Script SQL da eseguire nel pannello Supabase
-- Supabase Dashboard > SQL Editor > New query > Incolla e "Run"
-- ============================================================

-- 1. Enum per i ruoli utente
CREATE TYPE user_role AS ENUM ('impresa', 'operaio', 'cliente', 'magazziniere', 'ufficio');

-- 2. Tabella profili (estende auth.users di Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role   NOT NULL DEFAULT 'cliente',
  full_name   TEXT,
  email       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Abilita Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Policy: ogni utente può leggere solo il proprio profilo
CREATE POLICY "Utente legge il proprio profilo"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 5. Policy: ogni utente può aggiornare solo il proprio profilo
CREATE POLICY "Utente aggiorna il proprio profilo"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 6. Policy: l'impresa può leggere tutti i profili
CREATE POLICY "Impresa legge tutti i profili"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'impresa'
    )
  );

-- 7. Policy: l'impresa può aggiornare il ruolo degli altri utenti
CREATE POLICY "Impresa aggiorna ruolo degli utenti"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'impresa'
    )
  );

-- 8. Funzione: crea automaticamente il profilo quando un utente si registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    COALESCE(
      (NEW.raw_user_meta_data ->> 'role')::user_role,
      'cliente'
    )
  );
  RETURN NEW;
END;
$$;

-- 9. Trigger: esegui la funzione ad ogni nuova registrazione
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 10. Funzione helper: aggiorna updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Fine script — ora torna su Next.js e avvia il server con:
--   npm run dev
-- ============================================================
