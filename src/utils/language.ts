const LANG_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  py: 'python', go: 'go', rs: 'rust', java: 'java', cpp: 'cpp', c: 'c', h: 'c',
  html: 'html', css: 'css', scss: 'scss', json: 'json', yaml: 'yaml', yml: 'yaml',
  sql: 'sql', sh: 'shell', bash: 'shell', md: 'markdown', markdown: 'markdown',
  dockerfile: 'dockerfile', xml: 'xml', svg: 'xml', vue: 'html', svelte: 'html',
  txt: 'plaintext', rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin',
  dart: 'dart', cs: 'csharp', r: 'r', lua: 'lua', pl: 'perl',
};

export function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (filename.toLowerCase().startsWith('dockerfile')) return 'dockerfile';
  return LANG_MAP[ext] || 'plaintext';
}
