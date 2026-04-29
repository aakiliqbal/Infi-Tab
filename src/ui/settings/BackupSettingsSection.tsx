type BackupSettingsSectionProps = {
  backupMessage: string | null;
  exportBackup: () => void;
  importBackup: (file: File | null) => void;
};

export function BackupSettingsSection({
  backupMessage,
  exportBackup,
  importBackup
}: BackupSettingsSectionProps) {
  return (
    <section className="settings-group">
      <h2>Backup</h2>
      <button className="launcher-action" type="button" onClick={exportBackup}>
        Export JSON backup
      </button>
      <label className="upload-button">
        Import JSON backup
        <input
          accept="application/json,.json"
          type="file"
          onChange={(event) => {
            importBackup(event.target.files?.[0] ?? null);
            event.currentTarget.value = "";
          }}
        />
      </label>
      {backupMessage ? <p className="launcher-message">{backupMessage}</p> : null}
    </section>
  );
}
