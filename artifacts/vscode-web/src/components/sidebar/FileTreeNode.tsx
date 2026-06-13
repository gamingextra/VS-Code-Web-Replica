import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useFileSystemStore, type FileNode } from '@/store/fileSystemStore';
import { useEditorStore } from '@/store/editorStore';
import { getLanguageFromFilename } from '@/utils/language';
import { ChevronRightIcon, ChevronDownIcon, FolderIcon, FolderOpenIcon, FileIcon } from '@/components/icons';
import { toast } from 'sonner';

interface Props {
  node: FileNode;
  depth?: number;
  selectedId?: string | null;
  expandedIds: Set<string>;
  onToggle: (node: FileNode) => void;
  onSelect: (node: FileNode) => void;
  onContextAction?: (action: 'newFile' | 'newFolder', node: FileNode) => void;
}

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
}

function ContextMenu({ x, y, node, onClose, onContextAction }: ContextMenuProps) {
  const { deleteNode } = useFileSystemStore();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Adjust position to avoid going off-screen
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
      {
        label: 'New File...',
        action: () => { onContextAction?.('newFile', node); onClose(); },
      },
      {
        label: 'New Folder...',
        action: () => { onContextAction?.('newFolder', node); onClose(); },
      },
      { separator: true },
    ] : []),
    {
      label: 'Rename...',
      shortcut: 'F2',
      action: () => {
        window.dispatchEvent(new CustomEvent('filetree:rename', { detail: { id: node.id } }));
        onClose();
      },
    },
    {
      label: 'Delete',
      shortcut: 'Del',
      danger: true,
      action: () => {
        deleteNode(node.id);
        toast.success(`Deleted ${node.name}`);
        onClose();
      },
    },
    { separator: true },
    {
      label: 'Copy Path',
      action: () => { navigator.clipboard.writeText(node.path); toast.success('Path copied'); onClose(); },
    },
    {
      label: 'Copy Relative Path',
      action: () => { navigator.clipboard.writeText(node.path); toast.success('Path copied'); onClose(); },
    },
  ];

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 99999,
        backgroundColor: '#252526',
        border: '1px solid #454545',
        borderRadius: 4,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        minWidth: 180,
        padding: '4px 0',
        fontSize: 13,
      }}
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
              padding: '5px 20px 5px 12px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 24,
              color: item.danger ? '#f48771' : '#cccccc',
              userSelect: 'none',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = '#094771'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'; }}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span style={{ fontSize: 11, color: '#858585', flexShrink: 0 }}>{item.shortcut}</span>
            )}
          </div>
        )
      )}
    </div>,
    document.body
  );
}

export function FileTreeNode({ node, depth = 0, selectedId, expandedIds, onToggle, onSelect, onContextAction }: Props) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const paddingLeft = 8 + depth * 12;

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const { renameNode } = useFileSystemStore();
  const { openFile } = useEditorStore();

  // Listen for rename trigger from context menu
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.id === node.id) {
        setIsRenaming(true);
        setRenameValue(node.name);
      }
    };
    window.addEventListener('filetree:rename', handler);
    return () => window.removeEventListener('filetree:rename', handler);
  }, [node.id, node.name]);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  // Close context menu on any click/contextmenu outside
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const timer = setTimeout(() => {
      window.addEventListener('click', close);
      window.addEventListener('contextmenu', close);
    }, 10);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
    };
  }, [contextMenu]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleRenameSubmit = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== node.name) {
      renameNode(node.id, trimmed);
      toast.success(`Renamed to ${trimmed}`);
    }
    setIsRenaming(false);
  }, [renameValue, node.name, node.id, renameNode]);

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleRenameSubmit(); }
    if (e.key === 'Escape') { setIsRenaming(false); setRenameValue(node.name); }
  }, [handleRenameSubmit, node.name]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'F2') {
      e.preventDefault();
      setIsRenaming(true);
      setRenameValue(node.name);
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      // Let parent handle
    }
  }, [node.name]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (node.type === 'file') return; // Single-click opens files
    setIsRenaming(true);
    setRenameValue(node.name);
  }, [node.type]);

  const ext = node.name.split('.').pop() || '';
  const iconColor = iconColors[ext.toLowerCase()] || 'var(--vscode-fg)';

  if (node.type === 'folder') {
    return (
      <div>
        <div
          className={`flex items-center gap-1 py-0.5 pr-2 cursor-pointer select-none text-[var(--vscode-fg)] ${
            isSelected ? 'bg-[var(--vscode-list-active)]' : 'hover:bg-[var(--vscode-list-hover)]'
          }`}
          style={{ paddingLeft, fontSize: 13 }}
          onClick={() => onToggle(node)}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <span className="w-4 h-4 flex items-center justify-center opacity-70 flex-shrink-0">
            {isExpanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
          </span>
          <span className="w-4 h-4 flex items-center justify-center mr-1 flex-shrink-0">
            {isExpanded
              ? <FolderOpenIcon size={16} className="text-[#dcb67a]" />
              : <FolderIcon size={16} className="text-[#dcb67a]" />
            }
          </span>
          {isRenaming ? (
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleRenameKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-[var(--vscode-input-bg)] border border-[var(--vscode-focusBorder)] text-[var(--vscode-fg)] text-[13px] px-1 outline-none rounded-sm"
              style={{ minWidth: 0 }}
            />
          ) : (
            <span className="truncate">{node.name}</span>
          )}
        </div>
        {isExpanded && node.children?.map((child) => (
          <FileTreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedId={selectedId}
            expandedIds={expandedIds}
            onToggle={onToggle}
            onSelect={onSelect}
            onContextAction={onContextAction}
          />
        ))}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            node={node}
            onClose={() => setContextMenu(null)}
            onContextAction={onContextAction}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-0.5 pr-2 cursor-pointer select-none text-[var(--vscode-fg)] ${
          isSelected ? 'bg-[var(--vscode-list-active)]' : 'hover:bg-[var(--vscode-list-hover)]'
        }`}
        style={{ paddingLeft: paddingLeft + 16, fontSize: 13 }}
        onClick={() => onSelect(node)}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <span className="w-4 h-4 flex items-center justify-center mr-1 flex-shrink-0" style={{ color: iconColor }}>
          <FileIcon size={16} />
        </span>
        {isRenaming ? (
          <input
            ref={renameInputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleRenameKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-[var(--vscode-input-bg)] border border-[var(--vscode-focusBorder)] text-[var(--vscode-fg)] text-[13px] px-1 outline-none rounded-sm"
            style={{ minWidth: 0 }}
          />
        ) : (
          <span className="truncate">{node.name}</span>
        )}
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={node}
          onClose={() => setContextMenu(null)}
          onContextAction={onContextAction}
        />
      )}
    </div>
  );
}
