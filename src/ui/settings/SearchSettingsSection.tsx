import { searchProviders, type SearchProviderId, type TabState } from "../../domain/tabState";

type SearchSettingsSectionProps = {
  changeLayout: <K extends keyof TabState["layout"]>(key: K, value: TabState["layout"][K]) => void;
  changeSearchProvider: (providerId: SearchProviderId) => void;
  tabState: TabState;
};

export function SearchSettingsSection({
  changeLayout,
  changeSearchProvider,
  tabState
}: SearchSettingsSectionProps) {
  return (
    <section className="settings-group">
      <h2>Search</h2>
      <label>
        <span>Provider</span>
        <select
          value={tabState.searchProvider}
          onChange={(event) => changeSearchProvider(event.target.value as SearchProviderId)}
        >
          {Object.entries(searchProviders).map(([id, provider]) => (
            <option value={id} key={id}>
              {provider.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Hide search box</span>
        <input
          type="checkbox"
          checked={tabState.layout.hideSearchBox}
          onChange={(event) => changeLayout("hideSearchBox", event.target.checked)}
        />
      </label>
      <label>
        <span>Hide search category</span>
        <input
          type="checkbox"
          checked={tabState.layout.hideSearchCategory}
          onChange={(event) => changeLayout("hideSearchCategory", event.target.checked)}
        />
      </label>
      <label>
        <span>Hide search button</span>
        <input
          type="checkbox"
          checked={tabState.layout.hideSearchButton}
          onChange={(event) => changeLayout("hideSearchButton", event.target.checked)}
        />
      </label>
      <label>
        <span>Search box size</span>
        <input
          type="range"
          min="55"
          max="100"
          step="5"
          value={tabState.layout.searchBoxSize}
          onChange={(event) => changeLayout("searchBoxSize", Number(event.target.value))}
        />
      </label>
      <label>
        <span>Search box rounded corners</span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={tabState.layout.searchBoxRadius}
          onChange={(event) => changeLayout("searchBoxRadius", Number(event.target.value))}
        />
      </label>
      <label>
        <span>Search box opacity</span>
        <input
          type="range"
          min="35"
          max="100"
          step="5"
          value={tabState.layout.searchBoxOpacity}
          onChange={(event) => changeLayout("searchBoxOpacity", Number(event.target.value))}
        />
      </label>
    </section>
  );
}
