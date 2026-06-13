'use client';

import { create } from 'zustand';

interface AICompletion {
  id: string;
  text: string;
  displayText: string;
  language: string;
  isProcessing: boolean;
  timestamp: number;
}

interface AICompletionState {
  enabled: boolean;
  isProcessing: boolean;
  currentCompletion: AICompletion | null;
  completionHistory: AICompletion[];
  debounceTimer: ReturnType<typeof setTimeout> | null;

  setEnabled: (enabled: boolean) => void;
  requestCompletion: (context: {
    prefix: string;
    suffix: string;
    language: string;
    fileName: string;
  }) => void;
  acceptCompletion: () => void;
  dismissCompletion: () => void;
  clearHistory: () => void;
}

// Simulated AI completion suggestions based on context
const COMPLETION_TEMPLATES: Record<string, { prefix: string; completion: string }[]> = {
  typescript: [
    { prefix: 'const ', completion: 'result = await fetchData();\nconsole.log(result);' },
    { prefix: 'interface ', completion: 'Props {\n  children: React.ReactNode;\n  className?: string;\n}' },
    { prefix: 'export function ', completion: 'Component({ props }: Props) {\n  return <div>{props.children}</div>;\n}' },
    { prefix: 'useEffect', completion: '(() => {\n  // Setup\n  return () => {\n    // Cleanup\n  };\n}, []);' },
    { prefix: 'async ', completion: 'function handleRequest(req: Request): Promise<Response> {\n  try {\n    const data = await req.json();\n    return Response.json({ success: true, data });\n  } catch (error) {\n    return Response.json({ error: "Invalid request" }, { status: 400 });\n  }\n}' },
    { prefix: 'const [', completion: 'state, setState] = useState(initialValue);' },
    { prefix: 'if (', completion: 'condition) {\n  // Handle true case\n} else {\n  // Handle false case\n}' },
    { prefix: 'try ', completion: '{\n  const result = await operation();\n  return result;\n} catch (error) {\n  console.error(error);\n  throw error;\n}' },
    { prefix: 'import ', completion: '{ useState, useEffect } from "react";' },
    { prefix: 'export default ', completion: 'function Page() {\n  return <main>\n    <h1>Hello World</h1>\n  </main>;\n}' },
  ],
  javascript: [
    { prefix: 'const ', completion: 'result = await fetchData();\nconsole.log(result);' },
    { prefix: 'export function ', completion: 'handler(req, res) {\n  const { method } = req;\n  switch (method) {\n    case "GET":\n      return res.status(200).json({ data: [] });\n    default:\n      return res.status(405).end();\n  }\n}' },
    { prefix: 'module.exports', completion: ' = {\n  handler,\n  middleware,\n};' },
    { prefix: 'async ', completion: 'function processQueue(items) {\n  for (const item of items) {\n    await processItem(item);\n  }\n}' },
  ],
  python: [
    { prefix: 'def ', completion: 'process_data(data: list) -> dict:\n    """Process the input data and return results."""\n    results = {}\n    for item in data:\n        results[item["id"]] = item\n    return results' },
    { prefix: 'class ', completion: 'DataProcessor:\n    def __init__(self, config):\n        self.config = config\n        self.data = []\n\n    def process(self, input_data):\n        return [self._transform(item) for item in input_data]\n\n    def _transform(self, item):\n        return item' },
    { prefix: 'if ', completion: '__name__ == "__main__":\n    main()' },
    { prefix: 'async def ', completion: 'fetch_data(url: str) -> dict:\n    async with aiohttp.ClientSession() as session:\n        async with session.get(url) as response:\n            return await response.json()' },
    { prefix: 'from ', completion: 'typing import List, Dict, Optional' },
    { prefix: 'try', completion: ':\n    result = operation()\nexcept Exception as e:\n    logger.error(f"Operation failed: {e}")\n    raise' },
  ],
  go: [
    { prefix: 'func ', completion: 'handler(w http.ResponseWriter, r *http.Request) {\n  w.Header().Set("Content-Type", "application/json")\n  json.NewEncoder(w).Encode(map[string]string{"status": "ok"})\n}' },
    { prefix: 'type ', completion: 'Config struct {\n  Port     int    `json:"port"`\n  Host     string `json:"host"`\n  Database string `json:"database"`\n}' },
    { prefix: 'if err ', completion: '!= nil {\n  log.Printf("Error: %v", err)\n  return err\n}' },
    { prefix: 'go ', completion: 'func() {\n  // Background task\n  result := processAsync()\n  ch <- result\n}()' },
  ],
  rust: [
    { prefix: 'fn ', completion: 'process(input: &str) -> Result<String, Box<dyn std::error::Error>> {\n    let data = parse_input(input)?;\n    let result = transform(data)?;\n    Ok(result.to_string())\n}' },
    { prefix: 'struct ', completion: 'Config {\n    port: u16,\n    host: String,\n    debug: bool,\n}' },
    { prefix: 'impl ', completion: 'Config {\n    fn new() -> Self {\n        Self {\n            port: 8080,\n            host: "127.0.0.1".to_string(),\n            debug: false,\n        }\n    }\n}' },
    { prefix: 'match ', completion: 'result {\n    Ok(value) => println!("Success: {}", value),\n    Err(e) => eprintln!("Error: {}", e),\n}' },
  ],
};

function findBestCompletion(prefix: string, language: string): string {
  const langKey = Object.keys(COMPLETION_TEMPLATES).find(k =>
    language.toLowerCase().includes(k)
  ) || 'typescript';

  const templates = COMPLETION_TEMPLATES[langKey] || COMPLETION_TEMPLATES.typescript;

  // Find the best matching template
  let bestMatch = templates[0];
  let bestScore = 0;

  for (const template of templates) {
    const score = template.prefix.split('').reduce((acc, char, i) => {
      return prefix.includes(char) || prefix.toLowerCase().includes(template.prefix.substring(0, i + 1).toLowerCase())
        ? acc + 1 : acc;
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = template;
    }
  }

  // Add some contextual variation
  const variations = [
    bestMatch.completion,
    bestMatch.completion + '\n',
  ];

  return variations[Math.floor(Math.random() * variations.length)];
}

export const useAICompletionStore = create<AICompletionState>((set, get) => ({
  enabled: true,
  isProcessing: false,
  currentCompletion: null,
  completionHistory: [],
  debounceTimer: null,

  setEnabled: (enabled) => set({ enabled }),

  requestCompletion: (context) => {
    const state = get();

    if (!state.enabled) return;

    // Clear existing timer
    if (state.debounceTimer) {
      clearTimeout(state.debounceTimer);
    }

    // Debounce: wait 800ms after typing stops
    const timer = setTimeout(() => {
      set({ isProcessing: true });

      // Simulate AI processing delay (300-800ms)
      const delay = 300 + Math.random() * 500;

      setTimeout(() => {
        const completionText = findBestCompletion(context.prefix, context.language);

        const completion: AICompletion = {
          id: `completion-${Date.now()}`,
          text: completionText,
          displayText: completionText.split('\n')[0] + (completionText.split('\n').length > 1 ? ' ...' : ''),
          language: context.language,
          isProcessing: false,
          timestamp: Date.now(),
        };

        set({
          isProcessing: false,
          currentCompletion: completion,
          completionHistory: [...state.completionHistory.slice(-49), completion],
        });
      }, delay);
    }, 800);

    set({ debounceTimer: timer, currentCompletion: null });
  },

  acceptCompletion: () => {
    const state = get();
    if (state.currentCompletion) {
      set({ currentCompletion: null });
    }
  },

  dismissCompletion: () => {
    set({ currentCompletion: null });
  },

  clearHistory: () => set({ completionHistory: [] }),
}));
