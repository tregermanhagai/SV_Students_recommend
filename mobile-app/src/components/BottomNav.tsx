import { NavLink } from 'react-router-dom'
import { useLocale } from '@/hooks/useLocale'

const tabs = [
  { to: '/home',     icon: '🏠', key: 'home'            },
  { to: '/add',      icon: '➕', key: 'addRecommendation'},
  { to: '/movie-ai', icon: '🎬', key: 'movieAI'         },
  { to: '/store',    icon: '🛍', key: 'store'           },
  { to: '/profile',  icon: '👤', key: 'profile'         },
] as const

export default function BottomNav() {
  const { t } = useLocale()

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-card border-t border-white/10 flex safe-area-pb"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-xs transition-colors ${
              isActive ? 'text-accent' : 'text-slate-400'
            }`
          }
        >
          <span className="text-xl leading-none">{tab.icon}</span>
          <span>{t(tab.key)}</span>
        </NavLink>
      ))}
    </nav>
  )
}
