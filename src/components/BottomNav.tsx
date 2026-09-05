import { NavLink, useLocation } from 'react-router-dom'

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M12 3 2 12h3v8h6v-5h2v5h6v-8h3L12 3Z" />
    </svg>
  )
}

function WorkoutsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" />
    </svg>
  )
}

function ProgressIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M4 20h2v-6H4v6Zm7 0h2V4h-2v16Zm7 0h2v-10h-2v10Z" />
    </svg>
  )
}

function ConnectIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M10 4a6 6 0 1 0 3.76 10.66l4.79 4.79 1.41-1.41-4.79-4.79A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
    </svg>
  )
}

function MessagesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2c0-2.76-3.58-5-8-5Z" />
    </svg>
  )
}

const TABS = [
  { to: '/', label: 'Home', Icon: HomeIcon },
  { to: '/workouts', label: 'Workouts', Icon: WorkoutsIcon },
  { to: '/progress', label: 'Progress', Icon: ProgressIcon },
  { to: '/connect', label: 'Connect', Icon: ConnectIcon },
  { to: '/messages', label: 'Messages', Icon: MessagesIcon },
  { to: '/profile', label: 'Profile', Icon: ProfileIcon },
]

// Same "is this tab active" rule NavLink's `end` prop uses, duplicated here
// so the sliding indicator (which needs a plain index, not a per-link
// render callback) agrees with what each NavLink actually highlights.
function isTabActive(pathname: string, to: string) {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`)
}

function BottomNav() {
  const { pathname } = useLocation()
  const activeIndex = TABS.findIndex((tab) => isTabActive(pathname, tab.to))
  const tabWidthPct = 100 / TABS.length

  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-black/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="relative flex">
        {/* Sliding pill behind the active tab -- position/width are simple
            percentages since every tab is an equal-width flex-1 item, so no
            DOM measurement is needed to keep it aligned. */}
        {activeIndex >= 0 && (
          <li
            aria-hidden
            className="pointer-events-none absolute inset-y-1.5 mx-1.5 rounded-xl bg-neutral-100 transition-[left] duration-300 ease-out dark:bg-neutral-900"
            style={{ left: `${activeIndex * tabWidthPct}%`, width: `calc(${tabWidthPct}% - 12px)` }}
          />
        )}
        {TABS.map((tab) => (
          <li key={tab.to} className="relative flex-1">
            <NavLink
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `pressable flex flex-col items-center gap-1 py-3 text-center text-xs font-medium leading-tight transition-colors duration-200 ${
                  isActive ? 'text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400'
                }`
              }
            >
              <tab.Icon />
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default BottomNav
