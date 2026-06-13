---
Task ID: 1
Agent: Main Agent
Task: Add missing features from code-server to VS Code Web Replica

Work Log:
- Researched code-server features from https://github.com/coder/code-server
- Identified 12+ missing features to implement
- Created 3 new Zustand stores: authStore, notificationStore, portStore
- Created LoginScreen component with password auth and rate limiting
- Created NotificationCenter component with read/dismiss/actions
- Created PortsPanel component with port forwarding UI
- Created WorkspaceTrustDialog component
- Updated StatusBar with remote connection indicator and notification bell badge
- Updated BottomPanel to include PORTS tab
- Updated ExplorerView with file upload and download capabilities
- Enhanced terminal with 40+ commands (head, tail, wc, grep, find, curl, ping, code-server, etc.)
- Added tab completion to TerminalInput
- Updated TitleBar with code-server branding, remote indicator, and Sign Out option
- Updated page.tsx to wire all new features together
- All lint checks pass
- Browser verification passed for all features

Stage Summary:
- Login screen with password "vscode" and rate limiting
- Remote connection indicator (green dot) in status bar
- Notification center with unread badge and update notifications
- Ports panel with 4 pre-configured ports (2 running)
- File upload via toolbar button, download via right-click context menu
- 40+ terminal commands with tab completion
- Workspace trust dialog on first open
- Sign Out option in Help menu
- code-server branding in title bar
