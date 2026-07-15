import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/hooks/useSession'
import { useLocale } from '@/hooks/useLocale'
import type { Recommendation } from '@/types'

export default function ProfilePage() {
  const { user, profile } = useSession()
  const { t, locale, setLocale } = useLocale()
  const navigate = useNavigate()
  const [myRecs, setMyRecs] = useState<Recommendation[]>([])
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(profile?.name ?? '')

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

  const initials = (profile?.name ?? user?.email ?? '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      <div className="px-4 py-6 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-accent/20 text-accent text-2xl font-bold flex items-center justify-center">
            {initials}
          </div>

          {editingName ? (
            <div className="flex gap-2 w-full max-w-xs">
              <input
                className="input-base flex-1 text-center"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
              <button onClick={saveName} className="btn-accent px-3 py-2 text-sm">{t('save')}</button>
              <button onClick={() => setEditingName(false)} className="text-slate-400 px-2 text-sm">{t('cancel')}</button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-white font-semibold text-lg">{profile?.name ?? '—'}</p>
              <button onClick={() => setEditingName(true)} className="text-accent text-xs mt-0.5">
                {t('editName')}
              </button>
            </div>
          )}

          <p className="text-slate-400 text-sm">{user?.email}</p>
        </div>

        <div className="card-surface p-4 flex items-center justify-between">
          <span className="text-white text-sm">{t('language')}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setLocale('en')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${locale === 'en' ? 'bg-accent text-bg' : 'bg-white/10 text-slate-300'}`}
            >
              {t('english')}
            </button>
            <button
              onClick={() => setLocale('he')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${locale === 'he' ? 'bg-accent text-bg' : 'bg-white/10 text-slate-300'}`}
            >
              {t('hebrew')}
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-slate-400 text-xs uppercase tracking-wide mb-3">{t('myRecommendations')}</h2>
          {myRecs.length === 0 ? (
            <p className="text-slate-500 text-sm">{t('noRecommendations')}</p>
          ) : (
            <div className="space-y-2">
              {myRecs.map(rec => (
                <button
                  key={rec.id}
                  onClick={() => navigate(`/recommendations/${rec.id}`)}
                  className="card-surface w-full p-3 flex items-center gap-3 text-left active:opacity-80"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 overflow-hidden shrink-0 flex items-center justify-center">
                    {rec.image_url
                      ? <img src={rec.image_url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-lg">{categoryEmoji(rec.category)}</span>
                    }
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

        <button
          onClick={signOut}
          className="w-full py-3 rounded-2xl border border-red-500/30 text-red-400 text-sm font-medium active:opacity-70"
        >
          {t('signOut')}
        </button>

        <p className="text-center text-slate-600 text-xs">© 2026 SV College · v1.0</p>
      </div>
    </div>
  )
}

function categoryEmoji(cat: Recommendation['category']) {
  return { Book: '📚', Movie: '🎬', Series: '📺', Activity: '🏃', Other: '✨' }[cat]
}
