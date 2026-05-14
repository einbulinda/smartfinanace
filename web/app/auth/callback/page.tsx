'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { setAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import type { User } from '@/lib/types'

function AuthCallbackHandler() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      router.replace('/login?error=oauth_failed')
      return
    }

    // Store token first so the interceptor can attach it
    localStorage.setItem('sf_token', token)

    // Fetch full profile (includes firstName, lastName, avatarUrl)
    api.get<User>('/auth/profile')
      .then(({ data }) => {
        setAuth(token, data)
        router.replace('/dashboard')
      })
      .catch(() => {
        localStorage.removeItem('sf_token')
        router.replace('/login?error=oauth_failed')
      })
  }, [params, router])

  return <p className="text-sm text-gray-400">Signing you in…</p>
}

export default function AuthCallbackPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Suspense>
        <AuthCallbackHandler />
      </Suspense>
    </div>
  )
}
