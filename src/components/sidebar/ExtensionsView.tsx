'use client';

import { useState, useMemo } from 'react';
import { useExtensionStore } from '@/store/extensionStore';
import { SearchIcon, StarIcon, DownloadIcon, GearIcon, BackIcon } from '@/components/icons';
import type { Extension } from '@/data/extensions';

function ExtensionCard({ ext, onClick, onInstall, onUninstall, onToggleEnable }: { ext: Extension; onClick: () => void; onInstall: () => void; onUninstall: () => void; onToggleEnable: () => void }) {
  const firstLetter = ext.name.charAt(0).toUpperCase();
  return (
    <div className="flex items-start gap-3 p-3 cursor-pointer hover:bg-[var(--vscode-list-hover)] border-b border-[var(--vscode-border)] group" onClick={onClick}>
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style={{ backgroundColor: ext.iconColor }}>{firstLetter}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[var(--vscode-fg)] text-sm font-medium truncate">{ext.name}</span>
          {ext.installed && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--vscode-badge-bg)] text-[var(--vscode-badge-fg)]">{ext.enabled ? 'Enabled' : 'Disabled'}</span>}
        </div>
        <div className="text-[var(--vscode-fg)] opacity-50 text-xs truncate">{ext.publisher}</div>
        <div className="text-[var(--vscode-fg)] opacity-70 text-xs truncate mt-0.5">{ext.description}</div>
        <div className="flex items-center gap-3 mt-1 text-xs text-[var(--vscode-fg)] opacity-50">
          <span className="flex items-center gap-0.5"><StarIcon size={10} />{ext.rating.toFixed(1)}</span>
          <span className="flex items-center gap-0.5"><DownloadIcon size={10} />{ext.downloads}</span>
          <span>v{ext.version}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {ext.installed ? (
          <>
            <button onClick={onUninstall} className="px-2.5 py-1 text-xs bg-[var(--vscode-button-bg)] text-white rounded hover:opacity-90 opacity-0 group-hover:opacity-100 transition-opacity">Uninstall</button>
            <button onClick={onToggleEnable} className="px-2.5 py-1 text-xs border border-[var(--vscode-border)] text-[var(--vscode-fg)] rounded hover:bg-[var(--vscode-list-hover)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" title={ext.enabled ? 'Disable' : 'Enable'}><GearIcon size={10} /></button>
          </>
        ) : (
          <button onClick={onInstall} className="px-2.5 py-1 text-xs bg-[var(--vscode-button-bg)] text-white rounded hover:opacity-90 opacity-0 group-hover:opacity-100 transition-opacity">Install</button>
        )}
      </div>
    </div>
  );
}

function ExtensionDetail({ ext, onBack, onInstall, onUninstall, onToggleEnable }: { ext: Extension; onBack: () => void; onInstall: () => void; onUninstall: () => void; onToggleEnable: () => void }) {
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'FEATURES' | 'CHANGELOG'>('DETAILS');
  const firstLetter = ext.name.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col h-full text-[var(--vscode-fg)]">
      <div className="flex items-center gap-2 p-2 border-b border-[var(--vscode-border)]">
        <button onClick={onBack} className="w-7 h-7 flex items-center justify-center hover:bg-[var(--vscode-list-hover)] rounded" title="Back"><BackIcon size={16} /></button>
        <span className="text-xs opacity-60">Extensions</span>
      </div>
      <div className="p-4 flex items-start gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl flex-shrink-0" style={{ backgroundColor: ext.iconColor }}>{firstLetter}</div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold">{ext.name}</div>
          <div className="opacity-50 text-xs">{ext.publisher}</div>
          <div className="flex items-center gap-3 mt-1 text-xs opacity-50">
            <span className="flex items-center gap-0.5"><StarIcon size={10} />{ext.rating.toFixed(1)}</span>
            <span className="flex items-center gap-0.5"><DownloadIcon size={10} />{ext.downloads}</span>
            <span>v{ext.version}</span>
          </div>
        </div>
      </div>
      <div className="px-4 pb-3 flex gap-2">
        {ext.installed ? (
          <>
            <button onClick={onUninstall} className="px-4 py-1.5 text-xs bg-[var(--vscode-button-bg)] text-white rounded hover:opacity-90">Uninstall</button>
            <button onClick={onToggleEnable} className="px-4 py-1.5 text-xs border border-[var(--vscode-border)] text-[var(--vscode-fg)] rounded hover:bg-[var(--vscode-list-hover)]">{ext.enabled ? 'Disable' : 'Enable'}</button>
          </>
        ) : (
          <button onClick={onInstall} className="px-4 py-1.5 text-xs bg-[var(--vscode-button-bg)] text-white rounded hover:opacity-90">Install</button>
        )}
      </div>
      <div className="flex border-b border-[var(--vscode-border)]">
        {(['DETAILS', 'FEATURES', 'CHANGELOG'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 text-xs font-medium ${activeTab === tab ? 'text-[var(--vscode-fg)] border-b-2 border-[var(--vscode-focusBorder)]' : 'text-[var(--vscode-fg)] opacity-50 hover:opacity-80'}`}>{tab}</button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4 text-sm">
        {activeTab === 'DETAILS' && (
          <div style={{ fontSize: 13, lineHeight: '20px' }}>
            {ext.readme.split('\n').map((line, i) => {
              if (line.startsWith('# ')) return <h2 key={i} style={{ fontSize: 16, fontWeight: 600, margin: '12px 0 8px' }}>{line.slice(2)}</h2>;
              if (line.startsWith('## ')) return <h3 key={i} style={{ fontSize: 14, fontWeight: 600, margin: '10px 0 6px' }}>{line.slice(3)}</h3>;
              if (line.startsWith('- ')) return <li key={i} style={{ marginLeft: 16 }}>{line.slice(2)}</li>;
              if (line === '') return <div key={i} style={{ height: 8 }} />;
              return <p key={i} style={{ margin: '4px 0' }}>{line}</p>;
            })}
          </div>
        )}
        {activeTab === 'FEATURES' && <ul style={{ listStyle: 'disc', paddingLeft: 20, fontSize: 13, lineHeight: '22px' }}>{ext.features.map((f, i) => <li key={i}>{f}</li>)}</ul>}
        {activeTab === 'CHANGELOG' && ext.changelog.map((entry, i) => (
          <div key={i} style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--vscode-border)' }}>
            <div style={{ fontWeight: 600 }}>{entry.version} <span style={{ opacity: 0.5, fontWeight: 400 }}>({entry.date})</span></div>
            <div style={{ marginTop: 4 }}>{entry.notes}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

type FilterTab = 'ALL' | 'INSTALLED' | 'POPULAR' | 'RECOMMENDED';

export function ExtensionsView() {
  const { extensions, install, uninstall, toggleEnabled } = useExtensionStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
  const [selectedExtId, setSelectedExtId] = useState<string | null>(null);

  const selectedExt = useMemo(() => extensions.find(e => e.id === selectedExtId) || null, [extensions, selectedExtId]);

  const filtered = useMemo(() => {
    let result = extensions;
    if (activeFilter === 'INSTALLED') result = result.filter(e => e.installed);
    else if (activeFilter === 'POPULAR') result = [...result].sort((a, b) => parseFloat(b.downloads) - parseFloat(a.downloads));
    else if (activeFilter === 'RECOMMENDED') result = result.filter(e => e.isFunctional);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(q) || e.publisher.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
    }
    return result;
  }, [extensions, activeFilter, searchQuery]);

  if (selectedExt) {
    return <ExtensionDetail ext={selectedExt} onBack={() => setSelectedExtId(null)} onInstall={() => install(selectedExt.id)} onUninstall={() => uninstall(selectedExt.id)} onToggleEnable={() => toggleEnabled(selectedExt.id)} />;
  }

  return (
    <div className="flex flex-col h-full text-[var(--vscode-fg)]">
      <div className="flex items-center justify-between px-4 py-2"><span className="text-xs font-bold tracking-wide opacity-80">EXTENSIONS</span></div>
      <div className="px-3 pb-2">
        <div className="relative">
          <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 opacity-50" />
          <input type="text" placeholder="Search Extensions in Marketplace" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-7 pr-2 py-1 text-xs bg-[var(--vscode-input-bg)] border border-[var(--vscode-input-border)] rounded text-[var(--vscode-fg)] placeholder:opacity-50 outline-none focus:border-[var(--vscode-focusBorder)]" />
        </div>
      </div>
      <div className="flex gap-1 px-3 pb-2 border-b border-[var(--vscode-border)]">
        {(['ALL', 'INSTALLED', 'POPULAR', 'RECOMMENDED'] as FilterTab[]).map(tab => (
          <button key={tab} onClick={() => setActiveFilter(tab)} className={`px-2 py-0.5 text-[10px] font-medium rounded ${activeFilter === tab ? 'bg-[var(--vscode-badge-bg)] text-[var(--vscode-badge-fg)]' : 'text-[var(--vscode-fg)] opacity-50 hover:opacity-80 hover:bg-[var(--vscode-list-hover)]'}`}>{tab}</button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? <div className="p-4 text-xs opacity-50 text-center">No extensions found.</div> : filtered.map(ext => (
          <ExtensionCard key={ext.id} ext={ext} onClick={() => setSelectedExtId(ext.id)} onInstall={() => install(ext.id)} onUninstall={() => uninstall(ext.id)} onToggleEnable={() => toggleEnabled(ext.id)} />
        ))}
      </div>
    </div>
  );
}
