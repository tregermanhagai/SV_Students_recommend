import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/hooks/useSession'
import { useLocale } from '@/hooks/useLocale'
import type { Recommendation } from '@/types'

const RENDER_BASE = import.meta.env.VITE_RENDER_BASE_URL as string

type Modal = 'none' | 'password' | 'delete' | 'about' | 'help'

export default function ProfilePage() {
  const { user, profile, session } = useSession()
  const { t, locale, setLocale } = useLocale()
  const navigate = useNavigate()

  const [myRecs, setMyRecs] = useState<Recommendation[]>([])
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(profile?.name ?? '')
  const [modal, setModal] = useState<Modal>('none')

  // Change password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwSuccess, setPwSuccess] = useState(false)

  // Delete account state
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [delLoading, setDelLoading] = useState(false)

  useEffect(() => {
    setName(profile?.name ?? '')
    if (user) {
      supabase
        .from('recommendations')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setMyRecs(data ?? []))
    }
  }, [user, profile])

  async function saveName() {
    if (!user) return
    await supabase.from('profiles').upsert({ id: user.id, name })
    setEditingName(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  async function changePassword() {
    setPwError('')
    if (newPassword.length < 6) { setPwError('Password must be at least 6 characters'); return }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return }
    setPwLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwLoading(false)
    if (error) { setPwError(error.message); return }
    setPwSuccess(true)
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => { setPwSuccess(false); setModal('none') }, 1500)
  }

  async function deleteAccount() {
    if (!session) return
    setDelLoading(true)
    try {
      await fetch(`${RENDER_BASE}/api/profile/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      await supabase.auth.signOut()
      navigate('/login', { replace: true })
    } catch {
      setDelLoading(false)
    }
  }

  const initials = (profile?.name ?? user?.email ?? '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      <div className="px-4 py-6 space-y-5">

        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-accent/20 text-accent text-2xl font-bold flex items-center justify-center">
            {initials}
          </div>
          {editingName ? (
            <div className="flex gap-2 w-full max-w-xs">
              <input className="input-base flex-1 text-center" value={name}
                onChange={e => setName(e.target.value)} autoFocus />
              <button onClick={saveName} className="btn-accent px-3 py-2 text-sm">{t('save')}</button>
              <button onClick={() => setEditingName(false)} className="text-slate-400 px-2 text-sm">{t('cancel')}</button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-white font-semibold text-lg">{profile?.name ?? '—'}</p>
              <button onClick={() => setEditingName(true)} className="text-accent text-xs mt-0.5">{t('editName')}</button>
            </div>
          )}
          <p className="text-slate-400 text-sm">{user?.email}</p>
        </div>

        {/* Language toggle */}
        <div className="card-surface p-4 flex items-center justify-between">
          <span className="text-white text-sm">{t('language')}</span>
          <div className="flex gap-2">
            {(['en', 'he'] as const).map(l => (
              <button key={l} onClick={() => setLocale(l)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${locale === l ? 'bg-accent text-bg' : 'bg-white/10 text-slate-300'}`}>
                {l === 'en' ? t('english') : t('hebrew')}
              </button>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="card-surface divide-y divide-white/5">
          {[
            { label: '🛍 Store',   action: () => navigate('/store') },
            { label: '❓ Help',    action: () => setModal('help') },
            { label: 'ℹ️ About',   action: () => setModal('about') },
          ].map(item => (
            <button key={item.label} onClick={item.action}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-white active:opacity-70">
              <span>{item.label}</span>
              <span className="text-slate-500">›</span>
            </button>
          ))}
        </div>

        {/* Account actions */}
        <div className="card-surface divide-y divide-white/5">
          <button onClick={() => setModal('password')}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-white active:opacity-70">
            <span>🔑 Change password</span>
            <span className="text-slate-500">›</span>
          </button>
          <button onClick={() => setModal('delete')}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-red-400 active:opacity-70">
            <span>🗑 Delete account</span>
            <span className="text-slate-500">›</span>
          </button>
        </div>

        {/* My recommendations */}
        <div>
          <h2 className="text-slate-400 text-xs uppercase tracking-wide mb-3">{t('myRecommendations')}</h2>
          {myRecs.length === 0 ? (
            <p className="text-slate-500 text-sm">{t('noRecommendations')}</p>
          ) : (
            <div className="space-y-2">
              {myRecs.map(rec => (
                <button key={rec.id} onClick={() => navigate(`/recommendations/${rec.id}`)}
                  className="card-surface w-full p-3 flex items-center gap-3 text-left active:opacity-80">
                  <div className="w-10 h-10 rounded-xl bg-white/5 overflow-hidden shrink-0 flex items-center justify-center">
                    {rec.image_url
                      ? <img src={rec.image_url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-lg">{catEmoji(rec.category)}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{rec.name}</p>
                    <p className="text-slate-400 text-xs">{rec.category}</p>
                  </div>
                  <span className="text-slate-500">›</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sign out */}
        <button onClick={signOut}
          className="w-full py-3 rounded-2xl border border-red-500/30 text-red-400 text-sm font-medium active:opacity-70">
          {t('signOut')}
        </button>

        <p className="text-center text-slate-600 text-xs">© 2026 SV College · v1.0</p>
      </div>

      {/* ── Modals ── */}
      {modal !== 'none' && (
        <div className="fixed inset-0 bg-black/70 flex items-end z-50" onClick={() => setModal('none')}>
          <div className="bg-card w-full rounded-t-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto"
               onClick={e => e.stopPropagation()}>

            {/* Change password */}
            {modal === 'password' && (
              <>
                <h2 className="text-white font-bold text-lg">🔑 Change password</h2>
                <input className="input-base" type="password" placeholder="New password (min 6 chars)"
                  value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                <input className="input-base" type="password" placeholder="Confirm new password"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                {pwError && <p className="text-red-400 text-sm">{pwError}</p>}
                {pwSuccess && <p className="text-green-400 text-sm">✓ Password changed!</p>}
                <button onClick={changePassword} disabled={pwLoading}
                  className="btn-accent w-full disabled:opacity-50">
                  {pwLoading ? 'Saving…' : 'Save password'}
                </button>
                <button onClick={() => setModal('none')} className="w-full text-slate-400 py-2 text-sm">
                  {t('cancel')}
                </button>
              </>
            )}

            {/* Delete account */}
            {modal === 'delete' && (
              <>
                <h2 className="text-white font-bold text-lg">🗑 Delete account</h2>
                <p className="text-slate-400 text-sm">
                  This permanently deletes your account and all your recommendations. Type <strong className="text-white">DELETE</strong> to confirm.
                </p>
                <input className="input-base" type="text" placeholder="Type DELETE"
                  value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
                <button
                  onClick={deleteAccount}
                  disabled={deleteConfirm !== 'DELETE' || delLoading}
                  className="w-full py-3 rounded-2xl bg-red-600 text-white font-semibold disabled:opacity-40">
                  {delLoading ? 'Deleting…' : 'Delete my account'}
                </button>
                <button onClick={() => setModal('none')} className="w-full text-slate-400 py-2 text-sm">
                  {t('cancel')}
                </button>
              </>
            )}

            {/* Help */}
            {modal === 'help' && (
              <>
                <h2 className="text-white font-bold text-lg">❓ Help</h2>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Welcome to <strong className="text-white">SV Recommend</strong>! Browse recommendations
                  from your classmates, add your own, and leave comments with star ratings.
                </p>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Visit <strong className="text-white">My Profile</strong> to find your API Bearer token
                  for practicing REST API testing.
                </p>
                <button onClick={() => setModal('none')} className="btn-accent w-full">Got it</button>
              </>
            )}

            {/* About */}
            {modal === 'about' && (
              <>
                <h2 className="text-white font-bold text-lg">ℹ️ About</h2>
                <p className="text-slate-300 text-sm leading-relaxed">
                  <strong className="text-white">SV Students Recommend</strong> is a sandbox application
                  built for <strong className="text-white">SV College</strong> students to practice
                  end-to-end testing with Playwright, Python, and Pytest, as well as REST API testing.
                </p>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Every interactive element has a <code className="bg-white/10 px-1 rounded text-accent">data-test</code> attribute for reliable test automation.
                </p>
                <button onClick={() => setModal('none')} className="btn-accent w-full">Close</button>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

function catEmoji(cat: Recommendation['category']) {
  return { Book: '📚', Movie: '🎬', Series: '📺', Activity: '🏃', Other: '✨' }[cat]
}
