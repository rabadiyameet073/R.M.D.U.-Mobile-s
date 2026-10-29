import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lyoupcrbcloxjpgstzqh.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Pg9ZHpiCDYbxh4dkvkj65w_xocen3CW'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

/**
 * Triggers Google OAuth sign-in flow
 * Redirects back to current page on localhost:5100
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin, // Automatically uses http://localhost:5100
    },
  })
  if (error) {
    console.error('Error signing in with Google:', error.message)
    throw error
  }
  return data
}

/**
 * Signs out current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Error signing out:', error.message)
    throw error
  }
}

/**
 * Get current logged in user
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) return null
  return user
}
