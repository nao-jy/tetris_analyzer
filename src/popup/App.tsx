import { useState } from "react";
import "./App.css";

export default function App() {
  const [error, setError] = useState("");

  const openSidePanel = async () => {
    setError("");
    try {
      const currentWindow = await chrome.windows.getCurrent();
      if (currentWindow.id === undefined)
        throw new Error("ウィンドウを取得できませんでした。");
      await chrome.sidePanel.open({ windowId: currentWindow.id });
      window.close();
    } catch {
      setError(
        "サイドパネルを開けませんでした。Chromeを最新版にして、もう一度お試しください。",
      );
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
          <h1>盤面アナライザー</h1>
        </div>
      </header>
      <div className="popup-message">
        <span className="panel-icon" aria-hidden="true">
          ◧
        </span>
        <div>
          <h2>サイドパネルで解析</h2>
          <p>盤面の編集や候補手の確認は、サイドパネルから行えます。</p>
        </div>
      </div>
      <button className="open-panel-button" onClick={openSidePanel}>
        サイドパネルを開く <span aria-hidden="true">→</span>
      </button>
      {error && (
        <p className="popup-error" role="alert">
          {error}
        </p>
      )}
      <p className="popup-hint">ページを見ながら、横で盤面を分析できます。</p>
    </main>
  );
}
