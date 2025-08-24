'use server'

import { cookies } from 'next/headers'

export async function getTheme() {
  const cookieStore = await cookies()
  const theme = cookieStore.get('theme')?.value
  
  // Return the stored theme or default to 'system'
  return theme || 'system'
}