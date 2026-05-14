'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { setAuth } from '@/lib/auth'

export default function AuthCallbackPage() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      router.replace('/login?error=oauth_failed')
      return
    }
    // Decode the JWT payload to extract user info (no verification needed — server already did it)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      setAuth(token, {
        id: payload.sub as string,
        email: payload.email as string,
        firstName: '',
        lastName: '',
      })
    } catch {
      router.replace('/login?error=oauth_failed')
      return
    }
    router.replace('/dashboard')
  }, [params, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-sm text-gray-400">Signing you in…</p>
    </div>
  )
}
