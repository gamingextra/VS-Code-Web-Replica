'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCoreHealth, type ServiceHealth, type ServiceStatus } from '@/lib/api-client';

interface ServiceInfo {
  name: string;
  technology: string;
  port: number;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  url: string;
}

const SERVICE_MAP: Record<string, { technology: string; port: number }> = {
  core: { technology: 'TypeScript (Node.js)', port: 3001 },
  sandbox: { technology: 'Go / Python', port: 3002 },
  search: { technology: 'Rust', port: 3003 },
  copilot: { technology: 'Python', port: 3004 },
};

export function ServiceHealthPanel() {
  const [health, setHealth] = useState<ServiceHealth | null>(null);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const loadHealth = useCallback(async () => {
    setLoading(true);
    try {
      const h = await getCoreHealth();
      setHealth(h);

      const serviceInfos: ServiceInfo[] = [];
      if (h.services) {
        for (const [name, status] of Object.entries(h.services)) {
          const s = status as ServiceStatus;
          const meta = SERVICE_MAP[name] || { technology: 'Unknown', port: 0 };
          serviceInfos.push({
            name,
            technology: meta.technology,
            port: meta.port,
            status: s.healthy ? 'healthy' : 'unhealthy',
            responseTime: s.responseTime,
            url: s.url,
          });
        }
      }
      setServices(serviceInfos);
    } catch {
      setHealth(null);
      setServices(
        Object.entries(SERVICE_MAP).map(([name, meta]) => ({
          name,
          technology: meta.technology,
          port: meta.port,
          status: 'unknown' as const,
          url: `http://localhost:${meta.port}`,
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Initial load via interval — first tick fires immediately
    const interval = setInterval(loadHealth, 30000);
    // Fire the first load outside of the effect's synchronous phase
    const timer = setTimeout(loadHealth, 0);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [loadHealth]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#4ec9b0';
      case 'unhealthy': return '#f48771';
      default: return '#858585';
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '●';
      case 'unhealthy': return '●';
      default: return '○';
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        title="Backend Services Status"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 8px',
          height: 22,
          background: 'transparent',
          border: 'none',
          color: 'var(--vscode-fg)',
          cursor: 'pointer',
          fontSize: 11,
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          opacity: 0.7,
        }}
      >
        <span style={{ fontSize: 8, color: health?.status === 'ok' ? '#4ec9b0' : '#858585' }}>⬤</span>
        Services
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 28,
        right: 12,
        width: 340,
        backgroundColor: 'var(--vscode-panel-bg)',
        border: '1px solid var(--vscode-border)',
        borderRadius: 6,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        zIndex: 1000,
        overflow: 'hidden',
        fontSize: 12,
        color: 'var(--vscode-fg)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--vscode-border)',
          backgroundColor: 'var(--vscode-sidebar-bg)',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 11, letterSpacing: 0.3 }}>
          Backend Services
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={loadHealth}
            disabled={loading}
            style={{
              padding: '2px 8px',
              fontSize: 10,
              background: 'transparent',
              border: '1px solid var(--vscode-border)',
              borderRadius: 3,
              color: 'var(--vscode-fg)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 0.7,
            }}
          >
            {loading ? '...' : 'Refresh'}
          </button>
          <button
            onClick={() => setExpanded(false)}
            style={{
              padding: '2px 6px',
              fontSize: 12,
              background: 'transparent',
              border: 'none',
              color: 'var(--vscode-fg)',
              cursor: 'pointer',
              opacity: 0.5,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Services List */}
      <div style={{ padding: '8px 0' }}>
        {services.map((service) => (
          <div
            key={service.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '6px 12px',
              gap: 8,
              cursor: 'default',
            }}
          >
            <span style={{ color: statusColor(service.status), fontSize: 10 }}>
              {statusIcon(service.status)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{service.name}</span>
                <span style={{ fontSize: 10, opacity: 0.4 }}>:{service.port}</span>
              </div>
              <div style={{ fontSize: 10, opacity: 0.5, marginTop: 1 }}>
                {service.technology}
              </div>
            </div>
            {service.responseTime !== undefined && (
              <span style={{ fontSize: 10, opacity: 0.4 }}>
                {service.responseTime}ms
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Architecture Info */}
      <div
        style={{
          padding: '8px 12px',
          borderTop: '1px solid var(--vscode-border)',
          fontSize: 10,
          opacity: 0.5,
        }}
      >
        Architecture: Core API (TS) + Sandbox (Go) + Search (Rust) + Copilot (Python)
      </div>
    </div>
  );
}
