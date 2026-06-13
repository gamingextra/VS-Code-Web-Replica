import { useState, useCallback, useRef, useEffect } from 'react';
import { useFileSystemStore, type FileNode } from '@/store/fileSystemStore';
import { useEditorStore } from '@/store/editorStore';
import { getLanguageFromFilename } from '@/utils/language';
import {
  NewFileIcon, NewFolderIcon, RefreshExplorerIcon, CollapseAllIcon,
} from '@/components/icons';
import { FileTreeNode } from './FileTreeNode';
import { toast } from 'sonner';

type CreateMode = { type: 'file' | 'folder'; parentId: string | null };

export function ExplorerView() {
  const {
    root, expandedFolders, toggleFolder, selectedNodeId, setSelectedNode, collapseFolder,
    createFile, createFolder, createFileAtRoot, createFolderAtRoot, expandFolder,
  } = useFileSystemStore();
  const { openFile, tabs, activeTabId } = useEditorStore();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState<CreateMode | null>(null);
  const [createName, setCreateName] = useState('');
  const createInputRef = useRef<HTMLInputElement>(null);

  // Sync expandedIds with store
  useEffect(() => {
    setExpandedIds(new Set(expandedFolders));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (creating && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [creating]);

  const handleToggle = useCallback((node: FileNode) => {
    toggleFolder(node.id);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
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
    setCreating({ type, parentId });
    setCreateName('');
  }, []);

  const confirmCreate = useCallback(() => {
    const name = createName.trim();
    if (!name) { setCreating(null); return; }
    if (creating?.type === 'file') {
      if (creating.parentId) {
        createFile(creating.parentId, name);
        expandFolder(creating.parentId);
        setExpandedIds((prev) => new Set([...prev, creating.parentId!]));
      } else {
        createFileAtRoot(name);
      }
      toast.success(`Created ${name}`);
    } else if (creating?.type === 'folder') {
      if (creating.parentId) {
        createFolder(creating.parentId, name);
        expandFolder(creating.parentId);
        setExpandedIds((prev) => new Set([...prev, creating.parentId!]));
      } else {
        createFolderAtRoot(name);
      }
      toast.success(`Created ${name}/`);
    }
    setCreating(null);
    setCreateName('');
  }, [creating, createName, createFile, createFolder, createFileAtRoot, createFolderAtRoot, expandFolder]);

  const handleCreateKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmCreate(); }
    if (e.key === 'Escape') { setCreating(null); setCreateName(''); }
  }, [confirmCreate]);

  const handleContextAction = useCallback((action: 'newFile' | 'newFolder', node: FileNode) => {
    startCreating(action === 'newFile' ? 'file' : 'folder', node.id);
  }, [startCreating]);

  const openEditors = tabs.filter((t) => !t.path.startsWith('Untitled'));

  return (
    <div className="flex flex-col h-full text-[var(--vscode-fg)]">
      {/* Section header */}
      <div className="flex items-center justify-between px-3 py-1 flex-shrink-0">
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', opacity: 0.8 }}>
          EXPLORER
        </span>
        <div className="flex gap-0.5">
          <button
            title="New File (creates at workspace root)"
            onClick={() => startCreating('file', null)}
            className="w-6 h-6 flex items-center justify-center hover:bg-[var(--vscode-list-hover)] rounded opacity-60 hover:opacity-100"
          >
            <NewFileIcon size={16} />
          </button>
          <button
            title="New Folder (creates at workspace root)"
            onClick={() => startCreating('folder', null)}
            className="w-6 h-6 flex items-center justify-center hover:bg-[var(--vscode-list-hover)] rounded opacity-60 hover:opacity-100"
          >
            <NewFolderIcon size={16} />
          </button>
          <button
            title="Refresh Explorer"
            className="w-6 h-6 flex items-center justify-center hover:bg-[var(--vscode-list-hover)] rounded opacity-60 hover:opacity-100"
          >
            <RefreshExplorerIcon size={16} />
          </button>
          <button
            title="Collapse All"
            onClick={handleCollapseAll}
            className="w-6 h-6 flex items-center justify-center hover:bg-[var(--vscode-list-hover)] rounded opacity-60 hover:opacity-100"
          >
            <CollapseAllIcon size={16} />
          </button>
        </div>
      </div>

      {/* OPEN EDITORS section */}
      {openEditors.length > 0 && (
        <div className="mt-1 flex-shrink-0">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', opacity: 0.5, padding: '4px 16px' }}>
            Open Editors
          </div>
          {openEditors.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center gap-1 py-0.5 px-4 cursor-pointer text-sm ${
                tab.id === activeTabId ? 'bg-[var(--vscode-list-active)]' : 'hover:bg-[var(--vscode-list-hover)]'
              }`}
              onClick={() => {
                const { setActiveTab } = useEditorStore.getState();
                setActiveTab(tab.id);
              }}
            >
              <span className="truncate text-xs">{tab.name}</span>
              {tab.isDirty && <span className="text-[var(--vscode-fg)] opacity-50 ml-0.5 flex-shrink-0">●</span>}
            </div>
          ))}
        </div>
      )}

      {/* WORKSPACE section */}
      <div className="mt-1 flex-shrink-0">
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', opacity: 0.5, padding: '4px 16px' }}>
          Vscode-Web
        </div>
      </div>

      {/* Inline create input */}
      {creating && (
        <div className="px-3 py-1 flex-shrink-0">
          <input
            ref={createInputRef}
            type="text"
            placeholder={creating.type === 'file' ? 'filename.ext' : 'folder name'}
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            onBlur={confirmCreate}
            onKeyDown={handleCreateKeyDown}
            className="w-full bg-[var(--vscode-input-bg)] border border-[var(--vscode-focusBorder)] text-[var(--vscode-fg)] text-[13px] px-2 py-0.5 outline-none rounded-sm"
          />
        </div>
      )}

      {/* File tree */}
      <div className="flex-1 overflow-auto">
        {root.map((node) => (
          <FileTreeNode
            key={node.id}
            node={node}
            depth={0}
            selectedId={selectedNodeId}
            expandedIds={expandedIds}
            onToggle={handleToggle}
            onSelect={handleSelect}
            onContextAction={handleContextAction}
          />
        ))}
      </div>
    </div>
  );
}
