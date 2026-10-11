import Brand from './Brand.jsx'

// Header for the setup and credits pages: tabs on the left, account controls on the right.
export default function TopNav({ tab, onTab, user, onAuth, onLogOut }) {
  return (
    <nav className="topnav">
      <div className="row nav-left">
        <Brand />
        <div className="tabs" role="tablist">
          {[
            ['setup', 'Practice'],
            ['about', 'About'],
            ['credits', 'Credits'],
          ].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => onTab(id)}>
              {label}
            </button>
          ))}
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
