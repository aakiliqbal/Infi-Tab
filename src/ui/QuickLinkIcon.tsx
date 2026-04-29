import { brandIcons } from "../domain/brandIcons";
import type { QuickLink } from "../domain/tabState";

export function QuickLinkIcon({ quickLink }: { quickLink: QuickLink }) {
  const brandIcon =
    quickLink.icon.type === "brand" && quickLink.icon.brandIconId
      ? brandIcons[quickLink.icon.brandIconId]
      : null;

  return (
    <span
      className={`quick-link-icon ${quickLink.icon.type === "image" || brandIcon ? "image-icon" : ""}`}
      style={{ backgroundColor: quickLink.icon.background }}
      aria-hidden="true"
    >
      {quickLink.icon.type === "image" && quickLink.icon.imageDataUrl ? (
        <img src={quickLink.icon.imageDataUrl} alt="" />
      ) : brandIcon ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d={brandIcon.path} />
        </svg>
      ) : (
        quickLink.icon.label
      )}
    </span>
  );
}
