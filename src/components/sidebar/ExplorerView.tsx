'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFileSystemStore, type FileNode } from '@/store/fileSystemStore';
import { useEditorStore } from '@/store/editorStore';
import { getLanguageFromFilename } from '@/utils/language';
import { ChevronRightIcon, ChevronDownIcon, FolderIcon, FolderOpenIcon, FileIcon, NewFileIcon, NewFolderIcon, RefreshExplorerIcon, CollapseAllIcon } from '@/components/icons';
import { toast } from 'sonner';
import { useBreakpoint } from '@/hooks/useWindowSize';

const iconColors: Record<string, string> = {
  js: '#f4d03f', jsx: '#61dafb', ts: '#3178c6', tsx: '#61dafb',
  json: '#f4d03f', css: '#2965f1', html: '#e44d26', py: '#3776ab',
  go: '#00add8', rs: '#dea584', java: '#b07219', cpp: '#f34b7d',
  md: '#083fa1', yaml: '#cb171e', sql: '#e38c00', sh: '#89e051',
  vue: '#41b883', dockerfile: '#2496ed', rb: '#cc342d', php: '#777bb3',
  swift: '#f05138', kt: '#7f52ff', dart: '#00b4ab', cs: '#178600',
};

interface ContextMenuProps {
  x: number;
  y: number;
  node: FileNode;
  onClose: () => void;
  onContextAction?: (action: 'newFile' | 'newFolder', node: FileNode) => void;
  onDownloadFile?: (node: FileNode) => void;
}

function ContextMenu({ x, y, node, onClose, onContextAction, onDownloadFile }: ContextMenuProps) {
  const { deleteNode } = useFileSystemStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (rect.right > vw) menuRef.current.style.left = `${x - rect.width}px`;
      if (rect.bottom > vh) menuRef.current.style.top = `${y - rect.height}px`;
    }
  }, [x, y]);

  const items = [
    ...(node.type === 'folder' ? [
      { label: 'New File...', action: () => { onContextAction?.('newFile', node); onClose(); } },
      { label: 'New Folder...', action: () => { onContextAction?.('newFolder', node); onClose(); } },
      { separator: true },
    ] : []),
    { label: 'Rename...', shortcut: 'F2', action: () => { window.dispatchEvent(new CustomEvent('filetree:rename', { detail: { id: node.id } })); onClose(); } },
    { label: 'Delete', shortcut: 'Del', danger: true, action: () => { deleteNode(node.id); toast.success(`Deleted ${node.name}`); onClose(); } },
    { separator: true },
    { label: 'Copy Path', action: () => { navigator.clipboard.writeText(node.path); toast.success('Path copied'); onClose(); } },
    ...(node.type === 'file' ? [
      { label: 'Download File', action: () => { onDownloadFile?.(node); onClose(); } },
    ] : []),
  ];

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: 'fixed', left: x, top: y, zIndex: 99999, backgroundColor: '#252526', border: '1px solid #454545', borderRadius: 4, boxShadow: '0 4px 16px rgba(0,0,0,0.4)', minWidth: 180, padding: '4px 0', fontSize: 13 }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, i) =>
        'separator' in item ? (
          <div key={i} style={{ height: 1, backgroundColor: '#454545', margin: '4px 0' }} />
        ) : (
          <div
            key={item.label}
            onClick={item.action}
            style={{
              padding: isMobile ? '10px 20px 10px 12px' : '5px 20px 5px 12px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 24,
              color: item.danger ? '#f48771' : '#cccccc',
              userSelect: 'none',
              minHeight: isMobile ? 44 : undefined,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = '#094771'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'; }}
            onTouchStart={(e) => { if (item.action) (e.currentTarget as HTMLElement).style.backgroundColor = '#094771'; }}
            onTouchEnd={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            <span>{item.label}</span>
            {item.shortcut && <span style={{ fontSize: 11, color: '#858585', flexShrink: 0 }}>{item.shortcut}</span>}
          </div>
        )
      )}
    </div>,
    document.body
  );
}

interface FileTreeNodeProps {
  node: FileNode;
  depth?: number;
  selectedId?: string | null;
  expandedIds: Set<string>;
  onToggle: (node: FileNode) => void;
  onSelect: (node: FileNode) => void;
  onContextAction?: (action: 'newFile' | 'newFolder', node: FileNode) => void;
  onDownloadFile?: (node: FileNode) => void;
  compact?: boolean;
}

export function FileTreeNode({ node, depth = 0, selectedId, expandedIds, onToggle, onSelect, onContextAction, onDownloadFile, compact }: FileTreeNodeProps) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const paddingLeft = 8 + depth * 12;
  const { isMobile } = useBreakpoint();

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const { renameNode } = useFileSystemStore();

  // Long press for context menu on mobile
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.id === node.id) { setIsRenaming(true); setRenameValue(node.name); }
    };
    window.addEventListener('filetree:rename', handler);
    return () => window.removeEventListener('filetree:rename', handler);
  }, [node.id, node.name]);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) { renameInputRef.current.focus(); renameInputRef.current.select(); }
  }, [isRenaming]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const timer = setTimeout(() => { window.addEventListener('click', close); window.addEventListener('contextmenu', close); }, 10);
    return () => { clearTimeout(timer); window.removeEventListener('click', close); window.removeEventListener('contextmenu', close); };
  }, [contextMenu]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  // Long press handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    longPressTriggeredRef.current = false;
    const touch = e.touches[0];
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setContextMenu({ x: touch.clientX, y: touch.clientY });
    }, 500);
  }, [isMobile]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleRenameSubmit = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== node.name) { renameNode(node.id, trimmed); toast.success(`Renamed to ${trimmed}`); }
    setIsRenaming(false);
  }, [renameValue, node.name, node.id, renameNode]);

  const ext = node.name.split('.').pop() || '';
  const iconColor = iconColors[ext.toLowerCase()] || 'var(--vscode-fg)';

  // In compact mode (tablet), show only icons
  if (compact) {
    return null; // Compact mode handled differently
  }

  // Mobile: 28px item height, larger touch targets
  const itemHeight = isMobile ? 28 : undefined;
  const actionButtonSize = isMobile ? 32 : 24;

  if (node.type === 'folder') {
    return (
      <div>
        <div
          className={`flex items-center gap-1 cursor-pointer select-none text-[var(--vscode-fg)] ${isSelected ? 'bg-[var(--vscode-list-active)]' : 'hover:bg-[var(--vscode-list-hover)]'}`}
          style={{ paddingLeft, fontSize: 13, minHeight: itemHeight, padding: isMobile ? '4px 8px 4px 0' : undefined }}
          onClick={(e) => { if (!longPressTriggeredRef.current) onToggle(node); longPressTriggeredRef.current = false; }}
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          tabIndex={0}
        >
          <span className="w-4 h-4 flex items-center justify-center opacity-70 flex-shrink-0">
            {isExpanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
          </span>
          <span className="w-4 h-4 flex items-center justify-center mr-1 flex-shrink-0">
            {isExpanded ? <FolderOpenIcon size={16} className="text-[#dcb67a]" /> : <FolderIcon size={16} className="text-[#dcb67a]" />}
          </span>
          {isRenaming ? (
            <input ref={renameInputRef} value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onBlur={handleRenameSubmit} onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setIsRenaming(false); }} onClick={(e) => e.stopPropagation()} className="flex-1 bg-[var(--vscode-input-bg)] border border-[var(--vscode-focusBorder)] text-[var(--vscode-fg)] text-[13px] px-1 outline-none rounded-sm" style={{ minWidth: 0 }} />
          ) : (
            <span className="truncate">{node.name}</span>
          )}
        </div>
        {isExpanded && node.children?.map((child) => (
          <FileTreeNode key={child.id} node={child} depth={depth + 1} selectedId={selectedId} expandedIds={expandedIds} onToggle={onToggle} onSelect={onSelect} onContextAction={onContextAction} onDownloadFile={onDownloadFile} />
        ))}
        {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} node={node} onClose={() => setContextMenu(null)} onContextAction={onContextAction} onDownloadFile={onDownloadFile} />}
      </div>
    );
  }

  return (
    <div>
      <div
        className={`flex items-center gap-1 cursor-pointer select-none text-[var(--vscode-fg)] ${isSelected ? 'bg-[var(--vscode-list-active)]' : 'hover:bg-[var(--vscode-list-hover)]'}`}
        style={{ paddingLeft: paddingLeft + 16, fontSize: 13, minHeight: itemHeight, padding: isMobile ? '4px 8px 4px 0' : undefined }}
        onClick={(e) => { if (!longPressTriggeredRef.current) onSelect(node); longPressTriggeredRef.current = false; }}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        tabIndex={0}
      >
        <span className="w-4 h-4 flex items-center justify-center mr-1 flex-shrink-0" style={{ color: iconColor }}>
          <FileIcon size={16} />
        </span>
        {isRenaming ? (
          <input ref={renameInputRef} value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onBlur={handleRenameSubmit} onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setIsRenaming(false); }} onClick={(e) => e.stopPropagation()} className="flex-1 bg-[var(--vscode-input-bg)] border border-[var(--vscode-focusBorder)] text-[var(--vscode-fg)] text-[13px] px-1 outline-none rounded-sm" style={{ minWidth: 0 }} />
        ) : (
          <span className="truncate">{node.name}</span>
        )}
      </div>
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} node={node} onClose={() => setContextMenu(null)} onContextAction={onContextAction} onDownloadFile={onDownloadFile} />}
    </div>
  );
}

type CreateMode = { type: 'file' | 'folder'; parentId: string | null };

export function ExplorerView({ compact = false }: { compact?: boolean }) {
  const { root, expandedFolders, toggleFolder, selectedNodeId, setSelectedNode, collapseFolder, createFile, createFolder, createFileAtRoot, createFolderAtRoot, expandFolder } = useFileSystemStore();
  const { openFile, tabs, activeTabId } = useEditorStore();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(expandedFolders));
  const [creating, setCreating] = useState<CreateMode | null>(null);
  const [createName, setCreateName] = useState('');
  const createInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const { isMobile } = useBreakpoint();

  // Action button sizes
  const actionBtnSize = isMobile ? 32 : 24;

  useEffect(() => { if (creating && createInputRef.current) createInputRef.current.focus(); }, [creating]);

  const handleToggle = useCallback((node: FileNode) => {
    toggleFolder(node.id);
    setExpandedIds((prev) => { const next = new Set(prev); if (next.has(node.id)) next.delete(node.id); else next.add(node.id); return next; });
  }, [toggleFolder]);

  const handleSelect = useCallback((node: FileNode) => {
    setSelectedNode(node.id);
    if (node.type === 'file' && node.content !== undefined) {
      const lang = getLanguageFromFilename(node.name);
      openFile(node.path, node.name, node.content, lang);
    }
  }, [setSelectedNode, openFile]);

  const handleCollapseAll = useCallback(() => {
    Array.from(expandedIds).forEach((id) => collapseFolder(id));
    setExpandedIds(new Set());
  }, [expandedIds, collapseFolder]);

  const startCreating = useCallback((type: 'file' | 'folder', parentId: string | null) => {
    setCreating({ type, parentId }); setCreateName('');
  }, []);

  const confirmCreate = useCallback(() => {
    const name = createName.trim();
    if (!name) { setCreating(null); return; }
    if (creating?.type === 'file') {
      if (creating.parentId) { createFile(creating.parentId, name); expandFolder(creating.parentId); setExpandedIds((prev) => new Set([...prev, creating.parentId!])); }
      else { createFileAtRoot(name); }
      toast.success(`Created ${name}`);
    } else if (creating?.type === 'folder') {
      if (creating.parentId) { createFolder(creating.parentId, name); expandFolder(creating.parentId); setExpandedIds((prev) => new Set([...prev, creating.parentId!])); }
      else { createFolderAtRoot(name); }
      toast.success(`Created ${name}/`);
    }
    setCreating(null); setCreateName('');
  }, [creating, createName, createFile, createFolder, createFileAtRoot, createFolderAtRoot, expandFolder]);

  // File download handler
  const handleDownloadFile = useCallback((node: FileNode) => {
    const content = node.content || '';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = node.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${node.name}`);
  }, []);

  // File upload handler
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        createFileAtRoot(file.name, content);
        toast.success(`Uploaded ${file.name}`);
      };
      reader.readAsText(file);
    });
    // Reset input
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  }, [createFileAtRoot]);

  const openEditors = tabs.filter((t) => !t.path.startsWith('Untitled'));

  // Compact mode: just show header icons
  if (compact) {
    return (
      <div className="flex flex-col h-full text-[var(--vscode-fg)] items-center pt-2">
        <button title="New File" onClick={() => startCreating('file', null)} style={{ width: actionBtnSize, height: actionBtnSize, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--vscode-fg)', cursor: 'pointer', borderRadius: 4, opacity: 0.6 }}>
          <NewFileIcon size={16} />
        </button>
        <button title="New Folder" onClick={() => startCreating('folder', null)} style={{ width: actionBtnSize, height: actionBtnSize, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--vscode-fg)', cursor: 'pointer', borderRadius: 4, opacity: 0.6 }}>
          <NewFolderIcon size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full text-[var(--vscode-fg)]">
      <div className="flex items-center justify-between px-3 py-1 flex-shrink-0">
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', opacity: 0.8 }}>EXPLORER</span>
        <div className="flex gap-0.5">
          <button title="New File" onClick={() => startCreating('file', null)} style={{ width: actionBtnSize, height: actionBtnSize, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--vscode-fg)', cursor: 'pointer', borderRadius: 4, opacity: 0.6 }}>
            <NewFileIcon size={16} />
          </button>
          <button title="New Folder" onClick={() => startCreating('folder', null)} style={{ width: actionBtnSize, height: actionBtnSize, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--vscode-fg)', cursor: 'pointer', borderRadius: 4, opacity: 0.6 }}>
            <NewFolderIcon size={16} />
          </button>
          <button title="Upload Files" onClick={() => uploadInputRef.current?.click()} style={{ width: actionBtnSize, height: actionBtnSize, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--vscode-fg)', cursor: 'pointer', borderRadius: 4, opacity: 0.6 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8.5 1.5v7.2l2.1-2.1.7.7-3.3 3.3-3.3-3.3.7-.7 2.1 2.1V1.5h1zM2.5 12.5v1h11v-1h-11z"/></svg>
          </button>
          <input ref={uploadInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileUpload} />
          <button title="Refresh Explorer" style={{ width: actionBtnSize, height: actionBtnSize, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--vscode-fg)', cursor: 'pointer', borderRadius: 4, opacity: 0.6 }}><RefreshExplorerIcon size={16} /></button>
          <button title="Collapse All" onClick={handleCollapseAll} style={{ width: actionBtnSize, height: actionBtnSize, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--vscode-fg)', cursor: 'pointer', borderRadius: 4, opacity: 0.6 }}><CollapseAllIcon size={16} /></button>
        </div>
      </div>

      {openEditors.length > 0 && (
        <div className="mt-1 flex-shrink-0">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', opacity: 0.5, padding: '4px 16px' }}>Open Editors</div>
          {openEditors.map((tab) => (
            <div key={tab.id} className={`flex items-center gap-1 px-4 cursor-pointer text-sm ${tab.id === activeTabId ? 'bg-[var(--vscode-list-active)]' : 'hover:bg-[var(--vscode-list-hover)]'}`} style={{ minHeight: isMobile ? 28 : undefined }} onClick={() => useEditorStore.getState().setActiveTab(tab.id)}>
              <span className="truncate text-xs">{tab.name}</span>
              {tab.isDirty && <span className="text-[var(--vscode-fg)] opacity-50 ml-0.5 flex-shrink-0">●</span>}
            </div>
          ))}
        </div>
      )}

      <div className="mt-1 flex-shrink-0">
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', opacity: 0.5, padding: '4px 16px' }}>Vscode-Web</div>
      </div>

      {creating && (
        <div className="px-3 py-1 flex-shrink-0">
          <input ref={createInputRef} type="text" placeholder={creating.type === 'file' ? 'filename.ext' : 'folder name'} value={createName} onChange={(e) => setCreateName(e.target.value)} onBlur={confirmCreate} onKeyDown={(e) => { if (e.key === 'Enter') confirmCreate(); if (e.key === 'Escape') { setCreating(null); setCreateName(''); } }} className="w-full bg-[var(--vscode-input-bg)] border border-[var(--vscode-focusBorder)] text-[var(--vscode-fg)] text-[13px] px-2 py-0.5 outline-none rounded-sm" />
        </div>
      )}

      <div
        className="flex-1 overflow-auto scrollable-child"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {root.map((node) => (
          <FileTreeNode key={node.id} node={node} depth={0} selectedId={selectedNodeId} expandedIds={expandedIds} onToggle={handleToggle} onSelect={handleSelect} onContextAction={(action, n) => startCreating(action === 'newFile' ? 'file' : 'folder', n.id)} onDownloadFile={handleDownloadFile} />
        ))}
      </div>
    </div>
  );
}
