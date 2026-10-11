import Brand from './Brand.jsx'

// Header for the setup and credits pages: tabs on the left, profile on the right.
export default function TopNav({ tab, onTab, profile, onSignIn, onSignOut }) {
  return (
    <nav className="topnav">
      <div className="row nav-left">
        <Brand />
        <div className="tabs" role="tablist">
          {[
            ['setup', 'Practice'],
            ['credits', 'Credits'],
          ].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => onTab(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="row nav-right">
        {profile ? (
          <>
            <span className="tiny muted hide-sm">
              Signed in as <b className="plain">{profile.name}</b>
            </span>
            <button className="btn ghost sm" onClick={onSignOut}>
              Sign out
            </button>
          </>
        ) : (
          <button className="btn ghost sm" onClick={onSignIn}>
            Create profile
          </button>
        )}
      </div>
    </nav>
  )
}
