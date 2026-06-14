export interface Extension {
  id: string;
  name: string;
  publisher: string;
  description: string;
  version: string;
  rating: number;
  downloads: string;
  installed: boolean;
  enabled: boolean;
  iconColor: string;
  isFunctional: boolean;
  readme: string;
  features: string[];
  changelog: { version: string; date: string; notes: string }[];
}

export const extensions: Extension[] = [
  {
    id: 'esbenp.prettier-vscode',
    name: 'Prettier',
    publisher: 'Prettier',
    description: 'Code formatter using prettier',
    version: '10.1.0',
    rating: 4.7,
    downloads: '35M',
    installed: true,
    enabled: true,
    iconColor: '#c596c7',
    isFunctional: true,
    readme: '# Prettier - Code formatter\n\nPrettier is an opinionated code formatter.\n\n## Features\n- Formats JavaScript, TypeScript, CSS, HTML, JSON, and more\n- Integrates with VS Code format on save\n- Supports configuration files\n\n## Usage\n\nSet Prettier as your default formatter and enable format on save for the best experience.',
    features: ['Format on save', 'Format selection', 'Multiple language support', 'Config file support', 'Ignore file support'],
    changelog: [
      { version: '10.1.0', date: '2024-01-15', notes: 'Added support for new CSS features' },
      { version: '10.0.0', date: '2023-12-01', notes: 'Major update with Prettier 3.0' },
    ],
  },
  {
    id: 'dbaeumer.vscode-eslint',
    name: 'ESLint',
    publisher: 'Microsoft',
    description: 'Integrates ESLint JavaScript into VS Code',
    version: '2.4.4',
    rating: 4.6,
    downloads: '28M',
    installed: true,
    enabled: true,
    iconColor: '#4b32c3',
    isFunctional: true,
    readme: '# ESLint\n\nIntegrates ESLint into VS Code.\n\n## Features\n- Real-time linting feedback\n- Auto-fix on save\n- Custom rule configuration\n- Supports JavaScript and TypeScript',
    features: ['Real-time linting', 'Auto-fix on save', 'Custom rules', 'TypeScript support', 'Plugin support'],
    changelog: [
      { version: '2.4.4', date: '2024-01-10', notes: 'Fixed performance issue with large projects' },
    ],
  },
  {
    id: 'ms-vscode.vscode-typescript-next',
    name: 'JavaScript and TypeScript Nightly',
    publisher: 'Microsoft',
    description: 'Enables typescript@next to power VS Code\'s built-in JavaScript and TypeScript support',
    version: '5.4.0',
    rating: 4.2,
    downloads: '8M',
    installed: false,
    enabled: false,
    iconColor: '#3178c6',
    isFunctional: false,
    readme: '# TypeScript Nightly\n\nUses the latest TypeScript nightly build.\n\n## Warning\nThis extension uses unstable builds. Use for testing only.',
    features: ['Latest TypeScript features', 'Nightly updates', 'Bug fixes early access'],
    changelog: [
      { version: '5.4.0', date: '2024-01-12', notes: 'Updated to TypeScript 5.4 nightly' },
    ],
  },
  {
    id: 'bradlc.vscode-tailwindcss',
    name: 'Tailwind CSS IntelliSense',
    publisher: 'Tailwind Labs',
    description: 'Intelligent Tailwind CSS tooling for VS Code',
    version: '0.10.5',
    rating: 4.5,
    downloads: '12M',
    installed: true,
    enabled: true,
    iconColor: '#06b6d4',
    isFunctional: false,
    readme: '# Tailwind CSS IntelliSense\n\nProvides IntelliSense for Tailwind CSS.\n\n## Features\n- Autocomplete for class names\n- CSS diagnostics\n- Hover preview\n- Linting',
    features: ['Class name autocomplete', 'CSS diagnostics', 'Hover preview', 'Linting', 'Sort on save'],
    changelog: [
      { version: '0.10.5', date: '2024-01-08', notes: 'Added support for Tailwind v3.4' },
    ],
  },
  {
    id: 'formulahendry.auto-rename-tag',
    name: 'Auto Rename Tag',
    publisher: 'Jun Han',
    description: 'Auto rename paired HTML/XML tag',
    version: '0.1.10',
    rating: 3.9,
    downloads: '15M',
    installed: false,
    enabled: false,
    iconColor: '#e44d26',
    isFunctional: false,
    readme: '# Auto Rename Tag\n\nWhen you rename one HTML/XML tag, automatically rename the paired tag.\n\n## Features\n- Auto rename paired tags\n- Works with HTML, XML, JSX',
    features: ['Auto rename paired tags', 'HTML support', 'XML support', 'JSX support'],
    changelog: [
      { version: '0.1.10', date: '2023-11-20', notes: 'Performance improvements' },
    ],
  },
  {
    id: 'pkief.material-icon-theme',
    name: 'Material Icon Theme',
    publisher: 'Philipp Kief',
    description: 'Material Design Icons for Visual Studio Code',
    version: '4.32.0',
    rating: 4.8,
    downloads: '18M',
    installed: true,
    enabled: true,
    iconColor: '#ffca28',
    isFunctional: false,
    readme: '# Material Icon Theme\n\nGet the Material Design icons into your VS Code editor.\n\n## Features\n- 500+ file icons\n- 100+ folder icons\n- Custom icon associations',
    features: ['500+ file icons', '100+ folder icons', 'Custom associations', 'Theme toggle', 'Icon packs'],
    changelog: [
      { version: '4.32.0', date: '2024-01-05', notes: 'Added new file icons for modern frameworks' },
    ],
  },
  {
    id: 'eamodio.gitlens',
    name: 'GitLens — Git supercharged',
    publisher: 'GitKraken',
    description: 'Supercharge Git within VS Code',
    version: '14.3.0',
    rating: 4.4,
    downloads: '22M',
    installed: false,
    enabled: false,
    iconColor: '#1db954',
    isFunctional: false,
    readme: '# GitLens\n\nSupercharge Git within VS Code.\n\n## Features\n- Git blame annotations\n- Code lens\n- Rich commit search\n- File and line history',
    features: ['Git blame', 'Code lens', 'Commit search', 'File history', 'Line history', 'Stash management'],
    changelog: [
      { version: '14.3.0', date: '2024-01-03', notes: 'Improved performance for large repositories' },
    ],
  },
  {
    id: 'ms-python.python',
    name: 'Python',
    publisher: 'Microsoft',
    description: 'IntelliSense (Pylance), Linting, Debugging, Jupyter Notebooks',
    version: '2024.0.1',
    rating: 4.5,
    downloads: '90M',
    installed: false,
    enabled: false,
    iconColor: '#3776ab',
    isFunctional: false,
    readme: '# Python Extension\n\nRich support for the Python language.\n\n## Features\n- IntelliSense\n- Linting\n- Debugging\n- Jupyter Notebooks\n- Environment management',
    features: ['IntelliSense', 'Linting', 'Debugging', 'Jupyter support', 'Virtual environments', 'Testing'],
    changelog: [
      { version: '2024.0.1', date: '2024-01-10', notes: 'Updated to support Python 3.12' },
    ],
  },
];
