import { Component, useEffect } from 'react';
import Admin from './pages/Admin.jsx';
import Overlay from './pages/Overlay.jsx';
import Login from './pages/Login.jsx';
import { TournamentProvider } from './state/TournamentContext.jsx';
import { AuthProvider, useAuth } from './state/AuthContext.jsx';

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('[AppErrorBoundary]', error, info.componentStack);
    this.setState({ info });
  }
  render() {
    if (this.state.error) {
      return (
        <main className="auth-page" style={{ padding: '40px', textAlign: 'center' }}>
          <div className="auth-card tech-panel" style={{ maxWidth: 600, margin: '0 auto' }}>
            <p className="eyebrow" style={{ color: 'var(--danger)' }}>Ошибка приложения</p>
            <h2 style={{ color: 'var(--danger)', marginBottom: 16 }}>{this.state.error.message}</h2>
            <pre style={{
              background: 'rgba(0,0,0,0.3)',
              padding: 16,
              borderRadius: 8,
              fontSize: 12,
              textAlign: 'left',
              overflow: 'auto',
              maxHeight: 300,
              color: 'var(--muted)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              {this.state.info?.componentStack || this.state.error.stack || 'No stack available'}
            </pre>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

function overlayUserId() {
  const path = window.location.pathname;
  // /overlay/<userId>
  const parts = path.split('/').filter(Boolean);
  if (parts.length >= 2 && parts[0].toLowerCase() === 'overlay') {
    return parts[1] || null;
  }
  // /overlay (backward compat — no userId)
  if (path.toLowerCase() === '/overlay') return null;
  return null;
}

function AppRouter() {
  const { isAuthenticated, loading } = useAuth();
  const path = window.location.pathname.toLowerCase();
  const isAdmin = path.startsWith('/admin');
  const isOverlay = path.startsWith('/overlay');
  const ovUserId = isOverlay ? overlayUserId() : null;

  useEffect(() => {
    document.body.classList.toggle('admin-page', isAdmin);
    document.body.classList.toggle('overlay-page', isOverlay);
  }, [isAdmin, isOverlay]);

  // Overlay is always public
  if (isOverlay) {
    if (!ovUserId) {
      return (
        <main className="auth-page" style={{ textAlign: 'center', paddingTop: '20vh' }}>
          <p className="eyebrow">Турнирный оверлей</p>
          <h1>AR Overlay</h1>
          <p style={{ color: 'var(--muted)', fontFamily: 'var(--display-font)', maxWidth: 500, margin: '20px auto', lineHeight: 1.6 }}>
            Укажите ID турнира в адресной строке.
          </p>
          <p style={{ color: 'var(--cyan)', fontFamily: 'monospace', fontSize: 13 }}>
            /overlay/<span style={{ opacity: 0.5 }}>ваш-id-турнира</span>
          </p>
        </main>
      );
    }
    return (
      <TournamentProvider overlayUserId={ovUserId}>
        <Overlay userId={ovUserId} />
      </TournamentProvider>
    );
  }

  // Loading — show nothing (or a subtle loader)
  if (loading) {
    return (
      <main className="auth-page">
        <p style={{ color: 'var(--muted)', fontFamily: 'var(--display-font)' }}>
          Загрузка…
        </p>
      </main>
    );
  }

  // Admin route — require auth
  if (isAdmin) {
    if (!isAuthenticated) {
      return <Login />;
    }
    return (
      <TournamentProvider>
        <Admin />
      </TournamentProvider>
    );
  }

  // Root path — redirect to admin (will show login if not authenticated)
  if (!isAuthenticated) {
    return <Login />;
  }
  return (
    <TournamentProvider>
      <Admin />
    </TournamentProvider>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
