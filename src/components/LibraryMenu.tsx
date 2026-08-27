import { useEffect, useRef, useState } from 'react';
import type { LibraryState } from '../hooks/useLibrary';
import Icon from './Icon';

interface Props {
  lib: LibraryState;
}

/** Private / shared switcher plus the space actions (open, create, forget). */
function LibraryMenu({ lib }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const sharedLabel = lib.shared?.name ?? 'Shared';
  const act = (fn: () => Promise<void>) => {
    setOpen(false);
    void fn();
  };

  return (
    <div className="libmenu" ref={ref}>
      <div className="segmented" role="tablist" aria-label="Library">
        <button
          type="button"
          role="tab"
          aria-selected={lib.active === 'private'}
          className={lib.active === 'private' ? 'on' : ''}
          onClick={() => lib.select('private')}
        >
          <Icon name="lock" size={14} /> Private
        </button>
        {lib.shared && (
          <button
            type="button"
            role="tab"
            aria-selected={lib.active === 'shared'}
            className={lib.active === 'shared' ? 'on' : ''}
            onClick={() => lib.select('shared')}
            title={sharedLabel}
          >
            <Icon name="users" size={14} /> <span className="trunc">{sharedLabel}</span>
            {lib.shared.mode === 'ro' && <span className="pill">read-only</span>}
          </button>
        )}
      </div>
      <button
        type="button"
        className="btn btn-ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={lib.busy}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="users" size={16} /> <span className="hide-sm">Share</span>
      </button>
      {open && (
        <div className="popover" role="menu">
          <p className="muted small">
            A shared space is a folder several people can write to. Invite family from the
            Spaces page on immediately.run — the app itself cannot send invites.
          </p>
          <button type="button" role="menuitem" onClick={() => act(lib.createShared)}>
            <Icon name="plus" size={16} /> Create a shared space
          </button>
          <button type="button" role="menuitem" onClick={() => act(lib.openShared)}>
            <Icon name="folder" size={16} /> Open a shared space…
          </button>
          {lib.shared && (
            <button type="button" role="menuitem" className="danger" onClick={() => act(lib.forgetShared)}>
              <Icon name="close" size={16} /> Forget “{sharedLabel}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default LibraryMenu;
