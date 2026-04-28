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

Releases are manual and automated with Release Please when the `Release`
workflow is run from GitHub Actions.

Use conventional commits so versioning and changelog entries are generated correctly:

```text
feat: add wallpaper controls
fix: persist shortcut icon uploads
chore: update dependencies
```

When you intentionally want a new version, run the `Release` workflow manually.
Release Please opens a release PR that updates `CHANGELOG.md`, `package.json`,
`package-lock.json`, and `public/manifest.json`. After that release PR is
merged, run the `Release` workflow again to create the GitHub release, build the
extension, and attach a zipped `dist/` package to the release.
