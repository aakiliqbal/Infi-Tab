import type { FormEvent } from "react";
import { type BrandIcon } from "../../domain/brandIcons";
import { type QuickLinkDraft } from "../model/drafts";

type QuickLinkModalProps = {
  draft: QuickLinkDraft;
  iconRecommendations: BrandIcon[];
  onApplyRecommendedIcon: (icon: BrandIcon) => void;
  onChangeDraft: (draft: QuickLinkDraft) => void;
  onClose: () => void;
  onDelete: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onUploadIcon: (file: File | null) => void;
};

export function QuickLinkModal({
  draft,
  iconRecommendations,
  onApplyRecommendedIcon,
  onChangeDraft,
  onClose,
  onDelete,
  onSave,
  onUploadIcon
}: QuickLinkModalProps) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="quick-link-modal" role="dialog" aria-modal="true" aria-labelledby="quick-link-title">
        <div className="modal-header">
          <h1 id="quick-link-title">{draft.id ? "Edit shortcut" : "Add shortcut"}</h1>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close">
            x
          </button>
        </div>

        <form className="quick-link-form" onSubmit={onSave}>
          <label>
            <span>Title</span>
            <input
              autoFocus
              value={draft.title}
              onChange={(event) => onChangeDraft({ ...draft, title: event.target.value })}
              required
            />
          </label>

          <label>
            <span>URL</span>
            <input
              inputMode="url"
              placeholder="https://example.com"
              value={draft.url}
              onChange={(event) => onChangeDraft({ ...draft, url: event.target.value })}
              required
            />
          </label>

          <div className="form-row">
            <label>
              <span>Icon label</span>
              <input
                maxLength={2}
                value={draft.iconLabel}
                onChange={(event) => onChangeDraft({ ...draft, iconLabel: event.target.value })}
              />
            </label>

            <label>
              <span>Icon color</span>
              <input
                className="color-input"
                type="color"
                value={draft.iconBackground}
                onChange={(event) => onChangeDraft({ ...draft, iconBackground: event.target.value })}
              />
            </label>
          </div>

          {iconRecommendations.length > 0 ? (
            <div className="recommended-icons" aria-label="Recommended icons">
              <span>Recommended icons</span>
              <div className="recommended-icon-row">
                {iconRecommendations.map((icon) => (
                  <button
                    className={draft.brandIconId === icon.id ? "selected" : ""}
                    type="button"
                    key={icon.id}
                    onClick={() => onApplyRecommendedIcon(icon)}
                    aria-label={`Use ${icon.title} icon`}
                    title={icon.title}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d={icon.path} />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="form-preview">
            <span
              className={`quick-link-icon ${draft.iconImageDataUrl ? "image-icon" : ""}`}
              style={{ backgroundColor: draft.iconBackground }}
              aria-hidden="true"
            >
              {draft.iconImageDataUrl ? (
                <img src={draft.iconImageDataUrl} alt="" />
              ) : (
                (draft.iconLabel || draft.title.slice(0, 1) || "?").slice(0, 2).toUpperCase()
              )}
            </span>
          </div>

          <div className="icon-image-actions">
            <label className="secondary-button file-button">
              Upload icon image
              <input
                accept="image/*"
                type="file"
                onChange={(event) => {
                  onUploadIcon(event.target.files?.[0] ?? null);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>

          <div className="modal-actions">
            {draft.id ? (
              <button className="danger-button" type="button" onClick={onDelete}>
                Delete
              </button>
            ) : null}
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" type="submit">
              Save
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
