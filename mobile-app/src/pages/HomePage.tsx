import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/hooks/useLocale'
import RecommendationCard from '@/components/RecommendationCard'
import CategoryPill from '@/components/CategoryPill'
import type { Recommendation } from '@/types'

type Category = Recommendation['category'] | 'All'
const CATEGORIES: Category[] = ['All', 'Book', 'Movie', 'Series', 'Activity', 'Other']

const CAT_LABEL_KEY: Record<Category, Parameters<ReturnType<typeof useLocale>['t']>[0]> = {
  All: 'allCategories', Book: 'book', Movie: 'movie',
  Series: 'series', Activity: 'activity', Other: 'other',
}

export default function HomePage() {
  const { t } = useLocale()
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [filter, setFilter] = useState<Category>('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadFeed() }, [])

  async function loadFeed() {
    setLoading(true)
    const { data } = await supabase
      .from('recommendations')
      .select('*')
      .order('created_at', { ascending: false })
    setRecs(data ?? [])

    if (data?.length) {
      const ids = data.map(r => r.id)
      const { data: commentRows } = await supabase
        .from('comments')
        .select('recommendation_id')
        .in('recommendation_id', ids)
      const c: Record<string, number> = {}
      for (const row of commentRows ?? []) {
        c[row.recommendation_id] = (c[row.recommendation_id] ?? 0) + 1
      }
      setCounts(c)
    }
    setLoading(false)
  }

  const visible = filter === 'All' ? recs : recs.filter(r => r.category === filter)

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide shrink-0">
        {CATEGORIES.map(cat => (
          <CategoryPill
            key={cat}
            category={cat}
            label={t(CAT_LABEL_KEY[cat])}
            active={filter === cat}
            onClick={() => setFilter(cat)}
          />
        ))}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <p className="text-slate-400 text-center py-12">{t('loadingFeed')}</p>
        ) : visible.length === 0 ? (
          <p className="text-slate-400 text-center py-12">{t('noRecommendations')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {visible.map(rec => (
              <RecommendationCard key={rec.id} rec={rec} commentCount={counts[rec.id] ?? 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
