import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Recommendation } from '@/types'
import { categoryStyles } from './CategoryPill'
import { useLocale } from '@/hooks/useLocale'

interface Props {
  rec: Recommendation
  commentCount?: number
}

export default function RecommendationCard({ rec, commentCount = 0 }: Props) {
  const navigate = useNavigate()
  const { t } = useLocale()

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(`/recommendations/${rec.id}`)}
      className="card-surface overflow-hidden cursor-pointer active:opacity-90"
    >
      <div className="aspect-[4/3] bg-white/5 overflow-hidden">
        {rec.image_url ? (
          <img
            src={rec.image_url}
            alt={rec.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {categoryEmoji(rec.category)}
          </div>
        )}
      </div>

      <div className="p-3 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2 flex-1">
            {rec.title}
          </h3>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${categoryStyles[rec.category]}`}>
            {rec.category}
          </span>
        </div>

        <p className="text-slate-400 text-xs">
          {t('by')} {rec.recommender}
        </p>

        <p className="text-slate-500 text-xs">
          💬 {commentCount} {t('comments')}
        </p>
      </div>
    </motion.div>
  )
}

function categoryEmoji(cat: Recommendation['category']) {
  return { Book: '📚', Movie: '🎬', Series: '📺', Activity: '🏃', Other: '✨' }[cat]
}
