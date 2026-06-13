import { create } from 'zustand';

export interface PortForward {
  id: string;
  localPort: number;
  remotePort: number;
  protocol: 'http' | 'https' | 'tcp';
  name: string;
  running: boolean;
  pid?: number;
}

interface PortState {
  ports: PortForward[];
  addPort: (port: Omit<PortForward, 'id' | 'running'>) => void;
  removePort: (id: string) => void;
  togglePort: (id: string) => void;
  startPort: (id: string) => void;
  stopPort: (id: string) => void;
}

let nextPortId = 1;

export const usePortStore = create<PortState>((set, get) => ({
  ports: [
    {
      id: 'p-1',
      localPort: 3000,
      remotePort: 3000,
      protocol: 'http',
      name: 'Next.js Dev Server',
      running: true,
      pid: 12345,
    },
    {
      id: 'p-2',
      localPort: 5173,
      remotePort: 5173,
      protocol: 'http',
      name: 'Vite Dev Server',
      running: false,
    },
    {
      id: 'p-3',
      localPort: 8080,
      remotePort: 8080,
      protocol: 'http',
      name: 'code-server',
      running: true,
      pid: 1000,
    },
    {
      id: 'p-4',
      localPort: 5500,
      remotePort: 5500,
      protocol: 'http',
      name: 'Live Server',
      running: false,
    },
  ],

  addPort: (port) => {
    const newPort: PortForward = {
      ...port,
      id: `p-${nextPortId++}`,
      running: false,
    };
    set({ ports: [...get().ports, newPort] });
  },

  removePort: (id) => {
    set({ ports: get().ports.filter((p) => p.id !== id) });
  },

  togglePort: (id) => {
    set({
      ports: get().ports.map((p) =>
        p.id === id ? { ...p, running: !p.running, pid: !p.running ? Math.floor(Math.random() * 50000) + 10000 : undefined } : p
      ),
    });
  },

  startPort: (id) => {
    set({
      ports: get().ports.map((p) =>
        p.id === id ? { ...p, running: true, pid: Math.floor(Math.random() * 50000) + 10000 } : p
      ),
    });
  },

  stopPort: (id) => {
    set({
      ports: get().ports.map((p) =>
        p.id === id ? { ...p, running: false, pid: undefined } : p
      ),
    });
  },
}));
