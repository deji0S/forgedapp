import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Home' },
  { to: '/workouts', label: 'Workouts' },
  { to: '/progress', label: 'Progress' },
  { to: '/connect', label: 'Connect' },
  { to: '/messages', label: 'Messages' },
  { to: '/profile', label: 'Fitness Profile' },
]

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-neutral-800 bg-black/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="flex">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-3 text-center text-xs font-medium leading-tight ${
                  isActive ? 'text-white' : 'text-neutral-400'
                }`
              }
            >
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default BottomNav
