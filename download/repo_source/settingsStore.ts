import { create } from 'zustand';

export type WordWrap = 'on' | 'off' | 'wordWrapColumn' | 'bounded';
export type LineNumbers = 'on' | 'off' | 'relative';
export type RenderWhitespace = 'none' | 'selection' | 'all';
export type AutoSave = 'off' | 'afterDelay' | 'onFocusChange';
export type CursorStyle = 'line' | 'block' | 'underline';
export type CursorBlinking = 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';

interface SettingsState {
  fontSize: number;
  fontFamily: string;
  fontLigatures: boolean;
  wordWrap: WordWrap;
  minimap: boolean;
  lineNumbers: LineNumbers;
  tabSize: number;
  insertSpaces: boolean;
  renderWhitespace: RenderWhitespace;
  formatOnSave: boolean;
  formatOnPaste: boolean;
  formatOnType: boolean;
  autoSave: AutoSave;
  autoSaveDelay: number;
  cursorStyle: CursorStyle;
  cursorBlinking: CursorBlinking;
  zenMode: boolean;
  bracketPairColorization: boolean;
  stickyScroll: boolean;
  linkedEditing: boolean;

  setFontSize: (n: number) => void;
  setFontFamily: (s: string) => void;
  setFontLigatures: (b: boolean) => void;
  setWordWrap: (w: WordWrap) => void;
  toggleMinimap: () => void;
  setLineNumbers: (l: LineNumbers) => void;
  setTabSize: (n: number) => void;
  setInsertSpaces: (b: boolean) => void;
  setRenderWhitespace: (r: RenderWhitespace) => void;
  setFormatOnSave: (b: boolean) => void;
  setFormatOnPaste: (b: boolean) => void;
  setFormatOnType: (b: boolean) => void;
  setAutoSave: (a: AutoSave) => void;
  setAutoSaveDelay: (n: number) => void;
  setCursorStyle: (c: CursorStyle) => void;
  setCursorBlinking: (c: CursorBlinking) => void;
  toggleZenMode: () => void;
  setBracketPairColorization: (b: boolean) => void;
  setStickyScroll: (b: boolean) => void;
  setLinkedEditing: (b: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
}

const savedRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('vscode-settings') : null;
const saved: Partial<SettingsState> = savedRaw ? JSON.parse(savedRaw) : {};

function persist(partial: Partial<SettingsState>) {
  const prev = JSON.parse(localStorage.getItem('vscode-settings') || '{}');
  localStorage.setItem('vscode-settings', JSON.stringify({ ...prev, ...partial }));
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  fontSize: saved.fontSize ?? 13,
  fontFamily: saved.fontFamily ?? '"Cascadia Code", "SF Mono", Menlo, Monaco, monospace',
  fontLigatures: saved.fontLigatures ?? true,
  wordWrap: saved.wordWrap ?? 'off',
  minimap: saved.minimap ?? true,
  lineNumbers: saved.lineNumbers ?? 'on',
  tabSize: saved.tabSize ?? 2,
  insertSpaces: saved.insertSpaces ?? true,
  renderWhitespace: saved.renderWhitespace ?? 'selection',
  formatOnSave: saved.formatOnSave ?? false,
  formatOnPaste: saved.formatOnPaste ?? true,
  formatOnType: saved.formatOnType ?? true,
  autoSave: saved.autoSave ?? 'afterDelay',
  autoSaveDelay: saved.autoSaveDelay ?? 1000,
  cursorStyle: saved.cursorStyle ?? 'line',
  cursorBlinking: saved.cursorBlinking ?? 'blink',
  zenMode: false,
  bracketPairColorization: saved.bracketPairColorization ?? true,
  stickyScroll: saved.stickyScroll ?? false,
  linkedEditing: saved.linkedEditing ?? false,

  setFontSize: (n) => { const v = Math.max(8, Math.min(40, n)); set({ fontSize: v }); persist({ fontSize: v }); },
  setFontFamily: (s) => { set({ fontFamily: s }); persist({ fontFamily: s }); },
  setFontLigatures: (b) => { set({ fontLigatures: b }); persist({ fontLigatures: b }); },
  setWordWrap: (w) => { set({ wordWrap: w }); persist({ wordWrap: w }); },
  toggleMinimap: () => { const v = !get().minimap; set({ minimap: v }); persist({ minimap: v }); },
  setLineNumbers: (l) => { set({ lineNumbers: l }); persist({ lineNumbers: l }); },
  setTabSize: (n) => { set({ tabSize: n }); persist({ tabSize: n }); },
  setInsertSpaces: (b) => { set({ insertSpaces: b }); persist({ insertSpaces: b }); },
  setRenderWhitespace: (r) => { set({ renderWhitespace: r }); persist({ renderWhitespace: r }); },
  setFormatOnSave: (b) => { set({ formatOnSave: b }); persist({ formatOnSave: b }); },
  setFormatOnPaste: (b) => { set({ formatOnPaste: b }); persist({ formatOnPaste: b }); },
  setFormatOnType: (b) => { set({ formatOnType: b }); persist({ formatOnType: b }); },
  setAutoSave: (a) => { set({ autoSave: a }); persist({ autoSave: a }); },
  setAutoSaveDelay: (n) => { set({ autoSaveDelay: n }); persist({ autoSaveDelay: n }); },
  setCursorStyle: (c) => { set({ cursorStyle: c }); persist({ cursorStyle: c }); },
  setCursorBlinking: (c) => { set({ cursorBlinking: c }); persist({ cursorBlinking: c }); },
  toggleZenMode: () => set({ zenMode: !get().zenMode }),
  setBracketPairColorization: (b) => { set({ bracketPairColorization: b }); persist({ bracketPairColorization: b }); },
  setStickyScroll: (b) => { set({ stickyScroll: b }); persist({ stickyScroll: b }); },
  setLinkedEditing: (b) => { set({ linkedEditing: b }); persist({ linkedEditing: b }); },
  zoomIn: () => { const v = Math.min(40, get().fontSize + 1); set({ fontSize: v }); persist({ fontSize: v }); },
  zoomOut: () => { const v = Math.max(8, get().fontSize - 1); set({ fontSize: v }); persist({ fontSize: v }); },
  resetZoom: () => { set({ fontSize: 13 }); persist({ fontSize: 13 }); },
}));
