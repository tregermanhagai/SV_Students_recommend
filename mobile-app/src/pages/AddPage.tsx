import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/hooks/useSession'
import { useLocale } from '@/hooks/useLocale'
import ImageUploader from '@/components/ImageUploader'
import CategoryPill from '@/components/CategoryPill'
import type { Recommendation } from '@/types'

const CATEGORIES: Recommendation['category'][] = ['Book', 'Movie', 'Series', 'Activity', 'Other']

const CAT_LABEL_KEY: Record<Recommendation['category'], Parameters<ReturnType<typeof useLocale>['t']>[0]> = {
  Book: 'book', Movie: 'movie', Series: 'series', Activity: 'activity', Other: 'other',
}

export default function AddPage() {
  const { user } = useSession()
  const navigate = useNavigate()
  const { t } = useLocale()

  const [form, setForm] = useState({
    category: 'Movie' as Recommendation['category'],
    title: '',
    recommender: '',
    url: '',
    description: '',
  })
  const [imageUrl, setImageUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!form.title.trim()) { setError('Title is required'); return }
    setSubmitting(true)
    setError('')
    const { error: dbErr } = await supabase.from('recommendations').insert({
      user_id: user.id,
      category: form.category,
      title: form.title.trim(),
      recommender: form.recommender.trim(),
      url: form.url.trim() || null,
      description: form.description.trim(),
      image_url: imageUrl || null,
    })
    setSubmitting(false)
    if (dbErr) { setError(dbErr.message); return }
    navigate('/home', { replace: true })
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      <div className="px-4 py-4 space-y-5">
        <h1 className="text-white text-xl font-bold">{t('addRecommendation')}</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <div className="space-y-2">
            <label className="text-slate-400 text-xs uppercase tracking-wide">{t('category')}</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <CategoryPill
                  key={cat}
                  category={cat}
                  label={t(CAT_LABEL_KEY[cat])}
                  active={form.category === cat}
                  onClick={() => setForm(f => ({ ...f, category: cat }))}
                />
              ))}
            </div>
          </div>

          {/* Image */}
          <ImageUploader onUploaded={setImageUrl} />

          <input className="input-base" type="text" placeholder={t('title')}
            value={form.title} onChange={set('title')} required />
          <input className="input-base" type="text" placeholder={t('recommenderName')}
            value={form.recommender} onChange={set('recommender')} required />
          <input className="input-base" type="url" placeholder={t('url')}
            value={form.url} onChange={set('url')} />
          <textarea className="input-base resize-none" rows={4}
            placeholder={t('descriptionPlaceholder')}
            value={form.description} onChange={set('description')} required />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-accent w-full disabled:opacity-50">
            {submitting ? t('submitting') : t('submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
