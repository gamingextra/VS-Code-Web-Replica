'use client';

import { useRef, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { useEditorStore, type EditorSplit } from '@/store/editorStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useThemeStore } from '@/store/themeStore';
import { useBreakpoint } from '@/hooks/useWindowSize';
import { WelcomePage } from './WelcomePage';
import { CloseIcon } from '@/components/icons';

const LANG_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  py: 'python', go: 'go', rs: 'rust', java: 'java', cpp: 'cpp', c: 'c', h: 'c',
  html: 'html', css: 'css', scss: 'scss', json: 'json', yaml: 'yaml', yml: 'yaml',
  sql: 'sql', sh: 'shell', bash: 'shell', md: 'markdown', markdown: 'markdown',
  dockerfile: 'dockerfile', xml: 'xml', svg: 'xml', vue: 'html', svelte: 'html',
  txt: 'plaintext', rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin',
  dart: 'dart', cs: 'csharp', r: 'r', lua: 'lua', pl: 'perl',
};

function detectLang(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  if (path.toLowerCase().startsWith('dockerfile')) return 'dockerfile';
  return LANG_MAP[ext] || 'plaintext';
}

const THEME_DEFS = {
  'vs-dark': {
    base: 'vs-dark' as const, inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955' }, { token: 'keyword', foreground: '569CD6' },
      { token: 'identifier', foreground: '9CDCFE' }, { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' }, { token: 'type', foreground: '4EC9B0' },
      { token: 'function', foreground: 'DCDCAA' },
    ],
    colors: {
      'editor.background': '#1E1E1E', 'editor.foreground': '#D4D4D4',
      'editor.lineHighlightBackground': '#2D2D2D', 'editor.selectionBackground': '#264F78',
    },
  },
  'vs-light': {
    base: 'vs' as const, inherit: true,
    rules: [
      { token: 'comment', foreground: '008000' }, { token: 'keyword', foreground: '0000FF' },
      { token: 'string', foreground: 'A31515' }, { token: 'number', foreground: '098658' },
    ],
    colors: { 'editor.background': '#FFFFFF', 'editor.foreground': '#000000' },
  },
  'solarized': {
    base: 'vs-dark' as const, inherit: true,
    rules: [
      { token: 'comment', foreground: '586E75' }, { token: 'keyword', foreground: 'CB4B16' },
      { token: 'string', foreground: '2AA198' }, { token: 'number', foreground: 'D33682' },
    ],
    colors: { 'editor.background': '#002B36', 'editor.foreground': '#839496', 'editor.selectionBackground': '#073642' },
  },
  'monokai': {
    base: 'vs-dark' as const, inherit: true,
    rules: [
      { token: 'comment', foreground: '75715E' }, { token: 'keyword', foreground: 'F92672' },
      { token: 'string', foreground: 'E6DB74' }, { token: 'number', foreground: 'AE81FF' },
    ],
    colors: { 'editor.background': '#272822', 'editor.foreground': '#F8F8F2', 'editor.selectionBackground': '#49483E' },
  },
  'github': {
    base: 'vs' as const, inherit: true,
    rules: [
      { token: 'comment', foreground: '6A737D' }, { token: 'keyword', foreground: 'D73A49' },
      { token: 'string', foreground: '032F62' }, { token: 'number', foreground: '005CC5' },
    ],
    colors: { 'editor.background': '#FFFFFF', 'editor.foreground': '#24292E', 'editor.selectionBackground': '#0366D6' },
  },
};

const THEME_NAME_MAP: Record<string, string> = {
  dark: 'vs-dark', light: 'vs-light', solarized: 'solarized', monokai: 'monokai', github: 'github',
};

export const editorRefs: Map<string, monaco.editor.IStandaloneCodeEditor | null> = new Map();

function Breadcrumbs({ path }: { path: string }) {
  const { isMobile } = useBreakpoint();
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  // On mobile, show only last 2 segments to save space
  const visibleSegments = isMobile && segments.length > 2
    ? ['...', ...segments.slice(-2)]
    : segments;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: isMobile ? '4px 8px' : '2px 12px',
        backgroundColor: 'var(--vscode-editor-bg)',
        borderBottom: '1px solid var(--vscode-border)',
        flexShrink: 0,
        flexWrap: 'nowrap',
        overflow: 'hidden',
        gap: 2,
        height: isMobile ? 26 : 22,
        minHeight: isMobile ? 26 : 22,
      }}
    >
      {visibleSegments.map((seg, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flexShrink: i < visibleSegments.length - 1 ? 1 : 0 }}>
          {i > 0 && <span style={{ fontSize: 11, opacity: 0.4, flexShrink: 0 }}>›</span>}
          <span
            style={{
              fontSize: isMobile ? 11 : 12,
              color: 'var(--vscode-fg)',
              opacity: i === visibleSegments.length - 1 ? 1 : 0.6,
              fontWeight: i === visibleSegments.length - 1 ? 500 : 400,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {seg}
          </span>
        </span>
      ))}
    </div>
  );
}

interface SplitPaneProps {
  split: EditorSplit;
  splitIndex: number;
  isActive: boolean;
  showDivider: boolean;
  showClose: boolean;
}

function SplitPane({ split, splitIndex, isActive, showDivider, showClose }: SplitPaneProps) {
  const { tabs, updateTabContent, markClean, setActiveSplitIndex, closeSplit, setActiveTab } = useEditorStore();
  const settings = useSettingsStore();
  const { theme } = useThemeStore();
  const { isMobile } = useBreakpoint();
  const monacoRef = useRef<typeof monaco | null>(null);
  const localEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const themesRegistered = useRef(false);

  const activeTab = split.activeTabId ? tabs.find((t) => t.id === split.activeTabId) : null;

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.command === 'formatDocument' && isActive) {
        localEditorRef.current?.getAction('editor.action.formatDocument')?.run();
      }
      if (detail.command === 'find' && isActive) {
        localEditorRef.current?.getAction('actions.find')?.run();
      }
      if (detail.command === 'replace' && isActive) {
        localEditorRef.current?.getAction('editor.action.startFindReplaceAction')?.run();
      }
    };
    window.addEventListener('vscode:command', handler);
    return () => window.removeEventListener('vscode:command', handler);
  }, [isActive]);

  useEffect(() => {
    const editor = localEditorRef.current;
    if (!editor) return;
    editor.updateOptions({
      fontSize: settings.fontSize,
      fontFamily: settings.fontFamily,
      fontLigatures: settings.fontLigatures,
      wordWrap: settings.wordWrap,
      minimap: { enabled: settings.minimap },
      lineNumbers: settings.lineNumbers,
      tabSize: settings.tabSize,
      insertSpaces: settings.insertSpaces,
      renderWhitespace: settings.renderWhitespace,
      cursorStyle: settings.cursorStyle,
      cursorBlinking: settings.cursorBlinking,
      bracketPairColorization: { enabled: settings.bracketPairColorization },
      stickyScroll: { enabled: settings.stickyScroll },
    });
  }, [settings.fontSize, settings.fontFamily, settings.fontLigatures, settings.wordWrap,
      settings.minimap, settings.lineNumbers, settings.tabSize, settings.insertSpaces,
      settings.renderWhitespace, settings.cursorStyle, settings.cursorBlinking,
      settings.bracketPairColorization, settings.stickyScroll]);

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(THEME_NAME_MAP[theme] || 'vs-dark');
    }
  }, [theme]);

  const handleMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => {
    localEditorRef.current = editor;
    monacoRef.current = monacoInstance;
    editorRefs.set(split.id, editor);

    if (!themesRegistered.current) {
      Object.entries(THEME_DEFS).forEach(([name, def]) => {
        monacoInstance.editor.defineTheme(name, def as Parameters<typeof monacoInstance.editor.defineTheme>[1]);
      });
      themesRegistered.current = true;
    }

    monacoInstance.editor.setTheme(THEME_NAME_MAP[theme] || 'vs-dark');

    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
      const tab = useEditorStore.getState().tabs.find(
        (t) => t.id === useEditorStore.getState().splits[splitIndex]?.activeTabId
      );
      if (tab) markClean(tab.id);
    });

    editor.addCommand(
      monacoInstance.KeyMod.Shift | monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.KeyF,
      () => editor.getAction('editor.action.formatDocument')?.run()
    );

    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Equal, () => {
      useSettingsStore.getState().zoomIn();
    });

    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Minus, () => {
      useSettingsStore.getState().zoomOut();
    });
  }, [split.id, splitIndex, markClean, theme]);

  const handleChange = useCallback((value: string | undefined) => {
    if (!activeTab || value === undefined) return;
    updateTabContent(activeTab.id, value);
  }, [activeTab, updateTabContent]);

  const splitTabs = tabs.filter((t) => split.tabIds.includes(t.id));

  return (
    <div
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0,
        borderLeft: showDivider ? '1px solid var(--vscode-border)' : undefined,
        outline: isActive && showClose ? '1px solid var(--vscode-focusBorder)' : undefined,
        outlineOffset: -1,
      }}
      onClick={() => setActiveSplitIndex(splitIndex)}
    >
      {showClose && splitTabs.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            height: isMobile ? 34 : 30,
            backgroundColor: 'var(--vscode-tab-bg)',
            borderBottom: '1px solid var(--vscode-tab-border)',
            overflowX: 'auto',
            flexShrink: 0,
            scrollbarWidth: 'none',
          }}
        >
          {splitTabs.map((tab) => {
            const isTabActive = tab.id === split.activeTabId;
            return (
              <div
                key={tab.id}
                onClick={(e) => { e.stopPropagation(); setActiveSplitIndex(splitIndex); setActiveTab(tab.id); }}
                style={{
                  display: 'flex', alignItems: 'center', height: isMobile ? 34 : 30, padding: '0 6px 0 10px',
                  backgroundColor: isTabActive ? 'var(--vscode-tab-activeBg)' : 'transparent',
                  borderTop: isTabActive ? '1px solid var(--vscode-focusBorder)' : '1px solid transparent',
                  color: isTabActive ? 'var(--vscode-editor-fg)' : 'var(--vscode-fg)',
                  fontSize: isMobile ? 11 : 12, cursor: 'pointer', maxWidth: isMobile ? 110 : 140, minWidth: isMobile ? 40 : 50, flexShrink: 0, gap: 4,
                  borderRight: '1px solid var(--vscode-tab-border)',
                }}
              >
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: isTabActive ? 1 : 0.7 }}>
                  {tab.name}
                </span>
                {tab.isDirty && <span style={{ fontSize: 9, opacity: 0.7 }}>●</span>}
              </div>
            );
          })}
          <button
            onClick={(e) => { e.stopPropagation(); closeSplit(split.id); }}
            title="Close Editor Group"
            style={{
              marginLeft: 'auto', width: isMobile ? 32 : 28, height: isMobile ? 34 : 30, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', color: 'var(--vscode-fg)',
              cursor: 'pointer', opacity: 0.5,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
          >
            <CloseIcon size={13} />
          </button>
        </div>
      )}

      {activeTab && <Breadcrumbs path={activeTab.path} />}

      {activeTab ? (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Editor
            height="100%"
            language={detectLang(activeTab.path)}
            value={activeTab.content}
            path={activeTab.path}
            theme={THEME_NAME_MAP[theme] || 'vs-dark'}
            onMount={handleMount}
            onChange={handleChange}
            options={{
              fontFamily: settings.fontFamily,
              fontSize: settings.fontSize,
              fontLigatures: settings.fontLigatures,
              wordWrap: settings.wordWrap,
              minimap: { enabled: settings.minimap },
              lineNumbers: settings.lineNumbers,
              tabSize: settings.tabSize,
              insertSpaces: settings.insertSpaces,
              renderWhitespace: settings.renderWhitespace,
              cursorStyle: settings.cursorStyle,
              cursorBlinking: settings.cursorBlinking,
              bracketPairColorization: { enabled: settings.bracketPairColorization },
              formatOnPaste: settings.formatOnPaste,
              formatOnType: settings.formatOnType,
              stickyScroll: { enabled: settings.stickyScroll },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              readOnly: false,
            }}
          />
        </div>
      ) : (
        <div
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'var(--vscode-editor-bg)',
            color: 'var(--vscode-fg)', opacity: 0.3, fontSize: 13,
          }}
        >
          Open a file to edit
        </div>
      )}
    </div>
  );
}

export function EditorArea() {
  const { splits, activeSplitIndex } = useEditorStore();

  const hasAnyTabs = splits.some((s) => s.tabIds.length > 0);

  if (!hasAnyTabs) {
    return (
      <div style={{ flex: 1, backgroundColor: 'var(--vscode-editor-bg)', overflow: 'auto' }}>
        <WelcomePage />
      </div>
    );
  }

  const showClose = splits.length > 1;

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minWidth: 0 }}>
      {splits.map((split, idx) => (
        <SplitPane
          key={split.id}
          split={split}
          splitIndex={idx}
          isActive={idx === activeSplitIndex}
          showDivider={idx > 0}
          showClose={showClose}
        />
      ))}
    </div>
  );
}
