'use client';

import type { SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

function Icon({ size = 16, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {children}
    </svg>
  );
}

// Close icon (X)
export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z" />
    </Icon>
  );
}

// Add/Plus icon
export function AddIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1.5v5h5v1h-5v5H7v-5H2v-1h5v-5h1z" />
    </Icon>
  );
}

// Search icon
export function SearchIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className} {...props}>
      <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
    </svg>
  );
}

// Git branch icon
export function GitBranchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z" />
    </Icon>
  );
}

// Warning icon
export function WarningIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1a6 6 0 110 12A6 6 0 018 2zm-.5 2.5v4h1v-4h-1zm0 5v1h1v-1h-1z" />
    </Icon>
  );
}

// Error icon
export function ErrorIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1a6 6 0 110 12A6 6 0 018 2zm2.1 3.6L8.7 7l1.4 1.4-.7.7L8 7.7 6.6 9.1l-.7-.7L7.3 7 5.9 5.6l.7-.7L8 6.3l1.4-1.4.7.7z" />
    </Icon>
  );
}

// Check icon
export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
    </Icon>
  );
}

// Bell icon
export function BellIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1.5a4.5 4.5 0 00-4.5 4.5v2.34l-.96 1.92A1 1 0 003.44 12h2.06a2.5 2.5 0 005 0h2.06a1 1 0 00.9-1.42L12.5 8.34V6A4.5 4.5 0 008 1.5zM9.5 12a1.5 1.5 0 01-3 0h3zM8 2.5A3.5 3.5 0 0111.5 6v2.5a1 1 0 00.1.45l.9 1.8H3.5l.9-1.8a1 1 0 00.1-.45V6A3.5 3.5 0 018 2.5z" />
    </Icon>
  );
}

// Terminal icon
export function TerminalIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 9L3 12l3 3m-2-6h10M1 3h14v10H1V3zm1 1v8h12V4H2z" />
    </Icon>
  );
}

// Problems icon
export function ProblemsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1a6 6 0 110 12A6 6 0 018 2zm-.5 2.5v4h1v-4h-1zm0 5v1h1v-1h-1z" />
    </Icon>
  );
}

// Output icon
export function OutputIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 2h12v12H2V2zm1 1v10h10V3H3zm2 2l2.5 2.5L5 10l.7.7L8.6 7.8 5.7 4.9 5 5zm4 5h3v1H9v-1z" />
    </Icon>
  );
}

// Debug console icon
export function DebugConsoleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5.5 2L3 5h2v4h1V5h2L5.5 2zm4.5 1v6h1V4h2l-2.5-3L8 4h2zM2 11h12v1H2v-1zm0 2h12v1H2v-1z" />
    </Icon>
  );
}

// Debug icon
export function DebugIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1a6 6 0 110 12A6 6 0 018 2zm-1 2.5v4h1v-4H7zm0 5v1h1v-1H7z" />
    </Icon>
  );
}

// ChevronRight icon
export function ChevronRightIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className} {...props}>
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ChevronDown icon
export function ChevronDownIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className} {...props}>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Folder icon
export function FolderIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className} {...props}>
      <path d="M1.5 2h4.6l1.1 1.5H14.5v10h-13V2zm1 1v9.5h11V4.5H6.3L5.2 3H2.5z" />
    </svg>
  );
}

// Folder open icon
export function FolderOpenIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className} {...props}>
      <path d="M1.5 2h4.6l1.1 1.5H14.5V5H2L1.5 2zm.5 4h12l-1.5 7.5H2.5L2 6z" />
    </svg>
  );
}

// File icon
export function FileIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className} {...props}>
      <path d="M10.5 1H3v14h10V3.5L10.5 1zM4 2h6v2h2v10H4V2zm7 .5L13.5 4H11V2.5z" />
    </svg>
  );
}

// New File icon
export function NewFileIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10.5 1H3v14h10V3.5L10.5 1zM4 2h6v2h2v10H4V2zm4 4v2H6v1h2v2h1V9h2V8H9V6H8z" />
    </Icon>
  );
}

// New Folder icon
export function NewFolderIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M1.5 2h4.6l1.1 1.5H14.5v10h-13V2zm1 1v9.5h11V4.5H6.3L5.2 3H2.5zM8 6v2H6v1h2v2h1V9h2V8H9V6H8z" />
    </Icon>
  );
}

// Refresh icon
export function RefreshExplorerIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13 5.5a5.5 5.5 0 01-9.8 3.5l1.1-1.1a4 4 0 007.1-2.4H13v2zM3 10.5A5.5 5.5 0 0112.8 7L11.7 8.1a4 4 0 00-7.1 2.4H3v-2z" />
    </Icon>
  );
}

// Collapse All icon
export function CollapseAllIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 3h12v1H2V3zm2 3h8v1H4V6zm2 3h4v1H6V9z" />
    </Icon>
  );
}

// Command Palette icon
export function CommandPaletteIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 3h12v1H2V3zm0 3h8v1H2V6zm0 3h10v1H2V9zm0 3h6v1H2v-1z" />
    </Icon>
  );
}

// Go to File icon
export function GoToFileIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10.5 1H3v14h10V3.5L10.5 1zM4 2h6v2h2v10H4V2z" />
    </Icon>
  );
}

// Open Folder icon
export function OpenFolderIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M1.5 2h4.6l1.1 1.5H14.5v10h-13V2zm1 1v9.5h11V4.5H6.3L5.2 3H2.5z" />
    </Icon>
  );
}

// Git Clone icon
export function GitCloneIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 3v2H3v1h2v2h1V6h2V5H6V3H5zm6 5v4h1V8h-1zM3 8h7v1H3V8zm0 2h7v1H3v-1z" />
    </Icon>
  );
}

// Info icon
export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1a6 6 0 110 12A6 6 0 018 2zm0 2a.75.75 0 110 1.5A.75.75 0 018 4zm-.5 2.5v4h1v-4h-1z" />
    </Icon>
  );
}

// Extension Icons (from source)
export function StarIcon(props: IconProps) {
  return <Icon {...props}><path d="M8 1.5l1.76 3.57 3.94.57-2.85 2.78.67 3.93L8 10.5l-3.52 1.85.67-3.93L2.3 5.64l3.94-.57L8 1.5z" /></Icon>;
}

export function DownloadIcon(props: IconProps) {
  return <Icon {...props}><path d="M8.5 1.5v7.2l2.1-2.1.7.7-3.3 3.3-3.3-3.3.7-.7 2.1 2.1V1.5h1zM2.5 12.5v1h11v-1h-11z" /></Icon>;
}

export function GearIcon(props: IconProps) {
  return <Icon {...props}><path d="M8 5a3 3 0 110 6 3 3 0 010-6zm0 1a2 2 0 100 4 2 2 0 000-4z" /></Icon>;
}

export function BackIcon(props: IconProps) {
  return <Icon {...props}><path d="M6.5 3L2 8l4.5 5v-3.5H14V6.5H6.5V3z" /></Icon>;
}

export function CaseSensitiveIcon(props: IconProps) {
  return <Icon {...props}><text x="2" y="12" fontSize="10" fontWeight="bold" fontFamily="monospace" fill="currentColor">Aa</text></Icon>;
}

export function WholeWordIcon(props: IconProps) {
  return <Icon {...props}><text x="0" y="12" fontSize="9" fontWeight="bold" fontFamily="monospace" fill="currentColor">{"\\b"}</text></Icon>;
}

export function RegexIcon(props: IconProps) {
  return <Icon {...props}><text x="2" y="12" fontSize="10" fontWeight="bold" fontFamily="monospace" fill="currentColor">.*</text></Icon>;
}

export function ReplaceIcon(props: IconProps) {
  return <Icon {...props}><path d="M11 1.5l2.5 2.5-2.5 2.5V4H6.5v1h-1V3H11V1.5zM5 14.5L2.5 12l2.5-2.5V12h4.5v-1h1v2H5v1.5z" /></Icon>;
}

export function ReplaceAllIcon(props: IconProps) {
  return <Icon {...props}><path d="M11 1.5l2.5 2.5-2.5 2.5V4H6.5v1h-1V3H11V1.5zM5 14.5L2.5 12l2.5-2.5V12h4.5v-1h1v2H5v1.5zM9 7h1v2H9V7zM6 7h1v2H6V7z" /></Icon>;
}

export function PlusIcon(props: IconProps) {
  return <Icon {...props}><path d="M8 2.5v5h5v1h-5v5H7v-5H2v-1h5v-5h1z" /></Icon>;
}

export function MinusIcon(props: IconProps) {
  return <Icon {...props}><path d="M2 7.5h12v1H2v-1z" /></Icon>;
}

export function PlayCircleIcon(props: IconProps) {
  return <Icon {...props}><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1a6 6 0 110 12A6 6 0 018 2zm-1.5 2.5v7l6-3.5-6-3.5z" /></Icon>;
}

export function StopCircleIcon(props: IconProps) {
  return <Icon {...props}><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1a6 6 0 110 12A6 6 0 018 2zm-2.5 2.5h5v5h-5v-5z" /></Icon>;
}

export function ListTreeIcon(props: IconProps) {
  return <Icon {...props}><path d="M4.5 2.5v2h-2v1h2v6h-2v1h2v2h1v-2h6v2h1v-2h2v-1h-2v-6h2v-1h-2v-2h-1v2h-6v-2h-1zm1 3h6v6h-6v-6z" /></Icon>;
}
