import { useEffect, useMemo, useRef, useState } from "react";
import type { Piece, Placement } from "../coldclear/cold_clear_2";
import { imageToBoard } from "./imageAnalysis";
import "./App.css";

const PIECES: Piece[] = ["I", "O", "T", "L", "J", "S", "Z"];
const PIECE_NAMES: Record<Piece, string> = {
  I: "I ミノ",
  O: "O ミノ",
  T: "T ミノ",
  L: "L ミノ",
  J: "J ミノ",
  S: "S ミノ",
  Z: "Z ミノ",
};
const START_ROWS = 40;
const START_HEIGHT = 20;
type Cell = Piece | "G" | null;
type Board = Cell[][];
type SavedRegion = { x: number; y: number; width: number; height: number };
const SAVED_REGION_KEY = "tetrisAnalyzerCaptureRegion";

const emptyBoard = (): Board =>
  Array.from({ length: START_ROWS }, () => Array<Cell>(10).fill(null));

function pieceName(piece: Piece) {
  return PIECE_NAMES[piece];
}

function readSavedRegion(): SavedRegion | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(SAVED_REGION_KEY) ?? "null");
    if (
      value &&
      [value.x, value.y, value.width, value.height].every(Number.isFinite) &&
      value.width > 0 &&
      value.height > 0
    ) {
      return value as SavedRegion;
    }
  } catch {
    // Ignore malformed stored selection data.
  }
  return undefined;
}

function saveRegionFromCapture(
  box: SavedRegion | undefined,
  viewportWidth: number | undefined,
  viewportHeight: number | undefined,
) {
  if (
    !box ||
    !viewportWidth ||
    !viewportHeight ||
    box.width <= 0 ||
    box.height <= 0
  ) return;
  const normalized = {
    x: box.x / viewportWidth,
    y: box.y / viewportHeight,
    width: box.width / viewportWidth,
    height: box.height / viewportHeight,
  };
  try {
    localStorage.setItem(SAVED_REGION_KEY, JSON.stringify(normalized));
  } catch {
    // Keep the current capture working if storage is unavailable.
  }
}

function beginRegionSelection(
  selectionId: string,
  rows: number,
  initialRegion?: SavedRegion | null,
) {
  document.getElementById("tetris-board-region-overlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "tetris-board-region-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    cursor: "crosshair",
    background: "rgba(6, 10, 16, .16)",
    touchAction: "none",
    userSelect: "none",
  });

  const prompt = document.createElement("div");
  Object.assign(prompt.style, {
    position: "fixed",
    top: "14px",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "10px 14px",
    border: "1px solid rgba(164,239,196,.55)",
    borderRadius: "9px",
    color: "#edf7f0",
    background: "#151b20",
    boxShadow: "0 5px 24px rgba(0,0,0,.4)",
    font: "600 13px/1.4 system-ui, sans-serif",
    whiteSpace: "nowrap",
    pointerEvents: "auto",
  });
  const promptText = document.createElement("span");
  promptText.textContent = `盤面の左上から右下までドラッグ（10列 × ${rows}段）`;
  const cancelFromPrompt = document.createElement("button");
  cancelFromPrompt.textContent = "キャンセル";
  Object.assign(cancelFromPrompt.style, {
    padding: "5px 8px",
    border: "1px solid #46514d",
    borderRadius: "5px",
    color: "#dce7df",
    background: "#252e2a",
    font: "500 11px system-ui, sans-serif",
    cursor: "pointer",
  });
  prompt.append(promptText, cancelFromPrompt);

  const selection = document.createElement("div");
  Object.assign(selection.style, {
    position: "fixed",
    display: "none",
    overflow: "visible",
    border: "2px solid #a4efc4",
    boxSizing: "border-box",
    background: "rgba(164,239,196,.1)",
    boxShadow: "0 0 0 9999px rgba(5,9,14,.22), 0 0 16px rgba(164,239,196,.35)",
    pointerEvents: "auto",
  });
  const grid = document.createElement("div");
  Object.assign(grid.style, {
    position: "absolute",
    inset: "0",
    display: "grid",
    gridTemplateColumns: "repeat(10, minmax(0, 1fr))",
    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
    pointerEvents: "none",
  });
  for (let i = 0; i < rows * 10; i += 1) {
    const cell = document.createElement("div");
    Object.assign(cell.style, {
      border: "1px solid rgba(240,255,246,.72)",
      boxSizing: "border-box",
    });
    grid.append(cell);
  }
  selection.append(grid);
  const resizeHandles = new Map<string, HTMLDivElement>();
  const handlePositions: Array<[string, string]> = [
    ["nw", "nwse-resize"],
    ["n", "ns-resize"],
    ["ne", "nesw-resize"],
    ["e", "ew-resize"],
    ["se", "nwse-resize"],
    ["s", "ns-resize"],
    ["sw", "nesw-resize"],
    ["w", "ew-resize"],
  ];
  const handlePlacement: Record<string, { left?: string; right?: string; top?: string; bottom?: string; transform: string }> = {
    nw: { left: "0", top: "0", transform: "translate(-50%, -50%)" },
    n: { left: "50%", top: "0", transform: "translate(-50%, -50%)" },
    ne: { right: "0", top: "0", transform: "translate(50%, -50%)" },
    e: { right: "0", top: "50%", transform: "translate(50%, -50%)" },
    se: { right: "0", bottom: "0", transform: "translate(50%, 50%)" },
    s: { left: "50%", bottom: "0", transform: "translate(-50%, 50%)" },
    sw: { left: "0", bottom: "0", transform: "translate(-50%, 50%)" },
    w: { left: "0", top: "50%", transform: "translate(-50%, -50%)" },
  };
  for (const [name, cursor] of handlePositions) {
    const handle = document.createElement("div");
    handle.dataset.resizeHandle = name;
    Object.assign(handle.style, {
      position: "absolute",
      display: "none",
      zIndex: "2",
      width: name.length === 1 ? "10px" : "13px",
      height: name.length === 1 ? "10px" : "13px",
      border: "2px solid #132019",
      borderRadius: "50%",
      background: "#a4efc4",
      boxShadow: "0 0 0 1px rgba(255,255,255,.8)",
      cursor,
      pointerEvents: "auto",
      ...handlePlacement[name],
    });
    resizeHandles.set(name, handle);
    selection.append(handle);
  }

  const toolbar = document.createElement("div");
  Object.assign(toolbar.style, {
    position: "fixed",
    display: "none",
    alignItems: "center",
    gap: "7px",
    padding: "6px",
    border: "1px solid #3b4740",
    borderRadius: "8px",
    background: "#151b20",
    boxShadow: "0 5px 24px rgba(0,0,0,.4)",
    pointerEvents: "auto",
  });
  const makeButton = (label: string, primary = false) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    Object.assign(button.style, {
      padding: "7px 10px",
      border: primary ? "1px solid #a4efc4" : "1px solid #46514d",
      borderRadius: "5px",
      color: primary ? "#132019" : "#dce7df",
      background: primary ? "#a4efc4" : "#252e2a",
      font: "600 11px system-ui, sans-serif",
      cursor: "pointer",
      whiteSpace: "nowrap",
    });
    return button;
  };
  const captureButton = makeButton("撮影して盤面に反映", true);
  const retryButton = makeButton("範囲を選び直す");
  const cancelButton = makeButton("キャンセル");
  toolbar.append(captureButton, retryButton, cancelButton);
  overlay.append(selection, prompt, toolbar);
  document.documentElement.append(overlay);

  let dragMode: "draw" | "move" | "resize" | null = null;
  let activeHandle = "";
  let selected = false;
  let startX = 0;
  let startY = 0;
  let originBox = { x: 0, y: 0, width: 0, height: 0 };
  let box = { x: 0, y: 0, width: 0, height: 0 };

  const sendNotice = (type: string, extra: Record<string, unknown> = {}) => {
    void chrome.runtime.sendMessage({ type, selectionId, ...extra });
  };
  const close = (notice?: string) => {
    overlay.remove();
    if (notice) {
      sendNotice(notice, {
        captureBox: box,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
      });
    }
  };
  const placeToolbar = () => {
    toolbar.style.left = `${Math.max(8, Math.min(box.x, innerWidth - toolbar.offsetWidth - 8))}px`;
    toolbar.style.top = `${Math.min(box.y + box.height + 8, innerHeight - toolbar.offsetHeight - 8)}px`;
  };
  const renderBox = () => {
    selection.style.display = "block";
    selection.style.left = `${box.x}px`;
    selection.style.top = `${box.y}px`;
    selection.style.width = `${box.width}px`;
    selection.style.height = `${box.height}px`;
  };
  const setHandlesVisible = (visible: boolean) => {
    resizeHandles.forEach((handle) => {
      handle.style.display = visible ? "block" : "none";
    });
  };
  const updateDrawBox = (x: number, y: number) => {
    const left = Math.min(startX, x);
    const top = Math.min(startY, y);
    box = {
      x: left,
      y: top,
      width: Math.abs(x - startX),
      height: Math.abs(y - startY),
    };
    renderBox();
  };
  const resetSelection = () => {
    selected = false;
    selection.style.display = "none";
    toolbar.style.display = "none";
    setHandlesVisible(false);
    promptText.textContent = `盤面の左上から右下までドラッグ（10列 × ${rows}段）`;
  };

  overlay.addEventListener("pointerdown", (event) => {
    const target = event.target as HTMLElement;
    if (target.closest("button")) return;
    event.preventDefault();
    startX = event.clientX;
    startY = event.clientY;
    originBox = { ...box };
    const handle = target.closest<HTMLElement>("[data-resize-handle]");
    if (selected && handle) {
      dragMode = "resize";
      activeHandle = handle.dataset.resizeHandle ?? "";
      promptText.textContent = "枠の辺や角をドラッグしてサイズを調整";
      return;
    }
    if (selected && selection.contains(target)) {
      dragMode = "move";
      promptText.textContent = "枠をドラッグして位置を調整";
      return;
    }

    dragMode = "draw";
    selected = false;
    toolbar.style.display = "none";
    setHandlesVisible(false);
    promptText.textContent = "盤面の左上から右下までドラッグして範囲を選択";
    updateDrawBox(startX, startY);
  });
  overlay.addEventListener("pointermove", (event) => {
    if (!dragMode) return;
    event.preventDefault();
    if (dragMode === "draw") {
      updateDrawBox(event.clientX, event.clientY);
      return;
    }

    if (dragMode === "move") {
      box = {
        ...originBox,
        x: Math.max(0, Math.min(innerWidth - originBox.width, originBox.x + event.clientX - startX)),
        y: Math.max(0, Math.min(innerHeight - originBox.height, originBox.y + event.clientY - startY)),
      };
      renderBox();
      placeToolbar();
      return;
    }

    let left = originBox.x;
    let top = originBox.y;
    let right = originBox.x + originBox.width;
    let bottom = originBox.y + originBox.height;
    if (activeHandle.includes("w")) left = Math.max(0, Math.min(event.clientX, right - 100));
    if (activeHandle.includes("e")) right = Math.min(innerWidth, Math.max(event.clientX, left + 100));
    if (activeHandle.includes("n")) top = Math.max(0, Math.min(event.clientY, bottom - rows * 5));
    if (activeHandle.includes("s")) bottom = Math.min(innerHeight, Math.max(event.clientY, top + rows * 5));
    box = { x: left, y: top, width: right - left, height: bottom - top };
    renderBox();
    placeToolbar();
  });
  overlay.addEventListener("pointerup", (event) => {
    if (!dragMode) return;
    const completedMode = dragMode;
    dragMode = null;
    if (completedMode !== "draw") {
      promptText.textContent = "枠内をドラッグして移動、辺や角をドラッグして微調整";
      placeToolbar();
      return;
    }
    updateDrawBox(event.clientX, event.clientY);
    if (box.width < 100 || box.height < rows * 5) {
      resetSelection();
      promptText.textContent = "範囲が小さすぎます。大きめに選択してください";
      return;
    }
    selected = true;
    promptText.textContent = "枠内をドラッグして移動、辺や角をドラッグして微調整";
    setHandlesVisible(true);
    toolbar.style.display = "flex";
    placeToolbar();
  });

  const cancel = () => close("board-screenshot-cancelled");
  cancelFromPrompt.addEventListener("click", cancel);
  cancelButton.addEventListener("click", cancel);
  retryButton.addEventListener("click", resetSelection);
  captureButton.addEventListener("click", async () => {
    if (!selected) return;
    selected = false;
    captureButton.disabled = true;
    captureButton.textContent = "撮影中…";
    overlay.style.display = "none";
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    try {
      await chrome.runtime.sendMessage({
        type: "board-screenshot-capturing",
        selectionId,
      });
      const response = await chrome.runtime.sendMessage({
        type: "capture-board-region",
        captureBox: box,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
      });
      if (!response?.ok) throw new Error(response?.error ?? "撮影に失敗しました。");
      await chrome.runtime.sendMessage({
        type: "board-screenshot-captured",
        selectionId,
        rows,
        dataUrl: response.dataUrl,
        captureBox: box,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
      });
      overlay.remove();
    } catch (error) {
      overlay.style.display = "block";
      selected = true;
      captureButton.disabled = false;
      captureButton.textContent = "もう一度撮影";
      promptText.textContent = error instanceof Error ? error.message : "撮影に失敗しました。";
      toolbar.style.display = "flex";
      placeToolbar();
      sendNotice("board-screenshot-retry");
    }
  });

  if (initialRegion) {
    box.width = Math.min(innerWidth, Math.max(100, Math.round(initialRegion.width * innerWidth)));
    box.height = Math.min(innerHeight, Math.max(rows * 5, Math.round(initialRegion.height * innerHeight)));
    box.x = Math.max(0, Math.min(innerWidth - box.width, Math.round(initialRegion.x * innerWidth)));
    box.y = Math.max(0, Math.min(innerHeight - box.height, Math.round(initialRegion.y * innerHeight)));
    selected = box.width >= 100 && box.height >= rows * 5;
    if (selected) {
      renderBox();
      setHandlesVisible(true);
      promptText.textContent = "前回の範囲を復元しました。枠内を移動、辺や角で微調整できます";
      toolbar.style.display = "flex";
      placeToolbar();
    }
  }
}

function App() {
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [height, setHeight] = useState(START_HEIGHT);
  const [tool, setTool] = useState<Cell>("T");
  const painting = useRef(false);
  const paintValue = useRef<Cell>("T");
  const captureSession = useRef<string | null>(null);
  const captureRows = useRef(START_HEIGHT);
  const [queue, setQueue] = useState<Piece[]>(["T", "I", "O", "S", "Z"]);
  const [hold, setHold] = useState<Piece | "">("");
  const [combo, setCombo] = useState(0);
  const [backToBack, setBackToBack] = useState(false);
  const [iterations, setIterations] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captureError, setCaptureError] = useState("");
  const [captureStatus, setCaptureStatus] = useState<
    "idle" | "selecting" | "capturing" | "analyzing"
  >("idle");
  const [result, setResult] = useState<{
    moves: Placement[];
    nodes: number;
    nps: number;
  } | null>(null);

  const visibleRows = useMemo(
    () => board.slice(START_ROWS - height),
    [board, height],
  );

  useEffect(() => {
    const stopPainting = () => {
      painting.current = false;
    };
    window.addEventListener("pointerup", stopPainting);
    window.addEventListener("pointercancel", stopPainting);
    window.addEventListener("blur", stopPainting);
    return () => {
      window.removeEventListener("pointerup", stopPainting);
      window.removeEventListener("pointercancel", stopPainting);
      window.removeEventListener("blur", stopPainting);
    };
  }, []);

  useEffect(() => {
    const onCaptureMessage = (message: {
      type?: string;
      selectionId?: string;
      rows?: number;
      dataUrl?: string;
      error?: string;
      captureBox?: SavedRegion;
      viewportWidth?: number;
      viewportHeight?: number;
    }) => {
      if (!message.selectionId || message.selectionId !== captureSession.current)
        return;
      if (message.type === "board-screenshot-cancelled") {
        saveRegionFromCapture(
          message.captureBox,
          message.viewportWidth,
          message.viewportHeight,
        );
        captureSession.current = null;
        setCaptureStatus("idle");
        return;
      }
      if (message.type === "board-screenshot-capturing") {
        setCaptureStatus("capturing");
        return;
      }
      if (message.type === "board-screenshot-retry") {
        setCaptureStatus("selecting");
        return;
      }
      if (message.type === "board-screenshot-failed") {
        captureSession.current = null;
        setCaptureStatus("idle");
        setCaptureError(message.error ?? "撮影に失敗しました。");
        return;
      }
      if (message.type !== "board-screenshot-captured" || !message.dataUrl)
        return;

      saveRegionFromCapture(
        message.captureBox,
        message.viewportWidth,
        message.viewportHeight,
      );
      const rowCount = captureRows.current;
      setCaptureStatus("analyzing");
      setCaptureError("");
      void imageToBoard(message.dataUrl, rowCount)
        .then((scannedBoard) => {
          const nextBoard = emptyBoard();
          const offset = START_ROWS - rowCount;
          scannedBoard.forEach((row, index) => {
            nextBoard[offset + index] = row;
          });
          setBoard(nextBoard);
          setResult(null);
        })
        .catch((imageError: unknown) => {
          setCaptureError(
            imageError instanceof Error
              ? imageError.message
              : "画像を解析できませんでした。",
          );
        })
        .finally(() => {
          captureSession.current = null;
          setCaptureStatus("idle");
        });
    };

    chrome.runtime.onMessage.addListener(onCaptureMessage);
    return () => chrome.runtime.onMessage.removeListener(onCaptureMessage);
  }, []);

  const editCell = (row: number, column: number, value: Cell = tool) => {
    const absoluteRow = START_ROWS - height + row;
    setBoard((current) =>
      current.map((line, y) =>
        y === absoluteRow
          ? line.map((cell, x) => (x === column ? value : cell))
          : line,
      ),
    );
    setResult(null);
  };

  const startPainting = (row: number, column: number) => {
    painting.current = true;
    paintValue.current = tool;
    editCell(row, column, tool);
  };

  const continuePainting = (row: number, column: number) => {
    if (painting.current) editCell(row, column, paintValue.current);
  };

  const startScreenshot = async () => {
    setCaptureError("");
    const selectionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    captureSession.current = selectionId;
    captureRows.current = height;
    setCaptureStatus("selecting");
    try {
      const permissions = chrome.runtime.getManifest().permissions ?? [];
      if (!permissions.includes("activeTab") || !permissions.includes("scripting")) {
        throw new Error(
          "画面読み取りの権限が未反映です。chrome://extensions で拡張機能を再読み込みしてください。",
        );
      }
      const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      if (tab?.id === undefined)
        throw new Error("撮影するタブが見つかりませんでした。");
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: beginRegionSelection,
        args: [selectionId, height, readSavedRegion() ?? null],
      });
    } catch (startError) {
      captureSession.current = null;
      setCaptureStatus("idle");
      setCaptureError(
        startError instanceof Error
          ? startError.message
          : "範囲選択を開始できませんでした。拡張機能を再読み込みして再試行してください。",
      );
    }
  };

  const updateQueue = (index: number, piece: Piece) => {
    setQueue((current) =>
      current.map((item, i) => (i === index ? piece : item)),
    );
    setResult(null);
  };

  const analyze = () => {
    setLoading(true);
    setError("");
    setResult(null);
    const worker = new Worker(
      new URL("./analysis.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (
      event: MessageEvent<{
        ok: boolean;
        moves?: Placement[];
        nodes?: number;
        nps?: number;
        error?: string;
      }>,
    ) => {
      worker.terminate();
      setLoading(false);
      if (!event.data.ok) {
        setError(event.data.error ?? "解析に失敗しました。");
        return;
      }
      setResult({
        moves: event.data.moves ?? [],
        nodes: event.data.nodes ?? 0,
        nps: event.data.nps ?? 0,
      });
    };
    worker.onerror = () => {
      worker.terminate();
      setLoading(false);
      setError(
        "解析ワーカーを起動できませんでした。拡張機能を再読み込みしてください。",
      );
    };
    worker.postMessage({
      board,
      queue,
      hold: hold || undefined,
      combo,
      backToBack,
      iterations: Math.max(1, Math.min(100000, iterations)),
    });
  };

  const clearBoard = () => {
    setBoard(emptyBoard());
    setResult(null);
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true">
          ▦
        </div>
        <div>
          <p className="eyebrow">COLD CLEAR 2</p>
          <h1>盤面アナライザー</h1>
        </div>
      </header>

      <section className="section board-section">
        <div className="section-heading">
          <div>
            <span className="step-number">01</span>
            <h2>盤面</h2>
          </div>
          <div className="board-actions">
            <button
              className="scan-button"
              onClick={startScreenshot}
              disabled={captureStatus !== "idle"}
              title="ページ上で盤面範囲を選択して読み取る"
            >
              <span aria-hidden="true">▧</span> 画像から
            </button>
            <label className="height-control">
              高さ{" "}
              <select
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
              >
                {[20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40].map((n) => (
                  <option key={n} value={n}>
                    {n}段
                  </option>
                ))}
              </select>
            </label>
            <button className="text-button" onClick={clearBoard}>
              クリア
            </button>
          </div>
        </div>
        <div className="board-editor" aria-label={`${height}段のテトリス盤面`}>
          {visibleRows.map((row, y) =>
            row.map((cell, x) => (
              <button
                aria-label={`${height - y}段目 ${x + 1}列目 ${cell === "G" ? "お邪魔ブロック" : cell ? pieceName(cell) : "空"}`}
                className={`cell ${cell ? `filled piece-${cell.toLowerCase()}` : ""}`}
                key={`${y}-${x}`}
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  event.preventDefault();
                  startPainting(y, x);
                }}
                onPointerEnter={() => continuePainting(y, x)}
                onClick={(event) => {
                  if (event.detail === 0) editCell(y, x);
                }}
                onDragStart={(event) => event.preventDefault()}
                title={`${x + 1}列・${height - y}段`}
              />
            )),
          )}
        </div>
        <div className="board-footer">
          <span>10 列 × {height} 段</span>
          <span>ドラッグして連続編集</span>
        </div>
        {captureStatus !== "idle" && (
          <p className="capture-status" role="status">
            {captureStatus === "selecting" && "ページ上で盤面範囲を選択してください"}
            {captureStatus === "capturing" && "スクリーンショットを撮影中…"}
            {captureStatus === "analyzing" && "セルの色を解析中…"}
          </p>
        )}
        {captureError && (
          <p className="capture-error" role="alert">
            {captureError}
          </p>
        )}
        <div className="palette" aria-label="セルの色">
          <button
            className={`palette-item erase ${tool === null ? "selected" : ""}`}
            onClick={() => setTool(null)}
            aria-pressed={tool === null}
          >
            <span className="swatch">⌫</span>
            <span>消去</span>
          </button>
          <button
            className={`palette-item ${tool === "G" ? "selected" : ""}`}
            onClick={() => setTool("G")}
            aria-pressed={tool === "G"}
          >
            <span className="swatch garbage-swatch" />
            <span>お邪魔</span>
          </button>
          {PIECES.map((piece) => (
            <button
              key={piece}
              className={`palette-item ${tool === piece ? "selected" : ""}`}
              onClick={() => setTool(piece)}
              aria-pressed={tool === piece}
            >
              <span className={`swatch piece-${piece.toLowerCase()}`} />
              {piece}
            </button>
          ))}
        </div>
      </section>

      <section className="section state-section">
        <div className="section-heading">
          <div>
            <span className="step-number">02</span>
            <h2>ゲーム状態</h2>
          </div>
          <span className="section-caption">解析条件</span>
        </div>
        <div className="state-grid">
          <label className="field">
            <span>ホールド</span>
            <select
              value={hold}
              onChange={(e) => {
                setHold(e.target.value as Piece | "");
                setResult(null);
              }}
            >
              <option value="">なし</option>
              {PIECES.map((p) => (
                <option key={p} value={p}>
                  {p} ミノ
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>REN / コンボ</span>
            <input
              type="number"
              min="0"
              max="100"
              value={combo}
              onChange={(e) => {
                setCombo(Math.max(0, Number(e.target.value)));
                setResult(null);
              }}
            />
          </label>
        </div>
        <label className="toggle-row">
          <span>
            <strong>Back-to-Back</strong>
            <small>B2B継続中</small>
          </span>
          <input
            type="checkbox"
            checked={backToBack}
            onChange={(e) => {
              setBackToBack(e.target.checked);
              setResult(null);
            }}
          />
          <i />
        </label>
      </section>

      <section className="section queue-section">
        <div className="section-heading">
          <div>
            <span className="step-number">03</span>
            <h2>ネクスト</h2>
          </div>
          <span className="section-caption">{queue.length} 個</span>
        </div>
        <div className="queue-list">
          {queue.map((piece, i) => (
            <label className="queue-slot" key={i}>
              <span className="queue-index">
                {String(i + 1).padStart(2, "0")}
              </span>
              <select
                aria-label={`ネクスト ${i + 1}`}
                value={piece}
                onChange={(e) => updateQueue(i, e.target.value as Piece)}
              >
                {PIECES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                className="remove-slot"
                aria-label={`ネクスト ${i + 1} を削除`}
                onClick={() => {
                  setQueue((current) =>
                    current.filter((_, index) => index !== i),
                  );
                  setResult(null);
                }}
              >
                ×
              </button>
            </label>
          ))}
          <button
            className="add-slot"
            onClick={() => {
              setQueue((current) => [...current, "T"]);
              setResult(null);
            }}
          >
            ＋ ネクストを追加
          </button>
        </div>
      </section>

      <section className="analysis-section">
        <label className="iteration-control">
          探索量{" "}
          <select
            value={iterations}
            onChange={(e) => setIterations(Number(e.target.value))}
          >
            <option value={1000}>軽い · 1,000</option>
            <option value={5000}>標準 · 5,000</option>
            <option value={20000}>深い · 20,000</option>
            <option value={50000}>最大 · 50,000</option>
          </select>
        </label>
        <button
          className="analyze-button"
          onClick={analyze}
          disabled={loading || queue.length === 0}
        >
          <span>{loading ? "解析中…" : "盤面を解析"}</span>
          <span className="button-arrow">{loading ? "◌" : "→"}</span>
        </button>
        <p className="engine-note">Cold Clear 2 をブラウザー内で実行します</p>
      </section>

      {error && (
        <div className="error-card" role="alert">
          {error}
        </div>
      )}
      {result && (
        <section className="result-card" aria-live="polite">
          <div className="result-heading">
            <div>
              <span className="step-number">04</span>
              <h2>推奨手</h2>
            </div>
            <span className="engine-stat">
              {result.nodes.toLocaleString()} nodes ·{" "}
              {result.nps.toLocaleString()} n/s
            </span>
          </div>
          {result.moves.length === 0 ? (
            <p className="empty-result">
              候補手がありません。盤面とネクストを確認してください。
            </p>
          ) : (
            <ol className="move-list">
              {result.moves.slice(0, 5).map((move, i) => (
                <li
                  key={`${move.location.type}-${move.location.x}-${move.location.y}-${i}`}
                  className={i === 0 ? "best-move" : ""}
                >
                  <span className="move-rank">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`move-piece piece-${move.location.type.toLowerCase()}`}
                  >
                    {move.location.type}
                  </span>
                  <span className="move-detail">
                    {move.location.orientation.toUpperCase()}{" "}
                    <small>
                      X {move.location.x} · Y {move.location.y}
                    </small>
                  </span>
                  <span className="spin-tag">
                    {move.spin === "none" ? "通常" : `${move.spin} spin`}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <p className="result-footnote">
            候補は Cold Clear の評価順です。座標は TBP 形式です。
          </p>
        </section>
      )}
      <footer className="app-footer">
        <span className="status-dot" />
        オフライン解析 · データは端末内で処理
      </footer>
    </main>
  );
}

export default App;
