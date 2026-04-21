'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, Badge } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fadeUp } from '@/lib/animation'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function SettingsPage() {
  const { apiKey, user, login, logout } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      setLoading(false)
    }
  }, [user])

  async function handleSaveProfile() {
    if (!apiKey) return
    setSaving(true)
    try {
      const updated = await api.users.update({
        name: name || undefined,
        email: email || undefined,
      })
      login(apiKey, updated)
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const initial = user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[#737373]" />
      </div>
    )
  }

  return (
    <div>
      <motion.div variants={fadeUp} initial="initial" animate="animate" className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[#ededed]">Settings</h1>
        <p className="text-xs text-[#737373] mt-1">Manage your account and preferences.</p>
      </motion.div>

      {/* Profile */}
      <motion.div variants={fadeUp} initial="initial" animate="animate">
        <Card>
          <h2 className="text-base font-semibold text-[#ededed] mb-5">Profile</h2>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-[#00d4ff] flex items-center justify-center text-xl font-semibold text-[#0a0a0a]">
              {initial}
            </div>
            <div>
              <p className="text-xs font-medium text-[#ededed]">{user?.name || 'No name set'}</p>
              <p className="text-xs text-[#737373]">{user?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
            <Input
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              helper="Changing email requires re-login"
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            className="mt-5"
            loading={saving}
            onClick={handleSaveProfile}
          >
            Save Changes
          </Button>
        </Card>
      </motion.div>

      {/* Security */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" className="mt-6">
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-[#ededed]">Security</h2>
            <Badge variant="purple">Coming Soon</Badge>
          </div>
          <p className="text-xs text-[#737373]">
            Password change will be available in a future update.
          </p>
        </Card>
      </motion.div>

      {/* 2FA */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" className="mt-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#ededed]">Two-Factor Authentication</h2>
              <p className="text-xs text-[#737373] mt-1">
                Add an extra layer of security to your account.
              </p>
            </div>
            <Badge variant="purple">Coming Soon</Badge>
          </div>
        </Card>
      </motion.div>

      {/* Danger Zone */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" className="mt-6">
        <Card danger>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#ef4444]">Sign Out</h2>
              <p className="text-xs text-[#737373] mt-1">
                Sign out of your dashboard session. Your API keys and tool connections remain
                active.
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={logout}>
              Sign Out
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
