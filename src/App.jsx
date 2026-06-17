import { useEffect } from 'react';
import Admin from './pages/Admin.jsx';
import Overlay from './pages/Overlay.jsx';
import { TournamentProvider } from './state/TournamentContext.jsx';

export default function App() {
  const path = window.location.pathname.toLowerCase();
  const isAdmin = path.startsWith('/admin');

  useEffect(() => {
    document.body.classList.toggle('admin-page', isAdmin);
    document.body.classList.toggle('overlay-page', !isAdmin);
  }, [isAdmin]);

  return (
    <TournamentProvider>
      {isAdmin ? <Admin /> : <Overlay />}
    </TournamentProvider>
  );
}
