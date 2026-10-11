import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Brand from './Brand.jsx'

const TABS = [
  ['setup', 'Practice'],
  ['progress', 'Progress'],
  ['about', 'About'],
  ['credits', 'Credits'],
  ['settings', 'Settings'],
]

// Header for the tab pages: logo on the left, account controls on the right, tabs in a dock at the bottom.
export default function TopNav({ tab, onTab, user, onAuth, onLogOut }) {
  // The active-tab underline is one element that slides to the selected tab.
  const refs = useRef({})
  const [bar, setBar] = useState(null)
  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[tab]
      if (el) setBar({ left: el.offsetLeft, width: el.offsetWidth })
    }
    measure()
    // Re-measure when the dock changes size (window resize, fonts loading).
    const ro = new ResizeObserver(measure)
    const dock = refs.current[tab]?.parentElement
    if (dock) ro.observe(dock)
    return () => ro.disconnect()
  }, [tab])

  return (
    <nav className="topnav">
      <div className="row nav-left">
        <Brand onClick={() => onTab('setup')} />
      </div>
      {/* Tabs float in a small dock above the bottom of the page. Rendered on <body> so the
          large-screen zoom on .setup doesn't shift a fixed element off screen. */}
      {createPortal(
        <div className="dock">
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
        </div>,
        document.body,
      )}
      <div className="row nav-right">
        {/* Keyed on the account so logging in or out swaps the controls with an animation */}
        <div key={user?.email || 'guest'} className="row acct-swap">
          {user ? (
            <>
              <span className="acct-badge" aria-hidden="true">
                {user.email[0].toUpperCase()}
              </span>
              <span className="tiny muted hide-sm">
                <b className="plain">{user.email}</b>
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
      </div>
    </nav>
  )
}
