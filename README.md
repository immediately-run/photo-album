# Photo album

Albums that are just folders of pictures. Keep them private, or share a space
with family so everyone can drop photos into the same albums.

**Try it:** <https://immediately.run/present/github/immediately-run/photo-album/main/files/src/App.tsx>

## What it does

- **Albums** with a title, description and a cover photo.
- **Upload** with a file picker or by dragging pictures onto the album. Every
  image is downscaled in the browser on a `<canvas>` to at most 1600 px on the
  long edge (JPEG q0.85; PNGs that really use transparency stay PNG) and a
  320 px thumbnail is written alongside — so a phone photo costs ~300 KB in the
  space instead of 5 MB. Per-file progress is shown while it happens.
- **Grid** of thumbnails (3 columns on phones, 5–6 on desktop; panoramas span
  two cells), a **lightbox** with swipe / arrow-key navigation, caption editing,
  delete, "set as cover" and download, and an auto-advancing **slideshow**.
- **Private** albums work with zero prompts. **Shared** albums live in an
  immediately.run space: create one from the *Share* menu or open a space that
  was shared with you. The app remembers the space and reopens it on the next
  visit. Each photo shows who added it; a read-only grant hides upload and
  delete.

## How data is stored

Everything is plain files on the immediately.run filesystem — no database. One
file per photo and per caption, so several family members can add and caption
photos at the same time without overwriting each other:

```
<root>/albums/<albumId>/album.json          title, description, cover, created, by
<root>/albums/<albumId>/photos/<photoId>.jpg|png   the (downscaled) picture
<root>/albums/<albumId>/thumbs/<photoId>.jpg       320 px thumbnail
<root>/albums/<albumId>/meta/<photoId>.json        caption, taken/added, by, size…
```

`<root>` is the app's private settings folder for private albums, or the
shared space's root for shared ones. The remembered space id lives in
`<private>/config.json`.

## Multi-user notes

- Invite people to a shared space from the **Spaces** page on immediately.run;
  the app cannot send invites itself.
- The platform delivers no change events for other members' writes, so an open
  album polls its `photos/` and `meta/` folders every 4 s. New photos from
  someone else show up within a few seconds.
- Deleting a photo removes its meta file first, so a half-deleted photo drops
  out of everyone's grid immediately.
- The "taken" date is the picture file's modification time (no EXIF parsing);
  the grid is sorted by it.

## Local development

```bash
npm install
npm run dev      # vite dev; files persist under ./devfs-playground (git-ignored)
npm run build    # tsc + vite build
npm run lint
```

Under `vite dev` there is no host, so "shared" just maps to a second local
folder — useful for exercising the UI, not for real multi-user behaviour. To run
against the real platform with no commit:

```bash
immediately.run dev . --origin https://local.immediately.run --json
```

## Licence

MIT — see [LICENSE](./LICENSE).
