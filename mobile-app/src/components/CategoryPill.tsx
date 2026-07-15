import type { Recommendation } from '@/types'

type Category = Recommendation['category'] | 'All'

const styles: Record<Category, string> = {
  All:      'bg-white/10 text-white',
  Book:     'bg-amber-700/40 text-amber-300',
  Movie:    'bg-blue-700/40 text-blue-300',
  Series:   'bg-purple-700/40 text-purple-300',
  Activity: 'bg-green-700/40 text-green-300',
  Other:    'bg-slate-700/40 text-slate-300',
}

interface Props {
  category: Category
  label: string
  active?: boolean
  onClick?: () => void
}

export default function CategoryPill({ category, label, active, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all
        ${styles[category]}
        ${active ? 'ring-2 ring-accent ring-offset-1 ring-offset-bg' : 'opacity-70 hover:opacity-100'}
      `}
    >
      {label}
    </button>
  )
}

export { styles as categoryStyles }
