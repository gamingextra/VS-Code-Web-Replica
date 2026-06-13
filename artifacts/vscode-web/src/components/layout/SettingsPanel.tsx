import { useState } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { useThemeStore, type Theme } from '@/store/themeStore';
import { CloseIcon } from '@/components/icons';

interface Props {
  onClose: () => void;
}

type Category = {
  id: string;
  label: string;
  children?: Category[];
};

const CATEGORIES: Category[] = [
  {
    id: 'commonly-used',
    label: 'Commonly Used',
  },
  {
    id: 'text-editor',
    label: 'Text Editor',
    children: [
      { id: 'font', label: 'Font' },
      { id: 'editor', label: 'Editor' },
      { id: 'cursor', label: 'Cursor' },
      { id: 'formatting', label: 'Formatting' },
    ],
  },
  {
    id: 'workbench',
    label: 'Workbench',
    children: [
      { id: 'appearance', label: 'Appearance' },
    ],
  },
  {
    id: 'files',
    label: 'Files',
  },
];

function SettingRow({ label, description, control }: { label: string; description?: string; control: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 border-b border-[var(--vscode-border)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[13px] text-[var(--vscode-fg)]">{label}</span>
          {description && (
            <span className="text-[11px] text-[var(--vscode-fg)] opacity-50">{description}</span>
          )}
        </div>
        <div className="flex-shrink-0">{control}</div>
      </div>
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[var(--vscode-input-bg)] border border-[var(--vscode-input-border)] text-[var(--vscode-fg)] text-[12px] px-2 py-1 rounded outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? 'bg-[var(--vscode-focusBorder)]' : 'bg-[var(--vscode-input-bg)] border border-[var(--vscode-input-border)]'}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

function NumberInput({ value, onChange, min, max, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-20 bg-[var(--vscode-input-bg)] border border-[var(--vscode-input-border)] text-[var(--vscode-fg)] text-[12px] px-2 py-1 rounded outline-none text-center"
    />
  );
}

function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-48 bg-[var(--vscode-input-bg)] border border-[var(--vscode-input-border)] text-[var(--vscode-fg)] text-[12px] px-2 py-1 rounded outline-none"
    />
  );
}

function CategorySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="text-[11px] font-bold tracking-wider uppercase text-[var(--vscode-fg)] opacity-50 mb-2 pb-1 border-b border-[var(--vscode-border)]">
        {title}
      </div>
      {children}
    </div>
  );
}

function CommonlyUsedSettings({ s, theme }: { s: ReturnType<typeof useSettingsStore.getState>, theme: ReturnType<typeof useThemeStore.getState> }) {
  return (
    <>
      <CategorySection title="Commonly Used">
        <SettingRow
          label="Color Theme"
          description="Specifies the color theme used in the workbench."
          control={
            <Select
              value={theme.theme}
              onChange={(v) => theme.setTheme(v as Theme)}
              options={[
                { label: 'Dark+ (default dark)', value: 'dark' },
                { label: 'Light+ (default light)', value: 'light' },
                { label: 'Monokai', value: 'monokai' },
                { label: 'Solarized Dark', value: 'solarized' },
                { label: 'GitHub', value: 'github' },
              ]}
            />
          }
        />
        <SettingRow
          label="editor.fontSize"
          description="Controls the font size in pixels."
          control={<NumberInput value={s.fontSize} onChange={s.setFontSize} min={8} max={40} />}
        />
        <SettingRow
          label="editor.wordWrap"
          description="Controls how lines should wrap."
          control={
            <Select
              value={s.wordWrap}
              onChange={(v) => s.setWordWrap(v as any)}
              options={[
                { label: 'off', value: 'off' },
                { label: 'on', value: 'on' },
                { label: 'wordWrapColumn', value: 'wordWrapColumn' },
                { label: 'bounded', value: 'bounded' },
              ]}
            />
          }
        />
        <SettingRow
          label="editor.minimap.enabled"
          description="Controls whether the minimap is shown."
          control={<Toggle value={s.minimap} onChange={s.toggleMinimap} />}
        />
        <SettingRow
          label="files.autoSave"
          description="Controls auto save of editors that have unsaved changes."
          control={
            <Select
              value={s.autoSave}
              onChange={(v) => s.setAutoSave(v as any)}
              options={[
                { label: 'off', value: 'off' },
                { label: 'afterDelay', value: 'afterDelay' },
                { label: 'onFocusChange', value: 'onFocusChange' },
              ]}
            />
          }
        />
        <SettingRow
          label="editor.tabSize"
          description="The number of spaces a tab is equal to."
          control={
            <Select
              value={String(s.tabSize)}
              onChange={(v) => s.setTabSize(Number(v))}
              options={[2, 4, 8].map((n) => ({ label: String(n), value: String(n) }))}
            />
          }
        />
      </CategorySection>
    </>
  );
}

function FontSettings({ s }: { s: ReturnType<typeof useSettingsStore.getState> }) {
  return (
    <CategorySection title="Font">
      <SettingRow
        label="editor.fontSize"
        description="Controls the font size in pixels."
        control={<NumberInput value={s.fontSize} onChange={s.setFontSize} min={8} max={40} />}
      />
      <SettingRow
        label="editor.fontFamily"
        description="Controls the font family."
        control={<TextInput value={s.fontFamily} onChange={s.setFontFamily} />}
      />
      <SettingRow
        label="editor.fontLigatures"
        description="Enables/disables font ligatures."
        control={<Toggle value={s.fontLigatures} onChange={s.setFontLigatures} />}
      />
    </CategorySection>
  );
}

function EditorSettings({ s }: { s: ReturnType<typeof useSettingsStore.getState> }) {
  return (
    <CategorySection title="Editor">
      <SettingRow
        label="editor.wordWrap"
        description="Controls how lines should wrap."
        control={
          <Select
            value={s.wordWrap}
            onChange={(v) => s.setWordWrap(v as any)}
            options={[
              { label: 'off', value: 'off' },
              { label: 'on', value: 'on' },
              { label: 'wordWrapColumn', value: 'wordWrapColumn' },
              { label: 'bounded', value: 'bounded' },
            ]}
          />
        }
      />
      <SettingRow
        label="editor.lineNumbers"
        description="Controls the display of line numbers."
        control={
          <Select
            value={s.lineNumbers}
            onChange={(v) => s.setLineNumbers(v as any)}
            options={[
              { label: 'on', value: 'on' },
              { label: 'off', value: 'off' },
              { label: 'relative', value: 'relative' },
            ]}
          />
        }
      />
      <SettingRow
        label="editor.minimap.enabled"
        description="Controls whether the minimap is shown."
        control={<Toggle value={s.minimap} onChange={s.toggleMinimap} />}
      />
      <SettingRow
        label="editor.tabSize"
        description="The number of spaces a tab is equal to."
        control={
          <Select
            value={String(s.tabSize)}
            onChange={(v) => s.setTabSize(Number(v))}
            options={[2, 4, 8].map((n) => ({ label: String(n), value: String(n) }))}
          />
        }
      />
      <SettingRow
        label="editor.insertSpaces"
        description="Insert spaces when pressing Tab."
        control={<Toggle value={s.insertSpaces} onChange={s.setInsertSpaces} />}
      />
      <SettingRow
        label="editor.renderWhitespace"
        description="Controls how whitespace is rendered in the editor."
        control={
          <Select
            value={s.renderWhitespace}
            onChange={(v) => s.setRenderWhitespace(v as any)}
            options={[
              { label: 'none', value: 'none' },
              { label: 'selection', value: 'selection' },
              { label: 'all', value: 'all' },
            ]}
          />
        }
      />
      <SettingRow
        label="editor.bracketPairColorization.enabled"
        description="Controls whether bracket pair colorization is enabled."
        control={<Toggle value={s.bracketPairColorization} onChange={s.setBracketPairColorization} />}
      />
      <SettingRow
        label="editor.stickyScroll.enabled"
        description="Shows the nested current scopes during scroll."
        control={<Toggle value={s.stickyScroll} onChange={s.setStickyScroll} />}
      />
    </CategorySection>
  );
}

function CursorSettings({ s }: { s: ReturnType<typeof useSettingsStore.getState> }) {
  return (
    <CategorySection title="Cursor">
      <SettingRow
        label="editor.cursorStyle"
        description="Controls the cursor style."
        control={
          <Select
            value={s.cursorStyle}
            onChange={(v) => s.setCursorStyle(v as any)}
            options={[
              { label: 'line', value: 'line' },
              { label: 'block', value: 'block' },
              { label: 'underline', value: 'underline' },
            ]}
          />
        }
      />
      <SettingRow
        label="editor.cursorBlinking"
        description="Controls the cursor animation style."
        control={
          <Select
            value={s.cursorBlinking}
            onChange={(v) => s.setCursorBlinking(v as any)}
            options={[
              { label: 'blink', value: 'blink' },
              { label: 'smooth', value: 'smooth' },
              { label: 'phase', value: 'phase' },
              { label: 'expand', value: 'expand' },
              { label: 'solid', value: 'solid' },
            ]}
          />
        }
      />
    </CategorySection>
  );
}

function FormattingSettings({ s }: { s: ReturnType<typeof useSettingsStore.getState> }) {
  return (
    <CategorySection title="Formatting">
      <SettingRow
        label="editor.formatOnSave"
        description="Format a file on save."
        control={<Toggle value={s.formatOnSave} onChange={s.setFormatOnSave} />}
      />
      <SettingRow
        label="editor.formatOnPaste"
        description="Controls whether the editor should automatically format the pasted content."
        control={<Toggle value={s.formatOnPaste} onChange={s.setFormatOnPaste} />}
      />
      <SettingRow
        label="editor.formatOnType"
        description="Controls whether the editor should automatically format the line after typing."
        control={<Toggle value={s.formatOnType} onChange={s.setFormatOnType} />}
      />
    </CategorySection>
  );
}

function FilesSettings({ s }: { s: ReturnType<typeof useSettingsStore.getState> }) {
  return (
    <CategorySection title="Files">
      <SettingRow
        label="files.autoSave"
        description="Controls auto save of unsaved editors."
        control={
          <Select
            value={s.autoSave}
            onChange={(v) => s.setAutoSave(v as any)}
            options={[
              { label: 'off', value: 'off' },
              { label: 'afterDelay', value: 'afterDelay' },
              { label: 'onFocusChange', value: 'onFocusChange' },
            ]}
          />
        }
      />
      <SettingRow
        label="files.autoSaveDelay"
        description="Controls the delay in ms after which an editor with unsaved changes is saved automatically (when files.autoSave is set to afterDelay)."
        control={<NumberInput value={s.autoSaveDelay} onChange={s.setAutoSaveDelay} min={100} max={10000} step={100} />}
      />
    </CategorySection>
  );
}

const CATEGORY_CONTENT_MAP: Record<string, React.ComponentType<{ s: ReturnType<typeof useSettingsStore.getState>, theme: ReturnType<typeof useThemeStore.getState> }>> = {};

export function SettingsPanel({ onClose }: Props) {
  const [activeCategory, setActiveCategory] = useState('commonly-used');
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['text-editor', 'workbench']));
  const s = useSettingsStore();
  const theme = useThemeStore();

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  function renderContent() {
    switch (activeCategory) {
      case 'commonly-used': return <CommonlyUsedSettings s={s} theme={theme} />;
      case 'font': return <FontSettings s={s} />;
      case 'editor': return <EditorSettings s={s} />;
      case 'cursor': return <CursorSettings s={s} />;
      case 'formatting': return <FormattingSettings s={s} />;
      case 'appearance': return (
        <CategorySection title="Appearance">
          <SettingRow
            label="workbench.colorTheme"
            description="Specifies the color theme used in the workbench."
            control={
              <Select
                value={theme.theme}
                onChange={(v) => theme.setTheme(v as Theme)}
                options={[
                  { label: 'Dark+ (default dark)', value: 'dark' },
                  { label: 'Light+ (default light)', value: 'light' },
                  { label: 'Monokai', value: 'monokai' },
                  { label: 'Solarized Dark', value: 'solarized' },
                  { label: 'GitHub', value: 'github' },
                ]}
              />
            }
          />
        </CategorySection>
      );
      case 'files': return <FilesSettings s={s} />;
      default: return <CommonlyUsedSettings s={s} theme={theme} />;
    }
  }

  function renderCategoryTree(cats: Category[], depth = 0) {
    return cats.map((cat) => {
      const isActive = activeCategory === cat.id;
      const isExpanded = expandedCategories.has(cat.id);
      const hasChildren = cat.children && cat.children.length > 0;

      return (
        <div key={cat.id}>
          <div
            onClick={() => {
              if (hasChildren) toggleCategory(cat.id);
              setActiveCategory(cat.id);
            }}
            className={`flex items-center gap-1 py-1 px-3 cursor-pointer text-[12px] rounded ${
              isActive
                ? 'bg-[var(--vscode-list-active)] text-[var(--vscode-fg)]'
                : 'hover:bg-[var(--vscode-list-hover)] text-[var(--vscode-fg)] opacity-70 hover:opacity-100'
            }`}
            style={{ paddingLeft: 12 + depth * 12 }}
          >
            {hasChildren && (
              <span className="w-3 h-3 flex items-center justify-center opacity-60">
                {isExpanded ? '▾' : '▸'}
              </span>
            )}
            <span>{cat.label}</span>
          </div>
          {hasChildren && isExpanded && renderCategoryTree(cat.children!, depth + 1)}
        </div>
      );
    });
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        backgroundColor: 'var(--vscode-editor-bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 16px',
          borderBottom: '1px solid var(--vscode-border)',
          flexShrink: 0,
          gap: 12,
          backgroundColor: 'var(--vscode-sidebar-bg)',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--vscode-fg)' }}>Settings</span>
        <div style={{ flex: 1 }}>
          <input
            type="text"
            placeholder="Search settings"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-xl bg-[var(--vscode-input-bg)] border border-[var(--vscode-input-border)] text-[var(--vscode-fg)] text-[12px] px-3 py-1.5 rounded outline-none focus:border-[var(--vscode-focusBorder)] placeholder:opacity-40"
          />
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center hover:bg-[var(--vscode-list-hover)] rounded opacity-60 hover:opacity-100"
        >
          <CloseIcon size={16} />
        </button>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left sidebar */}
        <div
          style={{
            width: 220,
            flexShrink: 0,
            overflowY: 'auto',
            borderRight: '1px solid var(--vscode-border)',
            backgroundColor: 'var(--vscode-sidebar-bg)',
            padding: '8px 0',
          }}
        >
          {renderCategoryTree(CATEGORIES)}
        </div>

        {/* Settings content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 24px',
            backgroundColor: 'var(--vscode-editor-bg)',
          }}
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
