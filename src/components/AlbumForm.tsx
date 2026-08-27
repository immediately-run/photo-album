import { useState } from 'react';
import type { FormEvent } from 'react';

interface Props {
  initial?: { title: string; description: string };
  submitLabel: string;
  onSubmit: (v: { title: string; description: string }) => void;
  onCancel: () => void;
}

/** A few typed fields — a form, not an editor. */
function AlbumForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim() });
  };
  return (
    <form className="album-form" onSubmit={submit}>
      <label>
        <span>Title</span>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summer at the lake"
          maxLength={80}
          required
        />
      </label>
      <label>
        <span>Description (optional)</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Two weeks, one canoe, zero fish."
          maxLength={200}
        />
      </label>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export default AlbumForm;
