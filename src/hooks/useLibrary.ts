// Boot + "which library am I looking at" state. Two libraries: the private one
// (settings mount, zero prompts) and at most one remembered shared space.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createSharedStore,
  openPrivateStore,
  openRememberedSpace,
  pickSharedStore,
  readJson,
  writeJson,
  type Store,
} from '../lib/store';

export type LibraryKey = 'private' | 'shared';

interface Config {
  spaceId?: string;
  spaceName?: string;
  library?: LibraryKey;
  /** Shown next to your photos when the host exposes no login (stage apps). */
  displayName?: string;
}

export interface LibraryState {
  status: 'booting' | 'ready' | 'error';
  error: string | null;
  priv: Store | null;
  shared: Store | null;
  active: LibraryKey;
  /** The store currently shown. */
  store: Store | null;
  readOnly: boolean;
  busy: boolean;
  notice: string | null;
  /** Display name from the private config ('' when unset). */
  name: string;
  setName: (name: string) => void;
  select: (key: LibraryKey) => void;
  openShared: () => Promise<void>;
  createShared: () => Promise<void>;
  forgetShared: () => Promise<void>;
  dismissNotice: () => void;
}

const configPath = (priv: Store) => `${priv.root}/config.json`;

function describeError(e: unknown): string {
  const code = (e as { code?: string } | null)?.code;
  if (code === 'cancelled') return 'Cancelled — nothing changed.';
  if (code === 'forbidden') return 'The host did not allow that.';
  if (code === 'auth-required') return 'Sign in on immediately.run to use shared spaces.';
  const msg = (e as { message?: string } | null)?.message;
  return msg ? `Something went wrong: ${msg}` : 'Something went wrong.';
}

export function useLibrary(): LibraryState {
  const [status, setStatus] = useState<LibraryState['status']>('booting');
  const [error, setError] = useState<string | null>(null);
  const [priv, setPriv] = useState<Store | null>(null);
  const [shared, setShared] = useState<Store | null>(null);
  const [active, setActive] = useState<LibraryKey>('private');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setNameState] = useState('');
  const cfgRef = useRef<Config>({});

  useEffect(() => {
    // React StrictMode runs this twice in dev: the flag makes the first run inert.
    let cancelled = false;
    (async () => {
      try {
        const p = await openPrivateStore('data');
        if (cancelled) return;
        const cfg = await readJson<Config>(configPath(p), {});
        if (cancelled) return;
        cfgRef.current = cfg;
        setNameState(cfg.displayName ?? '');
        let s: Store | null = null;
        if (cfg.spaceId) {
          s = await openRememberedSpace(cfg.spaceId);
          if (cancelled) return;
          if (s && !s.name && cfg.spaceName) s = { ...s, name: cfg.spaceName };
        }
        setPriv(p);
        setShared(s);
        setActive(s && cfg.library === 'shared' ? 'shared' : 'private');
        if (cfg.spaceId && !s) {
          setNotice('The shared space could not be reopened — open it again from "Shared".');
        }
        setStatus('ready');
      } catch (e) {
        if (cancelled) return;
        setError(describeError(e));
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Merge `patch` into the stored config (an explicit `undefined` clears a key). */
  const persist = useCallback(
    async (patch: Config) => {
      const next = { ...cfgRef.current, ...patch };
      cfgRef.current = next;
      if (!priv || priv.mode === 'ro') return;
      try {
        await writeJson(configPath(priv), next);
      } catch {
        /* config is a convenience; the session still works */
      }
    },
    [priv],
  );

  const select = useCallback(
    (key: LibraryKey) => {
      setActive(key);
      void persist({ spaceId: shared?.spaceId, spaceName: shared?.name, library: key });
    },
    [persist, shared],
  );

  const adopt = useCallback(
    async (s: Store) => {
      setShared(s);
      setActive('shared');
      await persist({ spaceId: s.spaceId, spaceName: s.name, library: 'shared' });
    },
    [persist],
  );

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setNotice(describeError(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const openShared = useCallback(() => run(async () => adopt(await pickSharedStore())), [run, adopt]);
  const createShared = useCallback(
    () => run(async () => adopt(await createSharedStore('Photos'))),
    [run, adopt],
  );
  const forgetShared = useCallback(
    () =>
      run(async () => {
        setShared(null);
        setActive('private');
        await persist({ spaceId: undefined, spaceName: undefined, library: 'private' });
      }),
    [run, persist],
  );

  const setName = useCallback(
    (n: string) => {
      const v = n.trim().slice(0, 40);
      setNameState(v);
      void persist({ displayName: v || undefined });
    },
    [persist],
  );

  const store = active === 'shared' ? shared : priv;
  return {
    status,
    error,
    priv,
    shared,
    active,
    store,
    readOnly: !store || store.mode === 'ro',
    busy,
    notice,
    name,
    setName,
    select,
    openShared,
    createShared,
    forgetShared,
    dismissNotice: () => setNotice(null),
  };
}
