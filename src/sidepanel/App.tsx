import { useEffect, useMemo, useRef, useState } from "react";
import { t } from "../i18n";
import type { Piece, Placement, Rotation } from "../coldclear/cold_clear_2";
import { imageToBoard } from "./imageAnalysis";
import "./App.css";

const PIECES: Piece[] = ["I", "O", "T", "L", "J", "S", "Z"];
const START_ROWS = 40;
const START_HEIGHT = 20;
type Cell = Piece | "G" | null;
type Board = Cell[][];
type SavedRegion = { x: number; y: number; width: number; height: number };
const SAVED_REGION_KEY = "tetrisAnalyzerCaptureRegion";

const emptyBoard = (): Board =>
  Array.from({ length: START_ROWS }, () => Array<Cell>(10).fill(null));

function boardToTbpRows(board: Board): Board {
  // The editor stores rows top-to-bottom; TBP/Cold Clear expects row 0 at y=0
  // (the bottom of the playfield).
  return [...board].reverse().map((row) => [...row]);
}

// TBP x/y is the SRS True Rotation center, not the mino bounding-box corner.
// The north-state centers are the fixed JLSTZ pivot mino, I's middle-left mino,
// and O's bottom-left mino. Rotating these offsets preserves the true-rotation
// coordinate convention for east, south and west (including I/O center shifts).
const SRS_NORTH_CELLS: Record<Piece, Array<[number, number]>> = {
  I: [
    [-1, 0],
    [0, 0],
    [1, 0],
    [2, 0],
  ],
  O: [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  T: [
    [-1, 0],
    [0, 0],
    [1, 0],
    [0, 1],
  ],
  L: [
    [-1, 0],
    [0, 0],
    [1, 0],
    [1, 1],
  ],
  J: [
    [-1, 0],
    [0, 0],
    [1, 0],
    [-1, 1],
  ],
  S: [
    [-1, 0],
    [0, 0],
    [0, 1],
    [1, 1],
  ],
  Z: [
    [-1, 1],
    [0, 1],
    [0, 0],
    [1, 0],
  ],
};

const ROTATIONS: Rotation[] = ["north", "east", "south", "west"];
const SRS_TRUE_ROTATION_CELLS: Record<
  Piece,
  Record<Rotation, Array<[number, number]>>
> = Object.fromEntries(
  Object.entries(SRS_NORTH_CELLS).map(([piece, northCells]) => {
    const byOrientation = {} as Record<Rotation, Array<[number, number]>>;
    let cells = northCells;
    ROTATIONS.forEach((orientation) => {
      byOrientation[orientation] = cells;
      cells = cells.map(([x, y]): [number, number] => [y, -x]);
    });
    return [piece, byOrientation];
  }),
) as Record<Piece, Record<Rotation, Array<[number, number]>>>;

function boardAfterPlacement(board: Board, move: Placement) {
  const next = board.map((row) => [...row]);

  for (const [offsetX, offsetY] of SRS_TRUE_ROTATION_CELLS[move.location.type][
    move.location.orientation
  ]) {
    const column = move.location.x + offsetX;
    const boardY = move.location.y + offsetY;
    const row = START_ROWS - 1 - boardY;
    if (row >= 0 && row < START_ROWS && column >= 0 && column < 10)
      next[row][column] = move.location.type;
  }

  const remainingRows = next.filter((row) => !row.every(Boolean));
  const clearedLines = START_ROWS - remainingRows.length;
  const resultBoard = [
    ...Array.from({ length: clearedLines }, () => Array<Cell>(10).fill(null)),
    ...remainingRows,
  ];
  return { board: resultBoard, clearedLines };
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
  )
    return;
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
  labels?: Record<string, string>,
) {
  const label = (key: string) => labels?.[key] ?? key;
  const sizedInstructions = label("dragSelectSized").replace(
    "{{n}}",
    String(rows),
  );
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
  promptText.textContent = sizedInstructions;
  const cancelFromPrompt = document.createElement("button");
  cancelFromPrompt.textContent = label("cancel");
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
  const handlePlacement: Record<
    string,
    {
      left?: string;
      right?: string;
      top?: string;
      bottom?: string;
      transform: string;
    }
  > = {
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
  const captureButton = makeButton(label("captureBoard"), true);
  const retryButton = makeButton(label("retrySelection"));
  const cancelButton = makeButton(label("cancel"));
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
    promptText.textContent = sizedInstructions;
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
      promptText.textContent = label("resizeHint");
      return;
    }
    if (selected && selection.contains(target)) {
      dragMode = "move";
      promptText.textContent = label("moveHint");
      return;
    }

    dragMode = "draw";
    selected = false;
    toolbar.style.display = "none";
    setHandlesVisible(false);
    promptText.textContent = label("selectHint");
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
        x: Math.max(
          0,
          Math.min(
            innerWidth - originBox.width,
            originBox.x + event.clientX - startX,
          ),
        ),
        y: Math.max(
          0,
          Math.min(
            innerHeight - originBox.height,
            originBox.y + event.clientY - startY,
          ),
        ),
      };
      renderBox();
      placeToolbar();
      return;
    }

    let left = originBox.x;
    let top = originBox.y;
    let right = originBox.x + originBox.width;
    let bottom = originBox.y + originBox.height;
    if (activeHandle.includes("w"))
      left = Math.max(0, Math.min(event.clientX, right - 100));
    if (activeHandle.includes("e"))
      right = Math.min(innerWidth, Math.max(event.clientX, left + 100));
    if (activeHandle.includes("n"))
      top = Math.max(0, Math.min(event.clientY, bottom - rows * 5));
    if (activeHandle.includes("s"))
      bottom = Math.min(innerHeight, Math.max(event.clientY, top + rows * 5));
    box = { x: left, y: top, width: right - left, height: bottom - top };
    renderBox();
    placeToolbar();
  });
  overlay.addEventListener("pointerup", (event) => {
    if (!dragMode) return;
    const completedMode = dragMode;
    dragMode = null;
    if (completedMode !== "draw") {
      promptText.textContent = label("adjustHint");
      placeToolbar();
      return;
    }
    updateDrawBox(event.clientX, event.clientY);
    if (box.width < 100 || box.height < rows * 5) {
      resetSelection();
      promptText.textContent = label("tooSmall");
      return;
    }
    selected = true;
    promptText.textContent = label("adjustHint");
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
    captureButton.textContent = label("capturing");
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
      if (!response?.ok)
        throw new Error(response?.error ?? label("captureFailed"));
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
      captureButton.textContent = label("captureAgain");
      promptText.textContent =
        error instanceof Error ? error.message : label("captureFailed");
      toolbar.style.display = "flex";
      placeToolbar();
      sendNotice("board-screenshot-retry");
    }
  });

  if (initialRegion) {
    box.width = Math.min(
      innerWidth,
      Math.max(100, Math.round(initialRegion.width * innerWidth)),
    );
    box.height = Math.min(
      innerHeight,
      Math.max(rows * 5, Math.round(initialRegion.height * innerHeight)),
    );
    box.x = Math.max(
      0,
      Math.min(
        innerWidth - box.width,
        Math.round(initialRegion.x * innerWidth),
      ),
    );
    box.y = Math.max(
      0,
      Math.min(
        innerHeight - box.height,
        Math.round(initialRegion.y * innerHeight),
      ),
    );
    selected = box.width >= 100 && box.height >= rows * 5;
    if (selected) {
      renderBox();
      setHandlesVisible(true);
      promptText.textContent = label("restored");
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
  const [iterations, setIterations] = useState("5000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captureError, setCaptureError] = useState("");
  const [captureStatus, setCaptureStatus] = useState<
    "idle" | "selecting" | "capturing" | "analyzing"
  >("idle");
  const [result, setResult] = useState<{
    steps: Array<{ move: Placement; board: Board; clearedLines: number }>;
    nodes: number;
    nps: number;
  } | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const visibleRows = useMemo(
    () => board.slice(START_ROWS - height),
    [board, height],
  );
  const placeholderBoard = useMemo(emptyBoard, []);
  const resultSteps = result?.steps ?? [];
  const slideCount = Math.max(1, resultSteps.length);
  const activeResultStep = resultSteps[activeStepIndex];

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
      if (
        !message.selectionId ||
        message.selectionId !== captureSession.current
      )
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
        setCaptureError(message.error ?? t("captureFailed"));
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
      void imageToBoard(message.dataUrl, rowCount, {
        image: t("captureImageLoadFailed"),
        canvas: t("canvasFailed"),
      })
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
            imageError instanceof Error ? imageError.message : t("imageFailed"),
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
      if (
        !permissions.includes("activeTab") ||
        !permissions.includes("scripting")
      ) {
        throw new Error(t("permissionError"));
      }
      const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      if (tab?.id === undefined) throw new Error(t("noTab"));
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: beginRegionSelection,
        args: [
          selectionId,
          height,
          readSavedRegion() ?? null,
          Object.fromEntries(
            [
              "cancel",
              "captureBoard",
              "retrySelection",
              "dragSelectSized",
              "resizeHint",
              "moveHint",
              "selectHint",
              "adjustHint",
              "tooSmall",
              "capturing",
              "captureAgain",
              "captureFailed",
              "restored",
            ].map((key) => [key, t(key, { n: "{{n}}" })]),
          ),
        ],
      });
    } catch (startError) {
      captureSession.current = null;
      setCaptureStatus("idle");
      setCaptureError(
        startError instanceof Error ? startError.message : t("selectionFailed"),
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
    setActiveStepIndex(0);
    const analyzedBoard = board.map((row) => [...row]);
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
        setError(event.data.error ?? t("analysisFailed"));
        return;
      }
      const moves = event.data.moves ?? [];
      let currentBoard = analyzedBoard;
      const steps = moves.map((move) => {
        const afterPlacement = boardAfterPlacement(currentBoard, move);
        currentBoard = afterPlacement.board;
        return { move, ...afterPlacement };
      });
      setResult({
        steps,
        nodes: event.data.nodes ?? 0,
        nps: event.data.nps ?? 0,
      });
    };
    worker.onerror = () => {
      worker.terminate();
      setLoading(false);
      setError(t("workerFailed"));
    };
    worker.postMessage({
      board: boardToTbpRows(analyzedBoard),
      queue,
      hold: hold || undefined,
      combo,
      backToBack,
      iterations: Math.max(
        1,
        Math.min(100000, Math.floor(Number(iterations) || 1)),
      ),
      errors: {
        boardRejected: t("boardRejected"),
        moveFailed: t("moveFailed"),
        analysisFailed: t("analysisFailed"),
      },
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
          <h1>{t("appName")}</h1>
        </div>
      </header>

      <section className="section board-section">
        <div className="section-heading">
          <div>
            <span className="step-number">01</span>
            <h2>{t("board")}</h2>
          </div>
          <div className="board-actions">
            <button
              className="scan-button"
              onClick={startScreenshot}
              disabled={captureStatus !== "idle"}
              title={t("scanTitle")}
            >
              <span aria-hidden="true">▧</span> {t("scan")}
            </button>
            <label className="height-control">
              {t("height")}{" "}
              <select
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
              >
                {[20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40].map((n) => (
                  <option key={n} value={n}>
                    {t("rows", { n })}
                  </option>
                ))}
              </select>
            </label>
            <button className="text-button" onClick={clearBoard}>
              {t("clear")}
            </button>
          </div>
        </div>
        <div
          className="board-editor"
          aria-label={t("boardLabel", { n: height })}
        >
          {visibleRows.map((row, y) =>
            row.map((cell, x) => (
              <button
                aria-label={`${t("rows", { n: height - y })} ${x + 1} ${t("cellColors")}: ${cell === "G" ? t("garbage") : cell ? `${cell} ${t("mino")}` : t("empty")}`}
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
                title={t("cellTitle", { x: x + 1, y: height - y })}
              />
            )),
          )}
        </div>
        <div className="board-footer">
          <span>{t("columnsRows", { n: height })}</span>
          <span>{t("dragEdit")}</span>
        </div>
        {captureStatus !== "idle" && (
          <p className="capture-status" role="status">
            {captureStatus === "selecting" && t("selectBoard")}
            {captureStatus === "capturing" && t("takingScreenshot")}
            {captureStatus === "analyzing" && t("analyzingCells")}
          </p>
        )}
        {captureError && (
          <p className="capture-error" role="alert">
            {captureError}
          </p>
        )}
        <div className="palette" aria-label={t("cellColors")}>
          <button
            className={`palette-item erase ${tool === null ? "selected" : ""}`}
            onClick={() => setTool(null)}
            aria-pressed={tool === null}
          >
            <span className="swatch">⌫</span>
            <span>{t("erase")}</span>
          </button>
          <button
            className={`palette-item ${tool === "G" ? "selected" : ""}`}
            onClick={() => setTool("G")}
            aria-pressed={tool === "G"}
          >
            <span className="swatch garbage-swatch" />
            <span>{t("garbage")}</span>
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
            <h2>{t("gameState")}</h2>
          </div>
          <span className="section-caption">{t("conditions")}</span>
        </div>
        <div className="state-grid">
          <label className="field">
            <span>{t("hold")}</span>
            <select
              value={hold}
              onChange={(e) => {
                setHold(e.target.value as Piece | "");
                setResult(null);
              }}
            >
              <option value="">{t("none")}</option>
              {PIECES.map((p) => (
                <option key={p} value={p}>
                  {p} {t("mino")}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("combo")}</span>
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
            <small>{t("b2b")}</small>
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
            <h2>{t("next")}</h2>
          </div>
          <span className="section-caption">
            {t("count", { n: queue.length })}
          </span>
        </div>
        <div className="queue-list">
          {queue.map((piece, i) => (
            <label className="queue-slot" key={i}>
              <span className="queue-index">
                {String(i + 1).padStart(2, "0")}
              </span>
              <select
                aria-label={t("nextIndex", { n: i + 1 })}
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
                aria-label={t("removeNext", { n: i + 1 })}
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
            {t("addNext")}
          </button>
        </div>
      </section>

      <section className="analysis-section">
        <label className="iteration-control">
          <span>{t("searchAmount")}</span>
          <input
            type="number"
            aria-label={t("searchAmount")}
            min="1"
            max="100000"
            step="1"
            list="iteration-presets"
            value={iterations}
            onChange={(e) => setIterations(e.target.value)}
          />
          <datalist id="iteration-presets">
            <option value="1000" label={t("light")} />
            <option value="5000" label={t("standard")} />
            <option value="20000" label={t("deep")} />
            <option value="50000" label={t("deepest")} />
          </datalist>
        </label>
        <button
          className="analyze-button"
          onClick={analyze}
          disabled={loading || queue.length === 0}
        >
          <span>{loading ? t("analyzing") : t("analyze")}</span>
          <span className="button-arrow">{loading ? "◌" : "→"}</span>
        </button>
        <p className="engine-note">{t("engineNote")}</p>
      </section>

      {error && (
        <div className="error-card" role="alert">
          {error}
        </div>
      )}
      <section className="result-card" aria-live="polite">
        <div className="result-heading">
          <div>
            <span className="step-number">04</span>
            <h2>{t("afterBoard")}</h2>
          </div>
          <span className="engine-stat">
            {result
              ? `${result.nodes.toLocaleString()} nodes · ${result.nps.toLocaleString()} n/s`
              : t("beforeAnalysis")}
          </span>
        </div>
        <div className="carousel-controls" aria-label={t("boardSteps")}>
          <button
            className="carousel-button"
            type="button"
            aria-label={t("prevBoard")}
            disabled={!activeResultStep || activeStepIndex === 0}
            onClick={() =>
              setActiveStepIndex((index) => Math.max(0, index - 1))
            }
          >
            {t("prev")}
          </button>
          <span aria-live="polite">
            {resultSteps.length > 0
              ? `${activeStepIndex + 1} / ${resultSteps.length} · ${t("moveIndex", { n: activeStepIndex + 1 })}`
              : result
                ? t("noCandidates")
                : t("notAnalyzed")}
          </span>
          <button
            className="carousel-button"
            type="button"
            aria-label={t("nextBoard")}
            disabled={
              !activeResultStep || activeStepIndex >= resultSteps.length - 1
            }
            onClick={() =>
              setActiveStepIndex((index) =>
                Math.min(resultSteps.length - 1, index + 1),
              )
            }
          >
            {t("nextArrow")}
          </button>
        </div>
        <div className="preview-meta">
          {activeResultStep ? (
            <>
              <span>
                {activeResultStep.move.location.type} {t("mino")} ·{" "}
                {activeResultStep.move.location.orientation.toUpperCase()}
                {activeResultStep.move.spin === "none"
                  ? ""
                  : ` · ${activeResultStep.move.spin} spin`}
              </span>
              <span>
                {t("linesCleared", { n: activeResultStep.clearedLines })}
              </span>
            </>
          ) : (
            <>
              <span>
                {result
                  ? t("noCandidatesAvailable")
                  : t("showBoardAfterAnalysis")}
              </span>
              <span>{t("linesClearedDash")}</span>
            </>
          )}
        </div>
        <div className="preview-window">
          <div
            className="preview-track"
            style={{
              width: `${slideCount * 100}%`,
              transform: `translateX(-${(activeStepIndex * 100) / slideCount}%)`,
            }}
          >
            {resultSteps.length > 0 ? (
              resultSteps.map((step, stepIndex) => (
                <div
                  className="preview-slide"
                  key={`step-${stepIndex}`}
                  style={{ flex: `0 0 ${100 / slideCount}%` }}
                  aria-hidden={stepIndex !== activeStepIndex}
                >
                  <div
                    className="board-editor preview-board"
                    role="grid"
                    aria-label={t("boardAfterMove", { n: stepIndex + 1 })}
                    style={{
                      gridTemplateRows: `repeat(${height}, minmax(0, 1fr))`,
                      aspectRatio: `10 / ${height}`,
                    }}
                  >
                    {step.board
                      .slice(START_ROWS - height)
                      .flatMap((row, y) =>
                        row.map((cell, x) => (
                          <div
                            aria-label={`${t("rows", { n: height - y })} ${x + 1}: ${cell === "G" ? t("garbage") : cell ? `${cell} ${t("mino")}` : t("empty")}`}
                            className={`cell preview-cell ${cell ? `filled piece-${cell.toLowerCase()}` : ""}`}
                            key={`preview-${stepIndex}-${y}-${x}`}
                            role="gridcell"
                          />
                        )),
                      )}
                  </div>
                </div>
              ))
            ) : (
              <div
                className="preview-slide"
                key="empty-board"
                style={{ flex: "0 0 100%" }}
                aria-hidden="false"
              >
                <div
                  className="board-editor preview-board"
                  role="grid"
                  aria-label={t("emptyBoardBeforeAnalysis")}
                  style={{
                    gridTemplateRows: `repeat(${height}, minmax(0, 1fr))`,
                    aspectRatio: `10 / ${height}`,
                  }}
                >
                  {placeholderBoard
                    .slice(START_ROWS - height)
                    .flatMap((row, y) =>
                      row.map((_, x) => (
                        <div
                          aria-label={`${t("rows", { n: height - y })} ${x + 1}: ${t("empty")}`}
                          className="cell preview-cell"
                          key={`placeholder-${y}-${x}`}
                          role="gridcell"
                        />
                      )),
                    )}
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="result-footnote">
          {result
            ? resultSteps.length > 0
              ? t("resultApplied")
              : t("noResult")
            : t("analyzeToShow")}
        </p>
      </section>
      <footer className="app-footer">
        <span className="status-dot" />
        {t("offline")}
      </footer>
    </main>
  );
}

export default App;
