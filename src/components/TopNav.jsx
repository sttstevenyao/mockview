import { useLayoutEffect, useRef, useState } from 'react'
import Brand from './Brand.jsx'

const TABS = [
  ['setup', 'Practice'],
  ['about', 'About'],
  ['credits', 'Credits'],
  ['settings', 'Settings'],
]

// Header for the setup and credits pages: tabs on the left, account controls on the right.
export default function TopNav({ tab, onTab, user, onAuth, onLogOut }) {
  // The active-tab underline is one element that slides to the selected tab.
  const refs = useRef({})
  const [bar, setBar] = useState(null)
  useLayoutEffect(() => {
    const el = refs.current[tab]
    if (el) setBar({ left: el.offsetLeft, width: el.offsetWidth })
  }, [tab])

  return (
    <nav className="topnav">
      <div className="row nav-left">
        <Brand onClick={() => onTab('setup')} />
        <div className="tabs" role="tablist">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              ref={(el) => (refs.current[id] = el)}
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? 'on' : ''}
              onClick={() => onTab(id)}
            >
              {label}
            </button>
          ))}
          {bar && <i className="tab-bar" style={{ transform: `translateX(${bar.left}px)`, width: bar.width }} />}
        </div>
      </div>
      <div className="row nav-right">
        {user ? (
          <>
            <span className="tiny muted hide-sm">
              Signed in as <b className="plain">{user.username}</b>
            </span>
            <button className="btn ghost sm" onClick={onLogOut}>
              Log out
            </button>
          </>
        ) : (
          <>
            <button className="btn ghost sm" onClick={() => onAuth('login')}>
              Log in
            </button>
            <button className="btn primary sm" onClick={() => onAuth('signup')}>
              Sign up
            </button>
          </>
        )}
      </div>
    </nav>
  )
}
