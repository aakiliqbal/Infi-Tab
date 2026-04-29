import { type Folder, type QuickLink } from "../../domain/tabState";
import { QuickLinkIcon } from "../QuickLinkIcon";

type FolderPanelProps = {
  activeFolder: Folder;
  onClose: () => void;
  onEditFolder: (folder: Folder) => void;
  onEditQuickLink: (quickLink: QuickLink) => void;
  onOpenNewQuickLinkDialog: () => void;
};

export function FolderPanel({
  activeFolder,
  onClose,
  onEditFolder,
  onEditQuickLink,
  onOpenNewQuickLinkDialog
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
            <span>{activeFolder.quickLinks.length} shortcuts</span>
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
          {activeFolder.quickLinks.map((quickLink) => (
            <a className="quick-link folder-item" href={quickLink.url} key={quickLink.id}>
              <QuickLinkIcon quickLink={quickLink} />
              <span className="quick-link-title">{quickLink.title}</span>
              <button
                className="quick-link-edit"
                type="button"
                aria-label={`Edit ${quickLink.title}`}
                onClick={(event) => {
                  event.preventDefault();
                  onEditQuickLink(quickLink);
                }}
              >
                Edit
              </button>
            </a>
          ))}

          <button className="quick-link add-link" type="button" onClick={onOpenNewQuickLinkDialog}>
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
