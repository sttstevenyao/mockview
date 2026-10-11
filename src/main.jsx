import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// No StrictMode: the interview flow drives real audio + mic side effects that
// must run exactly once per mount.
createRoot(document.getElementById('root')).render(<App />)
