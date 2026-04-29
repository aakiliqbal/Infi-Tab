import { useState } from "react";
import { LayoutGrid } from "lucide-react";
import {
  gridLayoutPresets,
  type GridLayoutPresetId,
  type GridLayoutSettings,
  type TabState
} from "../../domain/tabState";

type GridLayoutSettingsSectionProps = {
  changeLayout: <K extends keyof TabState["layout"]>(key: K, value: TabState["layout"][K]) => void;
  tabState: TabState;
};

export function GridLayoutSettingsSection({ changeLayout, tabState }: GridLayoutSettingsSectionProps) {
  const [isCustomizeLayoutOpen, setIsCustomizeLayoutOpen] = useState(false);
  const gridLayout = tabState.layout.gridLayout;

  function changeGridLayout(nextGridLayout: GridLayoutSettings) {
    changeLayout("gridLayout", nextGridLayout);
  }

  function chooseGridLayoutPreset(presetId: GridLayoutPresetId) {
    const preset = gridLayoutPresets[presetId];
    changeGridLayout({
      ...gridLayout,
      mode: "preset",
      presetId,
      rows: preset.rows,
      columns: preset.columns
    });
  }

  function customizeGridLayout(nextValues: Partial<GridLayoutSettings>) {
    changeGridLayout({
      ...gridLayout,
      ...nextValues,
      mode: "custom"
    });
  }

  return (
    <section className="settings-group">
      <h2>Grid Layout</h2>
      <div className="grid-layout-presets" role="radiogroup" aria-label="Grid layout">
        {Object.entries(gridLayoutPresets).map(([presetId, preset]) => (
          <button
            className={gridLayout.mode === "preset" && gridLayout.presetId === presetId ? "active" : ""}
            key={presetId}
            type="button"
            onClick={() => chooseGridLayoutPreset(presetId as GridLayoutPresetId)}
          >
            <span className="grid-layout-preview" aria-hidden="true" />
            <span>{preset.label}</span>
          </button>
        ))}
        <button
          className={gridLayout.mode === "custom" ? "active" : ""}
          type="button"
          onClick={() => setIsCustomizeLayoutOpen(true)}
        >
          <span className="grid-layout-preview custom" aria-hidden="true">
            <LayoutGrid strokeWidth={2.2} />
          </span>
          <span>Customize</span>
        </button>
      </div>
      <label>
        <span>Show labels</span>
        <input
          type="checkbox"
          checked={tabState.layout.showLabels}
          onChange={(event) => changeLayout("showLabels", event.target.checked)}
        />
      </label>

      {isCustomizeLayoutOpen ? (
        <div className="layout-customize-backdrop" role="presentation">
          <section
            className="layout-customize-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="layout-customize-title"
          >
            <button
              className="modal-close"
              type="button"
              onClick={() => setIsCustomizeLayoutOpen(false)}
              aria-label="Close customize layout"
            >
              x
            </button>
            <h2 id="layout-customize-title">Customize layout</h2>
            <label>
              <span>Rows</span>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={gridLayout.rows}
                onChange={(event) => customizeGridLayout({ rows: Number(event.target.value) })}
              />
              <output>{gridLayout.rows}</output>
            </label>
            <label>
              <span>Columns</span>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={gridLayout.columns}
                onChange={(event) => customizeGridLayout({ columns: Number(event.target.value) })}
              />
              <output>{gridLayout.columns}</output>
            </label>
            <label>
              <span>Column spacing</span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={gridLayout.columnSpacing}
                onChange={(event) => customizeGridLayout({ columnSpacing: Number(event.target.value) })}
              />
              <output>{gridLayout.columnSpacing}%</output>
            </label>
            <label>
              <span>Line spacing</span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={gridLayout.lineSpacing}
                onChange={(event) => customizeGridLayout({ lineSpacing: Number(event.target.value) })}
              />
              <output>{gridLayout.lineSpacing}%</output>
            </label>
            <label>
              <span>Icon size</span>
              <input
                type="range"
                min="50"
                max="120"
                step="5"
                value={gridLayout.iconSize}
                onChange={(event) => customizeGridLayout({ iconSize: Number(event.target.value) })}
              />
              <output>{gridLayout.iconSize}%</output>
            </label>
          </section>
        </div>
      ) : null}
    </section>
  );
}
