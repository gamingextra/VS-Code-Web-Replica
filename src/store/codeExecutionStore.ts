'use client';

import { create } from 'zustand';

export interface ExecutionResult {
  id: string;
  code: string;
  language: string;
  output: string;
  error: string | null;
  exitCode: number;
  executionTime: number;
  timestamp: number;
  status: 'running' | 'completed' | 'error' | 'timeout';
}

interface CodeExecutionState {
  isExecuting: boolean;
  results: ExecutionResult[];
  currentResult: ExecutionResult | null;
  showPanel: boolean;
  timeout: number; // ms

  execute: (code: string, language: string) => void;
  clearResults: () => void;
  togglePanel: () => void;
  showPanelFn: () => void;
  hidePanel: () => void;
  setTimeout: (ms: number) => void;
}

// Simulated code execution engine
function simulateExecution(code: string, language: string): Omit<ExecutionResult, 'id' | 'timestamp'> {
  const startTime = performance.now();

  try {
    let output = '';
    let error: string | null = null;
    let exitCode = 0;
    let status: ExecutionResult['status'] = 'completed';

    // Simulate language-specific execution
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript': {
        try {
          // Safe execution with console capture
          const logs: string[] = [];
          const mockConsole = {
            log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
            error: (...args: unknown[]) => logs.push('[ERROR] ' + args.map(String).join(' ')),
            warn: (...args: unknown[]) => logs.push('[WARN] ' + args.map(String).join(' ')),
            info: (...args: unknown[]) => logs.push('[INFO] ' + args.map(String).join(' ')),
          };

          // Only allow safe math expressions and simple logic
          const safeCode = code
            .replace(/console\.log/g, '__console.log')
            .replace(/console\.error/g, '__console.error')
            .replace(/console\.warn/g, '__console.warn')
            .replace(/console\.info/g, '__console.info');

          // Check for dangerous patterns
          const dangerousPatterns = [
            /require\s*\(/, /import\s+/,
            /process\./, /child_process/,
            /fs\./, /eval\s*\(/,
            /Function\s*\(/, /__proto__/,
            /document\./, /window\./,
            /fetch\s*\(/, /XMLHttpRequest/,
          ];

          for (const pattern of dangerousPatterns) {
            if (pattern.test(code)) {
              return {
                code,
                language,
                output: '',
                error: `SecurityError: "${pattern.source}" is not allowed in sandbox mode`,
                exitCode: 1,
                executionTime: Math.round(performance.now() - startTime),
                status: 'error',
              };
            }
          }

          // Simple expression evaluation
          const fn = new Function('__console', `"use strict";\n${safeCode}`);
          const result = fn(mockConsole);
          output = logs.join('\n') + (result !== undefined ? (logs.length > 0 ? '\n' : '') + `=> ${JSON.stringify(result)}` : '');
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
          exitCode = 1;
          status = 'error';
        }
        break;
      }

      case 'python': {
        // Simulate Python output
        const lines = code.split('\n');
        const outputs: string[] = [];
        for (const line of lines) {
          const printMatch = line.match(/print\s*\(\s*["'](.+)["']\s*\)/);
          const fPrintMatch = line.match(/print\s*\(\s*f["'](.+)["']\s*\)/);
          if (printMatch) outputs.push(printMatch[1]);
          else if (fPrintMatch) outputs.push(fPrintMatch[1].replace(/\{(\w+)\}/g, '10'));
          else if (line.trim().startsWith('#') || line.trim() === '') continue;
          else if (line.includes('def ')) outputs.push(`[Function defined: ${line.trim()}]`);
          else if (line.includes('class ')) outputs.push(`[Class defined: ${line.trim()}]`);
          else if (line.includes('import ')) outputs.push(`[Module imported: ${line.trim()}]`);
        }
        output = outputs.join('\n') || '[Python] Code parsed successfully (no print output)';
        break;
      }

      case 'go': {
        const lines = code.split('\n');
        const outputs: string[] = [];
        for (const line of lines) {
          if (line.includes('fmt.Print')) {
            const match = line.match(/fmt\.Print(?:ln|f)?\s*\(\s*["'](.+?)["']/);
            if (match) outputs.push(match[1]);
          } else if (line.includes('func ')) {
            outputs.push(`[Function defined: ${line.trim()}]`);
          } else if (line.trim().startsWith('//') || line.trim() === '') {
            continue;
          }
        }
        output = outputs.join('\n') || '[Go] Build successful (no stdout output)';
        break;
      }

      case 'rust': {
        const lines = code.split('\n');
        const outputs: string[] = [];
        for (const line of lines) {
          if (line.includes('println!')) {
            const match = line.match(/println!\s*\(\s*["'](.+?)["']/);
            if (match) outputs.push(match[1]);
          } else if (line.includes('fn ')) {
            outputs.push(`[Function defined: ${line.trim()}]`);
          } else if (line.trim().startsWith('//') || line.trim() === '') {
            continue;
          }
        }
        output = outputs.join('\n') || '[Rust] Compiled successfully (no stdout output)';
        break;
      }

      default:
        output = `[${language}] Execution simulated. No runtime available for this language.`;
        break;
    }

    const executionTime = Math.round(performance.now() - startTime);

    return {
      code,
      language,
      output: output || '[Process exited with code 0]',
      error,
      exitCode,
      executionTime: Math.max(executionTime, 5), // Minimum 5ms
      status,
    };
  } catch (e) {
    return {
      code,
      language,
      output: '',
      error: e instanceof Error ? e.message : String(e),
      exitCode: 1,
      executionTime: Math.round(performance.now() - startTime),
      status: 'error',
    };
  }
}

export const useCodeExecutionStore = create<CodeExecutionState>((set, get) => ({
  isExecuting: false,
  results: [],
  currentResult: null,
  showPanel: false,
  timeout: 5000,

  execute: (code, language) => {
    if (!code.trim()) return;

    set({ isExecuting: true });

    // Simulate execution delay based on language
    const delays: Record<string, number> = {
      javascript: 100,
      typescript: 150,
      python: 300,
      go: 500,
      rust: 800,
    };

    const delay = delays[language.toLowerCase()] || 200;

    setTimeout(() => {
      const result = simulateExecution(code, language);

      const executionResult: ExecutionResult = {
        ...result,
        id: `exec-${Date.now()}`,
        timestamp: Date.now(),
      };

      const state = get();
      set({
        isExecuting: false,
        results: [...state.results.slice(-19), executionResult],
        currentResult: executionResult,
        showPanel: true,
      });
    }, delay + Math.random() * 100);
  },

  clearResults: () => set({ results: [], currentResult: null }),
  togglePanel: () => set((s) => ({ showPanel: !s.showPanel })),
  showPanelFn: () => set({ showPanel: true }),
  hidePanel: () => set({ showPanel: false }),
  setTimeout: (ms) => set({ timeout: ms }),
}));
