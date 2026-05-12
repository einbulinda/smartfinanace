'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Save, Lock } from 'lucide-react'
import { getUser, clearAuth, setAuth, getToken } from '@/lib/auth'
import { api } from '@/lib/api'
import type { User as UserType } from '@/lib/types'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)

  // Profile form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    const u = getUser()
    if (u) {
      setUser(u)
      setFirstName(u.firstName)
      setLastName(u.lastName)
      setEmail(u.email)
    }
  }, [])

  function handleLogout() {
    clearAuth()
    router.replace('/login')
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setProfileMsg(null)
    setProfileSaving(true)
    try {
      const { data } = await api.patch<UserType>('/users/me', { firstName, lastName, email })
      // Update localStorage so the header/avatar reflect the new name immediately
      const token = getToken()!
      setAuth(token, data)
      setUser(data)
      setProfileMsg({ type: 'ok', text: 'Profile updated.' })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to update profile.'
      setProfileMsg({ type: 'err', text: Array.isArray(msg) ? msg.join(' ') : msg })
    } finally {
      setProfileSaving(false)
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg(null)
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'err', text: 'New passwords do not match.' })
      return
    }
    setPwSaving(true)
    try {
      await api.patch('/users/me', { currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPwMsg({ type: 'ok', text: 'Password changed.' })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to change password.'
      setPwMsg({ type: 'err', text: Array.isArray(msg) ? msg.join(' ') : msg })
    } finally {
      setPwSaving(false)
    }
  }

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '?'

  const labelCls = 'block text-xs font-medium text-gray-500 mb-1'
  const inputCls =
    'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent'

  return (
    <div className="p-4 lg:p-8 max-w-lg mx-auto space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
        <p className="text-sm text-gray-400 mt-0.5">Manage your account details</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-green-700 flex items-center justify-center shrink-0">
          <span className="text-xl font-bold text-white">{initials}</span>
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-gray-900 truncate">
            {user ? `${user.firstName} ${user.lastName}` : '—'}
          </p>
          <p className="text-sm text-gray-400 truncate">{user?.email ?? '—'}</p>
        </div>
      </div>

      {/* Profile form */}
      <form
        onSubmit={handleProfileSave}
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4"
      >
        <h3 className="text-sm font-semibold text-gray-700">Personal details</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>First name</label>
            <input
              className={inputCls}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Last name</label>
            <input
              className={inputCls}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input
            type="email"
            className={inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        {profileMsg && (
          <p className={`text-xs ${profileMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
            {profileMsg.text}
          </p>
        )}
        <button
          type="submit"
          disabled={profileSaving}
          className="flex items-center gap-1.5 rounded-lg bg-green-700 text-white text-sm font-medium px-4 py-2 hover:bg-green-800 disabled:opacity-60 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          {profileSaving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      {/* Password form */}
      <form
        onSubmit={handlePasswordSave}
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4"
      >
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-gray-400" />
          Change password
        </h3>
        <div>
          <label className={labelCls}>Current password</label>
          <input
            type="password"
            className={inputCls}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelCls}>New password</label>
          <input
            type="password"
            className={inputCls}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <div>
          <label className={labelCls}>Confirm new password</label>
          <input
            type="password"
            className={inputCls}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        {pwMsg && (
          <p className={`text-xs ${pwMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
            {pwMsg.text}
          </p>
        )}
        <button
          type="submit"
          disabled={pwSaving}
          className="flex items-center gap-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium px-4 py-2 hover:bg-gray-700 disabled:opacity-60 transition-colors"
        >
          <Lock className="w-3.5 h-3.5" />
          {pwSaving ? 'Changing…' : 'Change password'}
        </button>
      </form>

      {/* Sign out */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 transition-colors py-3 text-sm font-medium"
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </button>
    </div>
  )
}
