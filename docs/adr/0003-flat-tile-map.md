# Flat Tile Map

All Shortcut and Folder records live in a single flat map keyed by ID (`Record<string, Shortcut | Folder>`). Folders reference their children by ID rather than nesting the full Shortcut records. This trades the simplicity of nested containment for constant-cost tile moves — `PROMOTE`, `ADD_TO_FOLDER`, `COMBINE`, and `CROSS_PAGE` drag operations all reduce to ID splices between arrays, never record copies.

## Considered Options

- **Nested model (former approach):** Folders contain a `quickLinks: Shortcut[]` array. Moving a shortcut between a folder and the surface requires cloning/removing the full record. Simpler for reads but expensive and error-prone for the drag-and-drop flows that dominate this feature.
- **Flat map (chosen):** One lookup to resolve any tile regardless of location. Every mutation is an ID splice. Orphan cleanup is needed on delete, but the `resolveDrop()` pure function stays simple.
