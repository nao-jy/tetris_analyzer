import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const translations = {
  ja: {
    appName: "盤面アナライザー",
    moveIndex: "{{n}}手目",
    mino: "ミノ",
    board: "盤面",
    gameState: "ゲーム状態",
    conditions: "解析条件",
    scan: "画像から",
    scanTitle: "ページ上で盤面範囲を選択して読み取る",
    height: "高さ",
    rows: "{{n}}段",
    clear: "クリア",
    boardLabel: "{{n}}段のテトリス盤面",
    garbage: "お邪魔ブロック",
    empty: "空",
    cellTitle: "{{x}}列・{{y}}段",
    columnsRows: "10 列 × {{n}} 段",
    dragEdit: "ドラッグして連続編集",
    selectBoard: "ページ上で盤面範囲を選択してください",
    takingScreenshot: "スクリーンショットを撮影中…",
    analyzingCells: "セルの色を解析中…",
    cellColors: "セルの色",
    erase: "消去",
    hold: "ホールド",
    none: "なし",
    combo: "REN / コンボ",
    b2b: "B2B継続中",
    next: "ネクスト",
    count: "{{n}} 個",
    nextIndex: "ネクスト {{n}}",
    removeNext: "ネクスト {{n}} を削除",
    addNext: "＋ ネクストを追加",
    searchAmount: "探索量",
    light: "軽い",
    standard: "標準",
    deep: "深い",
    deepest: "最深プリセット",
    analyzing: "解析中…",
    analyze: "盤面を解析",
    engineNote: "入力したネクストに沿って連続解析します",
    afterBoard: "着地後の盤面",
    beforeAnalysis: "解析前",
    boardSteps: "盤面の手順",
    prevBoard: "前の手の盤面",
    prev: "← 前",
    noCandidates: "候補なし",
    notAnalyzed: "未解析",
    nextBoard: "次の手の盤面",
    nextArrow: "次 →",
    nthMove: "{{n}}手目",
    spin: "{{spin}} spin",
    linesCleared: "{{n}} ライン消去",
    showBoardAfterAnalysis: "解析すると盤面を表示",
    noCandidatesAvailable: "候補手なし",
    linesClearedDash: "— ライン消去",
    boardAfterMove: "{{n}}手目のあと盤面",
    emptyBoardBeforeAnalysis: "解析前の空盤面",
    resultApplied: "入力したネクストに沿って最上位候補を続けて適用しています。",
    noResult: "候補手がありません。盤面とネクストを確認してください。",
    analyzeToShow: "盤面を解析すると、着地後の盤面をここに表示します。",
    offline: "オフライン解析 · データは端末内で処理",
    popupTitle: "サイドパネルで解析",
    popupDesc: "盤面の編集や候補手の確認は、サイドパネルから行えます。",
    openPanel: "サイドパネルを開く",
    popupHint: "ページを見ながら、横で盤面を分析できます。",
    language: "言語",
    japanese: "日本語",
    english: "English",
    windowError: "ウィンドウを取得できませんでした。",
    openPanelError:
      "サイドパネルを開けませんでした。Chromeを最新版にして、もう一度お試しください。",
    cancel: "キャンセル",
    captureBoard: "撮影して盤面に反映",
    retrySelection: "範囲を選び直す",
    dragSelectSized: "盤面の左上から右下までドラッグ（10列 × {{n}}段）",
    resizeHint: "枠の辺や角をドラッグしてサイズを調整",
    moveHint: "枠をドラッグして位置を調整",
    selectHint: "盤面の左上から右下までドラッグして範囲を選択",
    adjustHint: "枠内をドラッグして移動、辺や角をドラッグして微調整",
    tooSmall: "範囲が小さすぎます。大きめに選択してください",
    capturing: "撮影中…",
    captureAgain: "もう一度撮影",
    captureFailed: "撮影に失敗しました。",
    restored: "前回の範囲を復元しました。枠内を移動、辺や角で微調整できます",
    imageFailed: "画像を解析できませんでした。",
    permissionError:
      "画面読み取りの権限が未反映です。chrome://extensions で拡張機能を再読み込みしてください。",
    noTab: "撮影するタブが見つかりませんでした。",
    selectionFailed:
      "範囲選択を開始できませんでした。拡張機能を再読み込みして再試行してください。",
    analysisFailed: "解析に失敗しました。",
    workerFailed:
      "解析ワーカーを起動できませんでした。拡張機能を再読み込みしてください。",
    captureImageLoadFailed: "撮影画像を読み込めませんでした",
    canvasFailed: "画像解析用のCanvasを作成できませんでした",
    boardRejected: "盤面を受け付けませんでした。",
    moveFailed: "着手を適用できませんでした。",
    overlayInstructions:
      "10 columns × {{n}} rows: drag from the top-left to the bottom-right of the board",
  },
  en: {
    appName: "Tetris Board Analyzer",
    moveIndex: "Move {{n}}",
    mino: "mino",
    board: "Board",
    gameState: "Game state",
    conditions: "Analysis settings",
    scan: "Scan image",
    scanTitle: "Select and read the board area on the page",
    height: "Height",
    rows: "{{n}} rows",
    clear: "Clear",
    boardLabel: "{{n}}-row Tetris board",
    garbage: "Garbage block",
    empty: "Empty",
    cellTitle: "Column {{x}} · Row {{y}}",
    columnsRows: "10 columns × {{n}} rows",
    dragEdit: "Drag to paint cells",
    selectBoard: "Select the board area on the page",
    takingScreenshot: "Taking screenshot…",
    analyzingCells: "Analyzing cell colors…",
    cellColors: "Cell colors",
    erase: "Erase",
    hold: "Hold",
    none: "None",
    combo: "REN / Combo",
    b2b: "Back-to-back active",
    next: "Next queue",
    count: "{{n}} pieces",
    nextIndex: "Next piece {{n}}",
    removeNext: "Remove next piece {{n}}",
    addNext: "+ Add next piece",
    searchAmount: "Search depth",
    light: "Light",
    standard: "Standard",
    deep: "Deep",
    deepest: "Deepest preset",
    analyzing: "Analyzing…",
    analyze: "Analyze board",
    engineNote: "Analyze consecutive placements using the entered queue",
    afterBoard: "Board after placement",
    beforeAnalysis: "Not analyzed",
    boardSteps: "Board steps",
    prevBoard: "Previous move board",
    prev: "← Prev",
    noCandidates: "No candidates",
    notAnalyzed: "Not analyzed",
    nextBoard: "Next move board",
    nextArrow: "Next →",
    nthMove: "Move {{n}}",
    spin: "{{spin}} spin",
    linesCleared: "{{n}} lines cleared",
    showBoardAfterAnalysis: "Board appears after analysis",
    noCandidatesAvailable: "No candidate moves",
    linesClearedDash: "— lines cleared",
    boardAfterMove: "Board after move {{n}}",
    emptyBoardBeforeAnalysis: "Empty board before analysis",
    resultApplied:
      "Applying the top candidate repeatedly using the entered queue.",
    noResult: "No candidate moves. Check the board and next queue.",
    analyzeToShow: "Analyze the board to see the resulting position here.",
    offline: "Offline analysis · data stays on this device",
    popupTitle: "Analyze in the side panel",
    popupDesc: "Edit the board and review candidate moves in the side panel.",
    openPanel: "Open side panel",
    popupHint: "Analyze the board alongside the page.",
    language: "Language",
    japanese: "日本語",
    english: "English",
    windowError: "Could not get the current window.",
    openPanelError:
      "Could not open the side panel. Update Chrome to the latest version and try again.",
    cancel: "Cancel",
    captureBoard: "Capture and update board",
    retrySelection: "Select area again",
    dragSelectSized:
      "Drag from the board's top-left to bottom-right (10 columns × {{n}} rows)",
    resizeHint: "Drag an edge or corner to resize",
    moveHint: "Drag the frame to move it",
    selectHint:
      "Drag from the board's top-left to bottom-right to select an area",
    adjustHint:
      "Drag inside the frame to move it, or drag an edge or corner to adjust",
    tooSmall: "The selected area is too small. Select a larger area.",
    capturing: "Capturing…",
    captureAgain: "Capture again",
    captureFailed: "Capture failed.",
    restored:
      "Restored the previous area. Drag inside to move or use an edge or corner to adjust.",
    imageFailed: "Could not analyze the image.",
    permissionError:
      "Screen capture permission is missing. Reload the extension at chrome://extensions.",
    noTab: "Could not find a tab to capture.",
    selectionFailed:
      "Could not start area selection. Reload the extension and try again.",
    analysisFailed: "Analysis failed.",
    workerFailed: "Could not start the analysis worker. Reload the extension.",
    captureImageLoadFailed: "Could not load the captured image",
    canvasFailed: "Could not create a canvas for image analysis",
    boardRejected: "Board was rejected.",
    moveFailed: "Could not apply the move.",
    overlayInstructions:
      "Drag from the board's top-left to bottom-right (10 columns × {{n}} rows)",
  },
} as const;

const storedLanguage = localStorage.getItem("tetrisAnalyzerLanguage");
const browserLanguage = navigator.language.toLowerCase().startsWith("ja")
  ? "ja"
  : "en";

void i18n.use(initReactI18next).init({
  resources: {
    ja: { translation: translations.ja },
    en: { translation: translations.en },
  },
  lng:
    storedLanguage === "ja" || storedLanguage === "en"
      ? storedLanguage
      : browserLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (language) => {
  localStorage.setItem("tetrisAnalyzerLanguage", language);
  document.documentElement.lang = language;
  document.title = i18n.t("appName");
});

document.documentElement.lang = i18n.resolvedLanguage ?? i18n.language;
document.title = i18n.t("appName");

window.addEventListener("storage", (event) => {
  if (
    event.key === "tetrisAnalyzerLanguage" &&
    (event.newValue === "ja" || event.newValue === "en") &&
    event.newValue !== i18n.language
  ) {
    void i18n.changeLanguage(event.newValue);
  }
});

export default i18n;
