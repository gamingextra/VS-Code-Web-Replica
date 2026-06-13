'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useFileSystemStore, type FileNode } from '@/store/fileSystemStore';
import { useEditorStore } from '@/store/editorStore';
import { getLanguageFromFilename } from '@/utils/language';
import { SearchIcon, CaseSensitiveIcon, WholeWordIcon, RegexIcon, ReplaceIcon, ReplaceAllIcon } from '@/components/icons';
import { toast } from 'sonner';

interface SearchResult {
  path: string;
  name: string;
  line: number;
  content: string;
  matchStart: number;
  matchEnd: number;
  language: string;
}

function getAllFiles(nodes: FileNode[]): FileNode[] {
  const files: FileNode[] = [];
  for (const node of nodes) {
    if (node.type === 'file') files.push(node);
    if (node.children) files.push(...getAllFiles(node.children));
  }
  return files;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function SearchView() {
  const { root, updateNodeContent } = useFileSystemStore();
  const { openFile } = useEditorStore();
  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());
  const [indexStatus, setIndexStatus] = useState<'idle' | 'indexing' | 'indexed'>('idle');
  const [searchTime, setSearchTime] = useState<number | null>(null);
  const [fileCount, setFileCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const allFiles = useMemo(() => getAllFiles(root), [root]);

  // Simulate file indexing
  useEffect(() => {
    if (allFiles.length > 0 && indexStatus === 'idle') {
      setFileCount(allFiles.length);
      setIndexStatus('indexing');
      const timer = setTimeout(() => {
        setIndexStatus('indexed');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [allFiles.length, indexStatus]);

  const buildRegex = useCallback((q: string): RegExp | null => {
    try {
      if (useRegex) return new RegExp(q, matchCase ? 'g' : 'gi');
      const escaped = escapeRegExp(q);
      const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
      return new RegExp(pattern, matchCase ? 'g' : 'gi');
    } catch { return null; }
  }, [useRegex, matchCase, wholeWord]);

  const performSearch = useCallback(() => {
    if (!query.trim()) { setResults([]); setHasSearched(true); setSearchTime(null); return; }
    const regex = buildRegex(query);
    if (!regex) { setResults([]); setHasSearched(true); setSearchTime(null); return; }
    const startTime = performance.now();
    const searchResults: SearchResult[] = [];
    for (const file of allFiles) {
      if (!file.content) continue;
      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const matches = Array.from(line.matchAll(new RegExp(regex.source, regex.flags)));
        for (const match of matches) {
          if (match.index !== undefined) {
            searchResults.push({ path: file.path, name: file.name, line: i + 1, content: line, matchStart: match.index, matchEnd: match.index + match[0].length, language: file.language || 'plaintext' });
          }
        }
      }
    }
    const elapsed = performance.now() - startTime;
    setSearchTime(Math.round(elapsed * 100) / 100);
    setResults(searchResults);
    setHasSearched(true);
  }, [query, allFiles, buildRegex]);

  const handleReplaceAll = useCallback(() => {
    if (!query.trim()) return;
    const regex = buildRegex(query);
    if (!regex) return;
    let totalReplaced = 0;
    const affectedFiles = new Set<string>();
    for (const file of allFiles) {
      if (!file.content) continue;
      const newRegex = new RegExp(regex.source, regex.flags);
      const newContent = file.content.replace(newRegex, replaceText);
      if (newContent !== file.content) {
        updateNodeContent(file.id, newContent);
        affectedFiles.add(file.name);
        const matchCount = (file.content.match(newRegex) || []).length;
        totalReplaced += matchCount;
      }
    }
    if (totalReplaced > 0) { toast.success(`Replaced ${totalReplaced} occurrence${totalReplaced > 1 ? 's' : ''} in ${affectedFiles.size} file${affectedFiles.size > 1 ? 's' : ''}`); setResults([]); setHasSearched(false); }
    else { toast.info('No replacements made'); }
  }, [query, replaceText, allFiles, buildRegex, updateNodeContent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => { if (e.key === 'Enter') performSearch(); }, [performSearch]);

  const handleResultClick = useCallback((result: SearchResult) => {
    const file = allFiles.find((f) => f.path === result.path);
    if (file && file.content !== undefined) {
      const lang = getLanguageFromFilename(file.name);
      openFile(file.path, file.name, file.content, lang);
    }
  }, [allFiles, openFile]);

  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const r of results) { if (!groups[r.path]) groups[r.path] = []; groups[r.path].push(r); }
    return groups;
  }, [results]);

  const toggleFileCollapse = (path: string) => {
    setCollapsedFiles((prev) => { const next = new Set(prev); if (next.has(path)) next.delete(path); else next.add(path); return next; });
  };

  const toggleButtons = [
    { id: 'case', icon: CaseSensitiveIcon, active: matchCase, onClick: () => setMatchCase(!matchCase), title: 'Match Case' },
    { id: 'word', icon: WholeWordIcon, active: wholeWord, onClick: () => setWholeWord(!wholeWord), title: 'Match Whole Word' },
    { id: 'regex', icon: RegexIcon, active: useRegex, onClick: () => setUseRegex(!useRegex), title: 'Use Regular Expression' },
  ];

  const totalResults = results.length;
  const totalFiles = Object.keys(groupedResults).length;

  return (
    <div className="flex flex-col h-full text-[var(--vscode-fg)]">
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
        <span className="text-xs font-bold tracking-wide opacity-80">SEARCH</span>
        <div className="flex items-center gap-2">
          {indexStatus === 'indexing' && (
            <span className="search-index-badge bg-[var(--vscode-warning)] text-black ws-connecting">
              Indexing...
            </span>
          )}
          {indexStatus === 'indexed' && (
            <span className="search-index-badge bg-[var(--vscode-success)] text-black">
              {fileCount} files indexed
            </span>
          )}
          {hasSearched && totalResults > 0 && searchTime !== null && (
            <span className="text-[10px] opacity-50">{totalResults} result{totalResults !== 1 ? 's' : ''} in {totalFiles} file{totalFiles !== 1 ? 's' : ''} ({searchTime}ms)</span>
          )}
          {hasSearched && totalResults > 0 && searchTime === null && (
            <span className="text-[10px] opacity-50">{totalResults} result{totalResults !== 1 ? 's' : ''} in {totalFiles} file{totalFiles !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      <div className="px-3 space-y-1 flex-shrink-0">
        <div className="relative">
          <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 opacity-50" />
          <input ref={inputRef} type="text" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown} className="w-full pl-7 pr-6 py-1 text-xs bg-[var(--vscode-input-bg)] border border-[var(--vscode-input-border)] rounded text-[var(--vscode-fg)] placeholder:opacity-50 outline-none focus:border-[var(--vscode-focusBorder)]" />
          <button onClick={() => setShowReplace(!showReplace)} className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center opacity-50 hover:opacity-100 hover:bg-[var(--vscode-list-hover)] rounded" title="Toggle Replace"><ReplaceIcon size={12} /></button>
        </div>

        {showReplace && (
          <div className="flex items-center gap-1">
            <input type="text" placeholder="Replace" value={replaceText} onChange={(e) => setReplaceText(e.target.value)} className="flex-1 pl-2 pr-2 py-1 text-xs bg-[var(--vscode-input-bg)] border border-[var(--vscode-input-border)] rounded text-[var(--vscode-fg)] placeholder:opacity-50 outline-none focus:border-[var(--vscode-focusBorder)]" />
            <button onClick={handleReplaceAll} title="Replace All" className="w-6 h-6 flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-[var(--vscode-list-hover)] rounded flex-shrink-0"><ReplaceAllIcon size={14} /></button>
          </div>
        )}

        <div className="flex gap-1 pt-1">
          {toggleButtons.map((btn) => (
            <button key={btn.id} title={btn.title} onClick={btn.onClick} className={`w-6 h-6 flex items-center justify-center rounded ${btn.active ? 'bg-[var(--vscode-list-active)]' : 'opacity-50 hover:opacity-80 hover:bg-[var(--vscode-list-hover)]'}`}><btn.icon size={14} /></button>
          ))}
          <button onClick={performSearch} className="ml-auto text-[10px] px-2 py-0.5 bg-[var(--vscode-button-bg)] text-white rounded hover:opacity-90">Search</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto mt-2">
        {!hasSearched && <div className="px-4 py-2 text-xs opacity-50">Type a search term and press Enter.</div>}
        {hasSearched && totalResults === 0 && query.trim() !== '' && <div className="px-4 py-2 text-xs opacity-50">No results for &quot;{query}&quot;</div>}
        {Object.entries(groupedResults).map(([path, fileResults]) => {
          const isCollapsed = collapsedFiles.has(path);
          return (
            <div key={path} className="mb-0.5">
              <div className="flex items-center gap-1 px-3 py-1 text-xs hover:bg-[var(--vscode-list-hover)] cursor-pointer select-none" onClick={() => toggleFileCollapse(path)}>
                <span className="opacity-40 w-3 text-[10px]">{isCollapsed ? '▸' : '▾'}</span>
                <span className="font-medium opacity-90">{fileResults[0]?.name}</span>
                <span className="opacity-40 ml-1 truncate">{path}</span>
                <span className="ml-auto opacity-40 text-[10px] flex-shrink-0">{fileResults.length}</span>
              </div>
              {!isCollapsed && fileResults.map((result, idx) => {
                const before = result.content.slice(0, result.matchStart).trimStart();
                const match = result.content.slice(result.matchStart, result.matchEnd);
                const after = result.content.slice(result.matchEnd);
                return (
                  <div key={idx} className="flex items-start gap-2 px-3 py-0.5 cursor-pointer hover:bg-[var(--vscode-list-hover)] text-xs" onClick={() => handleResultClick(result)}>
                    <span className="opacity-40 w-7 text-right flex-shrink-0 select-none pt-px">{result.line}</span>
                    <span className="truncate opacity-80 min-w-0">{before}<span className="bg-[#f4a460] text-black rounded-sm px-px">{match}</span>{after}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
