import { useState } from "react";
import { t } from "../i18n";
import "./App.css";

export default function App() {
  const [error, setError] = useState("");

  const openSidePanel = async () => {
    setError("");
    try {
      const currentWindow = await chrome.windows.getCurrent();
      if (currentWindow.id === undefined) throw new Error(t("windowError"));
      await chrome.sidePanel.open({ windowId: currentWindow.id });
      window.close();
    } catch {
      setError(t("openPanelError"));
    }
  };

  return (
    <main className="popup-shell">
      <header className="popup-header">
        <div className="popup-mark" aria-hidden="true">
          ▦
        </div>
        <div>
          <p className="popup-eyebrow">COLD CLEAR 2</p>
          <h1>{t("appName")}</h1>
        </div>
      </header>
      <div className="popup-message">
        <span className="panel-icon" aria-hidden="true">
          ◧
        </span>
        <div>
          <h2>{t("popupTitle")}</h2>
          <p>{t("popupDesc")}</p>
        </div>
      </div>
      <button className="open-panel-button" onClick={openSidePanel}>
        {t("openPanel")} <span aria-hidden="true">→</span>
      </button>
      {error && (
        <p className="popup-error" role="alert">
          {error}
        </p>
      )}
      <p className="popup-hint">{t("popupHint")}</p>
    </main>
  );
}
