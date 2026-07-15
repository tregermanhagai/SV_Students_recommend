import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '@/hooks/useSession'
import { useLocale } from '@/hooks/useLocale'
import type { MovieAIResponse, MovieDict } from '@/types'

const RENDER_BASE = import.meta.env.VITE_RENDER_BASE_URL as string

interface Message {
  role: 'user' | 'assistant'
  text: string
  movie?: MovieDict | null
}

export default function MovieAIPage() {
  const { session } = useSession()
  const { t } = useLocale()
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: t('movieAIWelcome') },
  ])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function ask(e: React.FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q || loading) return
    setQuestion('')
    setMessages(m => [...m, { role: 'user', text: q }])
    setLoading(true)

    try {
      const res = await fetch(`${RENDER_BASE}/api/movie-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ question: q }),
      })
      const data: MovieAIResponse = await res.json()
      setMessages(m => [...m, {
        role: 'assistant',
        text: data.answer ?? 'No answer received.',
        movie: data.movie,
      }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: 'Connection error — please try again.' }])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'user' ? (
                <div className="max-w-[80%] bg-accent text-bg rounded-2xl rounded-br-sm px-4 py-2 text-sm">
                  {msg.text}
                </div>
              ) : (
                <div className="max-w-[92%] space-y-3">
                  <div className="bg-card rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-white leading-relaxed">
                    <MarkdownText text={msg.text} />
                  </div>
                  {msg.movie && <MovieCard movie={msg.movie} t={t} />}
                </div>
              )}
            </motion.div>
          ))}

          {loading && (
            <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-card rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    className="w-2 h-2 bg-slate-400 rounded-full"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input — pb-20 clears the fixed BottomNav */}
      <form onSubmit={ask} className="px-4 pb-20 pt-2 flex gap-2 shrink-0 bg-bg">
        <input
          className="input-base flex-1"
          placeholder={t('movieAIPlaceholder')}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="btn-accent shrink-0 px-4 disabled:opacity-40"
        >
          {t('askAboutMovies')}
        </button>
      </form>
    </div>
  )
}

function MarkdownText({ text }: { text: string }) {
  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '• $1')
    .replace(/\n/g, '<br />')
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

function MovieCard({ movie, t }: { movie: MovieDict; t: (k: any) => string }) {
  return (
    <div className="card-surface overflow-hidden">
      <div className="flex gap-3 p-3">
        {movie.poster_url && (
          <img
            src={movie.poster_url}
            alt={movie.title ?? ''}
            className="w-20 rounded-xl object-cover shrink-0"
          />
        )}
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-white font-semibold text-sm leading-tight">
            {movie.title} {movie.year ? `(${movie.year})` : ''}
          </p>
          {movie.rating && (
            <p className="text-amber-400 text-xs">⭐ {movie.rating.toFixed(1)} / 10</p>
          )}
          {movie.genres?.length && (
            <p className="text-slate-400 text-xs">{movie.genres.join(' · ')}</p>
          )}
          {movie.runtime && (
            <p className="text-slate-400 text-xs">🕐 {movie.runtime} min</p>
          )}
          {movie.directors?.length && (
            <p className="text-slate-400 text-xs">🎬 {movie.directors.join(', ')}</p>
          )}
          {movie.cast?.length && (
            <p className="text-slate-400 text-xs truncate">👥 {movie.cast.slice(0, 3).join(', ')}</p>
          )}
        </div>
      </div>

      {(movie.imdb_url || movie.trailer_url) && (
        <div className="flex gap-2 px-3 pb-3">
          {movie.imdb_url && (
            <a href={movie.imdb_url} target="_blank" rel="noopener noreferrer"
               className="flex-1 text-center text-xs bg-amber-500/20 text-amber-300 rounded-xl py-2 font-medium">
              {t('imdbBtn')}
            </a>
          )}
          {movie.trailer_url && (
            <a href={movie.trailer_url} target="_blank" rel="noopener noreferrer"
               className="flex-1 text-center text-xs bg-red-500/20 text-red-400 rounded-xl py-2 font-medium">
              ▶ {t('trailerBtn')}
            </a>
          )}
        </div>
      )}
    </div>
  )
}
