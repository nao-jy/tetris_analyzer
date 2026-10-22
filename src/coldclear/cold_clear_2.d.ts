/* tslint:disable */
/* eslint-disable */
export interface BotConfig {
  freestyle_weights: Weights;
  freestyle_exploitation: number;
}

export interface MoveInfo {
  nodes: number;
  nps: number;
  extra: string;
}

export interface PieceLocation {
  type: Piece;
  orientation: Rotation;
  x: number;
  y: number;
}

export interface Placement {
  location: PieceLocation;
  spin: Spin;
}

export interface Start {
  board: Board;
  queue: Piece[];
  hold: Piece | undefined;
  combo: number;
  back_to_back: boolean;
  randomizer?: Randomizer;
}

export interface Weights {
  cell_coveredness: number;
  max_cell_covered_height: number;
  holes: number;
  row_transitions: number;
  height: number;
  height_upper_half: number;
  height_upper_quarter: number;
  tetris_well_depth: number;
  tslot: [number, number, number, number];
  has_back_to_back: number;
  wasted_t: number;
  softdrop: number;
  normal_clears: [number, number, number, number, number];
  mini_spin_clears: [number, number, number];
  spin_clears: [number, number, number, number];
  back_to_back_clear: number;
  combo_attack: number;
  perfect_clear: number;
  perfect_clear_override: boolean;
}

export type Board = Array<Array<string | null>>;

export type BotMessage =
  | {
      type: "info";
      name: string;
      version: string;
      author: string;
      features: string[];
    }
  | { type: "ready" }
  | { type: "suggestion"; moves: Placement[]; move_info: MoveInfo };

export type FrontendMessage =
  | { type: "rules" }
  | ({ type: "start" } & Start)
  | { type: "play"; move: Placement }
  | { type: "new_piece"; piece: Piece }
  | { type: "suggest" }
  | { type: "stop" }
  | { type: "quit" }
  | { type: string; [key: string]: unknown };

export type MessageResponse = BotMessage | undefined;

export type Piece = "I" | "O" | "T" | "L" | "J" | "S" | "Z";

export type Randomizer =
  | { type: "seven_bag"; bag_state: Piece[] }
  | { type: string; [key: string]: unknown };

export type Rotation = "north" | "west" | "south" | "east";

export type Spin = "none" | "mini" | "full";

export function configure(config: BotConfig): void;

export function initialize(): BotMessage;

export function process_message(message: FrontendMessage): MessageResponse;

export function think(iterations: number): MoveInfo;

export type InitInput =
  RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly configure: (a: any) => [number, number];
  readonly initialize: () => [number, number, number];
  readonly process_message: (a: any) => [number, number, number];
  readonly think: (a: number) => [number, number, number];
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (
    a: number,
    b: number,
    c: number,
    d: number,
  ) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(
  module: { module: SyncInitInput } | SyncInitInput,
): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init(
  module_or_path?:
    | { module_or_path: InitInput | Promise<InitInput> }
    | InitInput
    | Promise<InitInput>,
): Promise<InitOutput>;
