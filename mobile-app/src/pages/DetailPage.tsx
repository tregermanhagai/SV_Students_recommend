import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/hooks/useSession'
import { useLocale } from '@/hooks/useLocale'
import StarPicker from '@/components/StarPicker'
import StarDisplay from '@/components/StarDisplay'
import { categoryStyles } from '@/components/CategoryPill'
import type { Recommendation, Comment } from '@/types'

export default function DetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, profile } = useSession()
  const { t } = useLocale()

  const [rec, setRec] = useState<Recommendation | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [body, setBody] = useState('')
  const [rating, setRating] = useState(5)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (id) load(id) }, [id])

  async function load(recId: string) {
    const [{ data: recData }, { data: commentData }] = await Promise.all([
      supabase.from('recommendations').select('*').eq('id', recId).single(),
      supabase.from('comments').select('*').eq('recommendation_id', recId).order('created_at', { ascending: false }),
    ])
    setRec(recData)
    setComments(commentData ?? [])
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || !user || !id) return
    setSubmitting(true)
    await supabase.from('comments').insert({
      recommendation_id: id,
      commenter_id: user.id,
      commenter_name: profile?.name ?? user.email ?? 'Anonymous',
      comment_text: body.trim(),
      rating,
    })
    setBody('')
    setRating(5)
    await load(id)
    setSubmitting(false)
  }

  const avgRating = comments.length
    ? comments.reduce((s, c) => s + c.rating, 0) / comments.length
    : 0

  if (!rec) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      <div className="relative">
        <div className="aspect-video bg-white/5 overflow-hidden">
          {rec.image_url ? (
            <img src={rec.image_url} alt={rec.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">
              {categoryEmoji(rec.category)}
            </div>
          )}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white rounded-full w-9 h-9 flex items-center justify-center"
        >
          ←
        </button>
      </div>

      <div className="px-4 py-4 space-y-5">
        <div className="space-y-1">
          <div className="flex items-start gap-2">
            <h1 className="text-white text-xl font-bold flex-1">{rec.name}</h1>
            <span className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium ${categoryStyles[rec.category]}`}>
              {rec.category}
            </span>
          </div>
          <p className="text-slate-400 text-sm">{t('by')} {rec.recommender_name}</p>
          {avgRating > 0 && (
            <div className="flex items-center gap-2">
              <StarDisplay rating={avgRating} size="sm" />
              <span className="text-slate-400 text-xs">{avgRating.toFixed(1)} / 5</span>
            </div>
          )}
        </div>

        {rec.website_link && (
          <a
            href={rec.website_link}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-accent inline-flex items-center gap-2 text-sm"
          >
            🔗 {t('externalLink')}
          </a>
        )}

        {rec.description && (
          <div>
            <h2 className="text-slate-400 text-xs uppercase tracking-wide mb-1">{t('description')}</h2>
            <p className="text-white text-sm leading-relaxed">{rec.description}</p>
          </div>
        )}

        <div>
          <h2 className="text-slate-400 text-xs uppercase tracking-wide mb-3">
            {t('comments')} ({comments.length})
          </h2>
          {comments.length === 0 && (
            <p className="text-slate-500 text-sm">{t('noComments')}</p>
          )}
          <div className="space-y-3">
            {comments.map(c => (
              <div key={c.id} className="card-surface p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-bold">
                      {c.commenter_name[0]?.toUpperCase()}
                    </span>
                    <span className="text-white text-sm font-medium">{c.commenter_name}</span>
                  </div>
                  <StarDisplay rating={c.rating} size="sm" />
                </div>
                {c.comment_text && <p className="text-slate-300 text-sm">{c.comment_text}</p>}
                <p className="text-slate-500 text-xs">{new Date(c.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>

        {user && (
          <form onSubmit={submitComment} className="space-y-3 pt-2">
            <h2 className="text-slate-400 text-xs uppercase tracking-wide">{t('addComment')}</h2>
            <div className="space-y-1">
              <p className="text-slate-400 text-xs">{t('yourRating')}</p>
              <StarPicker value={rating} onChange={setRating} />
            </div>
            <textarea
              className="input-base resize-none"
              rows={3}
              placeholder={t('commentPlaceholder')}
              value={body}
              onChange={e => setBody(e.target.value)}
            />
            <button type="submit" disabled={submitting || !body.trim()} className="btn-accent w-full disabled:opacity-50">
              {submitting ? t('submitting') : t('submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function categoryEmoji(cat: Recommendation['category']) {
  return { Book: '📚', Movie: '🎬', Series: '📺', Activity: '🏃', Other: '✨' }[cat]
}
