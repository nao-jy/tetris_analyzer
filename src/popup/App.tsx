import { useState } from "react";
import { useTranslation } from "react-i18next";
import "./App.css";

export default function App() {
  const { t, i18n } = useTranslation();
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
      <label className="language-control">
        <span>{t("language")}</span>
        <select
          aria-label={t("language")}
          value={i18n.resolvedLanguage ?? i18n.language}
          onChange={(event) => void i18n.changeLanguage(event.target.value)}
        >
          <option value="ja">{t("japanese")}</option>
          <option value="en">{t("english")}</option>
        </select>
      </label>
    </main>
  );
}
