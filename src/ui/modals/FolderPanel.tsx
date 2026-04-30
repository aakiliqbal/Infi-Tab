import { type ResolvedFolder } from "../../domain/tabOperations";
import { type Shortcut } from "../../domain/tabState";
import { ShortcutIcon } from "../ShortcutIcon";

type FolderPanelProps = {
  activeFolder: ResolvedFolder;
  onClose: () => void;
  onEditFolder: (folder: ResolvedFolder) => void;
  onEditShortcut: (shortcut: Shortcut) => void;
  onOpenNewShortcutDialog: () => void;
};

export function FolderPanel({
  activeFolder,
  onClose,
  onEditFolder,
  onEditShortcut,
  onOpenNewShortcutDialog
}: FolderPanelProps) {
  return (
    <div
      className="folder-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="folder-panel" role="dialog" aria-modal="true" aria-labelledby="folder-panel-title">
        <div className="folder-header">
          <div>
            <h1 id="folder-panel-title">{activeFolder.title}</h1>
            <span>{activeFolder.shortcuts.length} shortcuts</span>
          </div>
          <div className="folder-actions">
            <button className="secondary-button" type="button" onClick={() => onEditFolder(activeFolder)}>
              Edit
            </button>
            <button className="modal-close" type="button" onClick={onClose} aria-label="Close">
              x
            </button>
          </div>
        </div>

        <div className="folder-grid">
          {activeFolder.shortcuts.map((shortcut) => (
            <a className="quick-link folder-item" href={shortcut.url} key={shortcut.id}>
              <ShortcutIcon shortcut={shortcut} />
              <span className="quick-link-title">{shortcut.title}</span>
              <button
                className="quick-link-edit"
                type="button"
                aria-label={`Edit ${shortcut.title}`}
                onClick={(event) => {
                  event.preventDefault();
                  onEditShortcut(shortcut);
                }}
              >
                Edit
              </button>
            </a>
          ))}

          <button className="quick-link add-link" type="button" onClick={onOpenNewShortcutDialog}>
            <span className="quick-link-icon add-link-icon" aria-hidden="true">
              +
            </span>
            <span className="quick-link-title">Add</span>
          </button>
        </div>
      </section>
    </div>
  );
}
