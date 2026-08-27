import type { LibraryState } from '../hooks/useLibrary';
import LibraryMenu from './LibraryMenu';
import ThemeSwitch from './ThemeSwitch';

interface Props {
  lib: LibraryState;
  onHome: () => void;
}

function TopBar({ lib, onHome }: Props) {
  return (
    <header className="topbar">
      <button type="button" className="brand" onClick={onHome} aria-label="All albums">
        <span className="logo" aria-hidden="true" />
        <span className="brand-name">
          Photo <span className="grad-text">album.</span>
        </span>
      </button>
      <div className="topbar-right">
        {lib.status === 'ready' && <LibraryMenu lib={lib} />}
        <ThemeSwitch />
      </div>
    </header>
  );
}

export default TopBar;
