'use client';

import { create } from 'zustand';
import { executeCode as apiExecute, type ExecutionResult } from '@/lib/api-client';

interface CodeExecutionState {
  isExecuting: boolean;
  results: ExecutionResult[];
  currentResult: ExecutionResult | null;
  showPanel: boolean;
  timeout: number; // ms
  backendAvailable: boolean;

  execute: (code: string, language: string) => void;
  clearResults: () => void;
  togglePanel: () => void;
  showPanelFn: () => void;
  hidePanel: () => void;
  setTimeout: (ms: number) => void;
}

// Local fallback execution engine (used when Go sandbox is unavailable)
function localExecute(code: string, language: string): Omit<ExecutionResult, 'id' | 'timestamp'> {
  const startTime = performance.now();

  try {
    let output = '';
    let error: string | null = null;
    let exitCode = 0;
    let status: ExecutionResult['status'] = 'completed';

    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript': {
        try {
          const logs: string[] = [];
          const mockConsole = {
            log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
            error: (...args: unknown[]) => logs.push('[ERROR] ' + args.map(String).join(' ')),
            warn: (...args: unknown[]) => logs.push('[WARN] ' + args.map(String).join(' ')),
            info: (...args: unknown[]) => logs.push('[INFO] ' + args.map(String).join(' ')),
          };

          const safeCode = code
            .replace(/console\.log/g, '__console.log')
            .replace(/console\.error/g, '__console.error')
            .replace(/console\.warn/g, '__console.warn')
            .replace(/console\.info/g, '__console.info');

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
                code, language, output: '',
                error: `SecurityError: "${pattern.source}" is not allowed in local sandbox mode. Use the Go sandbox service for full execution.`,
                exitCode: 1,
                executionTime: Math.round(performance.now() - startTime),
                status: 'error',
              };
            }
          }

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
        const lines = code.split('\n');
        const outputs: string[] = [];
        for (const line of lines) {
          const printMatch = line.match(/print\s*\(\s*["'](.+)["']\s*\)/);
          if (printMatch) outputs.push(printMatch[1]);
          else if (line.includes('def ')) outputs.push(`[Function defined: ${line.trim()}]`);
          else if (line.includes('class ')) outputs.push(`[Class defined: ${line.trim()}]`);
        }
        output = outputs.join('\n') || '[Python] Code parsed successfully (sandbox unavailable — use Go sandbox for real execution)';
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
          }
        }
        output = outputs.join('\n') || '[Go] Build simulated (sandbox unavailable)';
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
          }
        }
        output = outputs.join('\n') || '[Rust] Compile simulated (sandbox unavailable)';
        break;
      }

      default:
        output = `[${language}] Execution simulated. No runtime available for this language.`;
        break;
    }

    return {
      code, language,
      output: output || '[Process exited with code 0]',
      error, exitCode,
      executionTime: Math.max(Math.round(performance.now() - startTime), 5),
      status,
    };
  } catch (e) {
    return {
      code, language, output: '',
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
  backendAvailable: true,

  execute: async (code, language) => {
    if (!code.trim()) return;
    set({ isExecuting: true });

    try {
      // Try the real Go sandbox API first
      const result = await apiExecute({ code, language, timeout: get().timeout });
      const state = get();
      set({
        isExecuting: false,
        backendAvailable: true,
        results: [...state.results.slice(-19), result],
        currentResult: result,
        showPanel: true,
      });
    } catch {
      // Fallback to local execution
      const fallbackResult = localExecute(code, language);
      const executionResult: ExecutionResult = {
        ...fallbackResult,
        id: `exec-${Date.now()}`,
        timestamp: Date.now(),
      };
      const state = get();
      set({
        isExecuting: false,
        backendAvailable: false,
        results: [...state.results.slice(-19), executionResult],
        currentResult: executionResult,
        showPanel: true,
      });
    }
  },

  clearResults: () => set({ results: [], currentResult: null }),
  togglePanel: () => set((s) => ({ showPanel: !s.showPanel })),
  showPanelFn: () => set({ showPanel: true }),
  hidePanel: () => set({ showPanel: false }),
  setTimeout: (ms) => set({ timeout: ms }),
}));
