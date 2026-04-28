# Infi Tab

A local-first Chrome new tab extension inspired by Infinity New Tab Pro.

## MVP scope

- Chrome Manifest V3 new tab override
- Quick-link add, edit, delete, and drag reorder
- Folder tiles with modal folder contents
- User-uploaded wallpaper, including GIFs
- Search provider and search-box customization
- Layout customization
- Full JSON export/import backup with replace-only restore

## Development

For implementation details and current architecture notes, see
[docs/development.md](docs/development.md).

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:5173/
```

## Load in Chrome

Build the extension:

```bash
npm run build
```

Then:

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/` directory

After each new build, click the extension card's reload button in `chrome://extensions/`.

## Releases

Releases are manual. When you intentionally want a new version:

1. Update `package.json` and `public/manifest.json` to the same version.
2. Commit the version change.
3. Run the `Release` workflow from GitHub Actions.

The workflow builds the extension, creates a `vX.Y.Z` GitHub release from the
current version, generates release notes from commits since the previous tag,
and attaches a zipped `dist/` package to the release.
