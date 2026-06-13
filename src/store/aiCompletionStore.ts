'use client';

import { create } from 'zustand';
import { getCompletion as apiGetCompletion, type CompletionResult } from '@/lib/api-client';

interface AICompletion {
  id: string;
  text: string;
  displayText: string;
  language: string;
  isProcessing: boolean;
  timestamp: number;
  confidence: number;
  source: string;
}

interface AICompletionState {
  enabled: boolean;
  isProcessing: boolean;
  currentCompletion: AICompletion | null;
  completionHistory: AICompletion[];
  debounceTimer: ReturnType<typeof setTimeout> | null;
  backendAvailable: boolean;

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

// Fallback template-based completions (used when Python copilot is unavailable)
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
  ],
  javascript: [
    { prefix: 'const ', completion: 'result = await fetchData();\nconsole.log(result);' },
    { prefix: 'export function ', completion: 'handler(req, res) {\n  const { method } = req;\n  switch (method) {\n    case "GET":\n      return res.status(200).json({ data: [] });\n    default:\n      return res.status(405).end();\n  }\n}' },
  ],
  python: [
    { prefix: 'def ', completion: 'process_data(data: list) -> dict:\n    """Process the input data and return results."""\n    results = {}\n    for item in data:\n        results[item["id"]] = item\n    return results' },
    { prefix: 'class ', completion: 'DataProcessor:\n    def __init__(self, config):\n        self.config = config\n        self.data = []\n\n    def process(self, input_data):\n        return [self._transform(item) for item in input_data]' },
    { prefix: 'if ', completion: '__name__ == "__main__":\n    main()' },
    { prefix: 'async def ', completion: 'fetch_data(url: str) -> dict:\n    async with aiohttp.ClientSession() as session:\n        async with session.get(url) as response:\n            return await response.json()' },
  ],
  go: [
    { prefix: 'func ', completion: 'handler(w http.ResponseWriter, r *http.Request) {\n  w.Header().Set("Content-Type", "application/json")\n  json.NewEncoder(w).Encode(map[string]string{"status": "ok"})\n}' },
    { prefix: 'type ', completion: 'Config struct {\n  Port     int    `json:"port"`\n  Host     string `json:"host"`\n  Database string `json:"database"`\n}' },
    { prefix: 'if err ', completion: '!= nil {\n  log.Printf("Error: %v", err)\n  return err\n}' },
  ],
  rust: [
    { prefix: 'fn ', completion: 'process(input: &str) -> Result<String, Box<dyn std::error::Error>> {\n    let data = parse_input(input)?;\n    let result = transform(data)?;\n    Ok(result.to_string())\n}' },
    { prefix: 'struct ', completion: 'Config {\n    port: u16,\n    host: String,\n    debug: bool,\n}' },
    { prefix: 'match ', completion: 'result {\n    Ok(value) => println!("Success: {}", value),\n    Err(e) => eprintln!("Error: {}", e),\n}' },
  ],
};

function localCompletion(prefix: string, language: string): string {
  const langKey = Object.keys(COMPLETION_TEMPLATES).find(k =>
    language.toLowerCase().includes(k)
  ) || 'typescript';
  const templates = COMPLETION_TEMPLATES[langKey] || COMPLETION_TEMPLATES.typescript;

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

  return bestMatch.completion;
}

export const useAICompletionStore = create<AICompletionState>((set, get) => ({
  enabled: true,
  isProcessing: false,
  currentCompletion: null,
  completionHistory: [],
  debounceTimer: null,
  backendAvailable: true,

  setEnabled: (enabled) => set({ enabled }),

  requestCompletion: (context) => {
    const state = get();
    if (!state.enabled) return;

    if (state.debounceTimer) {
      clearTimeout(state.debounceTimer);
    }

    // Debounce: wait 800ms after typing stops
    const timer = setTimeout(async () => {
      set({ isProcessing: true });

      try {
        // Try Python copilot service first
        const result = await apiGetCompletion({
          prefix: context.prefix,
          suffix: context.suffix,
          language: context.language,
          fileName: context.fileName,
        });

        if (result && result.text) {
          const completion: AICompletion = {
            id: result.id,
            text: result.text,
            displayText: result.display_text || result.text.split('\n')[0] + (result.text.includes('\n') ? ' ...' : ''),
            language: context.language,
            isProcessing: false,
            timestamp: Date.now(),
            confidence: result.confidence,
            source: result.source,
          };
          set({
            isProcessing: false,
            backendAvailable: true,
            currentCompletion: completion,
            completionHistory: [...state.completionHistory.slice(-49), completion],
          });
          return;
        }
      } catch {
        // Copilot service unavailable, use local fallback
      }

      // Fallback: local template-based completion
      const delay = 300 + Math.random() * 500;
      setTimeout(() => {
        const completionText = localCompletion(context.prefix, context.language);
        const completion: AICompletion = {
          id: `completion-${Date.now()}`,
          text: completionText,
          displayText: completionText.split('\n')[0] + (completionText.split('\n').length > 1 ? ' ...' : ''),
          language: context.language,
          isProcessing: false,
          timestamp: Date.now(),
          confidence: 0.5,
          source: 'fallback',
        };

        set({
          isProcessing: false,
          backendAvailable: false,
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
