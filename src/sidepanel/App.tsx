import { useEffect, useMemo, useRef, useState } from "react";
import type { Piece, Placement } from "../coldclear/cold_clear_2";
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

const emptyBoard = (): Board =>
  Array.from({ length: START_ROWS }, () => Array<Cell>(10).fill(null));

function pieceName(piece: Piece) {
  return PIECE_NAMES[piece];
}

function App() {
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [height, setHeight] = useState(START_HEIGHT);
  const [tool, setTool] = useState<Cell>("T");
  const painting = useRef(false);
  const paintValue = useRef<Cell>("T");
  const [queue, setQueue] = useState<Piece[]>(["T", "I", "O", "S", "Z"]);
  const [hold, setHold] = useState<Piece | "">("");
  const [combo, setCombo] = useState(0);
  const [backToBack, setBackToBack] = useState(false);
  const [iterations, setIterations] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
