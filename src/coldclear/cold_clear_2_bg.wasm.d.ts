/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const configure: (a: any) => [number, number];
export const initialize: () => [number, number, number];
export const process_message: (a: any) => [number, number, number];
export const think: (a: number) => [number, number, number];
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __wbindgen_realloc: (
  a: number,
  b: number,
  c: number,
  d: number,
) => number;
export const __wbindgen_exn_store: (a: number) => void;
export const __externref_table_alloc: () => number;
export const __wbindgen_externrefs: WebAssembly.Table;
export const __externref_table_dealloc: (a: number) => void;
export const __wbindgen_start: () => void;
