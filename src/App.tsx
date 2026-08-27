// Root component — immediately.run renders the default export of THIS file.
// Global CSS is imported here (not in main.tsx) because immediately.run's
// runtime never loads main.tsx; anything the rendered tree needs must be
// reachable from App.tsx.
import './index.css';
import './App.css';
import { useState } from 'react';
import { useAuth } from '@immediately-run/sdk/auth';
import AlbumList from './components/AlbumList';
import AlbumView from './components/AlbumView';
import Notice from './components/Notice';
import TopBar from './components/TopBar';
import { useLibrary } from './hooks/useLibrary';

interface Nav {
  /** The store root this album belongs to — switching libraries drops the view. */
  root: string;
  albumId: string;
}

function App() {
  const lib = useLibrary();
  const auth = useAuth();
  const [nav, setNav] = useState<Nav | null>(null);

  // Stage apps get no login from the host; fall back to the name in the private config.
  const me = auth.user?.login || lib.name;
  const by = me || 'someone';
  const store = lib.store;
  const live = lib.active === 'shared';
  const showBy = live;
  const current = nav && store && nav.root === store.root ? nav : null;

  return (
    <div className="app">
      <TopBar lib={lib} onHome={() => setNav(null)} />
      <Notice text={lib.notice} onDismiss={lib.dismissNotice} />
      <main className="wrap">
        {lib.status === 'booting' && <p className="muted">Opening your library…</p>}
        {lib.status === 'error' && <p className="error">{lib.error}</p>}
        {lib.status === 'ready' && store && (
          current ? (
            <AlbumView
              key={`${store.root}:${current.albumId}`}
              store={store}
              albumId={current.albumId}
              readOnly={lib.readOnly}
              live={live}
              me={me}
              by={by}
              showBy={showBy}
              onBack={() => setNav(null)}
            />
          ) : (
            <AlbumList
              key={store.root}
              store={store}
              readOnly={lib.readOnly}
              live={live}
              me={me}
              by={by}
              showBy={showBy}
              onOpen={(albumId) => setNav({ root: store.root, albumId })}
            />
          )
        )}
      </main>
      <footer className="foot muted small">
        {live
          ? 'Everyone in this space sees the same folders. New photos from others show up within a few seconds.'
          : 'Private albums live in your own folder on immediately.run — nothing leaves the platform.'}
      </footer>
    </div>
  );
}

export default App;
