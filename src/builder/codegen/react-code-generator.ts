import { AppProject } from '../schema/project';
import { ComponentNode } from '../schema/component';
import { stylesToTailwind } from './tailwind-mapper';

export interface GeneratedProjectFile {
  path: string;
  content: string;
}

export interface GeneratedProjectBundle {
  projectName: string;
  files: GeneratedProjectFile[];
}

/**
 * Compiles a ComponentNode tree into clean, readable React TSX code.
 */
export function generateNodeJSX(node: ComponentNode, indentLevel: number = 2): string {
  const indent = ' '.repeat(indentLevel);
  const childIndent = ' '.repeat(indentLevel + 2);
  const tw = stylesToTailwind(node.styles);
  const classAttr = tw ? ` className="${tw}"` : '';

  switch (node.type) {
    case 'container':
    case 'row':
    case 'column':
    case 'stack':
    case 'section':
    case 'header':
    case 'footer': {
      const tag = node.type === 'section' ? 'section' : node.type === 'header' ? 'header' : node.type === 'footer' ? 'footer' : 'div';
      if (!node.children || node.children.length === 0) {
        return `${indent}<${tag}${classAttr} />`;
      }
      const childrenJSX = node.children
        .map((child) => generateNodeJSX(child, indentLevel + 2))
        .join('\n');
      return `${indent}<${tag}${classAttr}>\n${childrenJSX}\n${indent}</${tag}>`;
    }

    case 'heading': {
      const level = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(node.props?.level)
        ? node.props.level
        : 'h2';
      const text = escapeJSX(node.props?.text || 'Heading');
      return `${indent}<${level}${classAttr}>${text}</${level}>`;
    }

    case 'paragraph': {
      const text = escapeJSX(node.props?.text || 'Paragraph text');
      return `${indent}<p${classAttr}>${text}</p>`;
    }

    case 'text': {
      const text = escapeJSX(node.props?.text || 'Text');
      return `${indent}<span${classAttr}>${text}</span>`;
    }

    case 'button': {
      const text = escapeJSX(node.props?.text || 'Button');
      const disabled = node.props?.disabled ? ' disabled' : '';
      return `${indent}<button${classAttr}${disabled}>${text}</button>`;
    }

    case 'input': {
      const type = node.props?.inputType || node.props?.type || 'text';
      const placeholder = node.props?.placeholder ? ` placeholder="${escapeJSX(node.props.placeholder)}"` : '';
      const required = node.props?.required ? ' required' : '';
      return `${indent}<input type="${type}"${classAttr}${placeholder}${required} />`;
    }

    case 'textarea': {
      const placeholder = node.props?.placeholder ? ` placeholder="${escapeJSX(node.props.placeholder)}"` : '';
      const rows = node.props?.rows ? ` rows={${node.props.rows}}` : ' rows={3}';
      return `${indent}<textarea${classAttr}${placeholder}${rows} />`;
    }

    case 'image': {
      const src = node.props?.src || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe';
      const alt = escapeJSX(node.props?.alt || 'Image');
      return `${indent}<img src="${src}" alt="${alt}"${classAttr} />`;
    }

    case 'divider': {
      return `${indent}<hr${classAttr} />`;
    }

    case 'spacer': {
      return `${indent}<div${classAttr} aria-hidden="true" />`;
    }

    case 'card': {
      if (!node.children || node.children.length === 0) {
        return `${indent}<div${classAttr}><p className="text-slate-500">Empty Card</p></div>`;
      }
      const childrenJSX = node.children
        .map((child) => generateNodeJSX(child, indentLevel + 2))
        .join('\n');
      return `${indent}<div${classAttr}>\n${childrenJSX}\n${indent}</div>`;
    }

    case 'badge': {
      const label = escapeJSX(node.props?.text || node.props?.label || 'Badge');
      return `${indent}<span${classAttr}>${label}</span>`;
    }

    case 'avatar': {
      const src = node.props?.src || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb';
      const alt = escapeJSX(node.props?.alt || 'Avatar');
      return `${indent}<img src="${src}" alt="${alt}" className="${tw || 'w-10 h-10 rounded-full object-cover'}" />`;
    }

    case 'statistic_kpi': {
      const title = escapeJSX(node.props?.title || 'Metric');
      const value = escapeJSX(String(node.props?.value ?? '0'));
      const change = node.props?.change ? escapeJSX(String(node.props.change)) : null;
      return `${indent}<div${classAttr}>
${childIndent}<span className="text-xs text-slate-500 font-medium">${title}</span>
${childIndent}<span className="text-2xl font-bold">${value}</span>${
        change ? `\n${childIndent}<span className="text-xs text-emerald-500">${change}</span>` : ''
      }
${indent}</div>`;
    }

    case 'data_table': {
      return `${indent}<div${classAttr}>
${childIndent}<table className="w-full text-left text-sm">
${childIndent}  <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
${childIndent}    <tr>
${childIndent}      <th className="p-3">Item</th>
${childIndent}      <th className="p-3">Status</th>
${childIndent}      <th className="p-3">Value</th>
${childIndent}    </tr>
${childIndent}  </thead>
${childIndent}  <tbody className="divide-y divide-slate-200">
${childIndent}    <tr>
${childIndent}      <td className="p-3 font-medium">Sample Item 1</td>
${childIndent}      <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs">Active</span></td>
${childIndent}      <td className="p-3">$1,250.00</td>
${childIndent}    </tr>
${childIndent}    <tr>
${childIndent}      <td className="p-3 font-medium">Sample Item 2</td>
${childIndent}      <td className="p-3"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs">Pending</span></td>
${childIndent}      <td className="p-3">$450.00</td>
${childIndent}    </tr>
${childIndent}  </tbody>
${childIndent}</table>
${indent}</div>`;
    }

    default: {
      if (node.children && node.children.length > 0) {
        const childrenJSX = node.children
          .map((child) => generateNodeJSX(child, indentLevel + 2))
          .join('\n');
        return `${indent}<div${classAttr}>\n${childrenJSX}\n${indent}</div>`;
      }
      return `${indent}<div${classAttr} />`;
    }
  }
}

function escapeJSX(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Generates an idiomatic Next.js 14 page file content from a page schema.
 */
export function generatePageCode(
  pageName: string,
  rootNode: ComponentNode | null
): string {
  const componentName = toPascalCase(pageName || 'Page');
  const bodyJSX = rootNode ? generateNodeJSX(rootNode, 4) : '    <main className="min-h-screen p-8" />';

  return `'use client';

import React from 'react';

export default function ${componentName}Page() {
  return (
${bodyJSX}
  );
}
`;
}

/**
 * Generates the complete, production-ready Next.js 14 project codebase files.
 */
export function generateProjectCodebase(project: AppProject): GeneratedProjectBundle {
  const files: GeneratedProjectFile[] = [];
  const safeProjectName = (project.name || 'visual-app')
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-');

  // 1. package.json
  files.push({
    path: 'package.json',
    content: JSON.stringify(
      {
        name: safeProjectName,
        version: '1.0.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint',
        },
        dependencies: {
          next: '14.2.15',
          react: '^18.3.1',
          'react-dom': '^18.3.1',
          'lucide-react': '^0.453.0',
          clsx: '^2.1.1',
          'tailwind-merge': '^2.5.4',
        },
        devDependencies: {
          '@types/node': '^20',
          '@types/react': '^18',
          '@types/react-dom': '^18',
          autoprefixer: '^10.4.20',
          postcss: '^8.4.47',
          tailwindcss: '^3.4.14',
          typescript: '^5',
        },
      },
      null,
      2
    ),
  });

  // 2. tsconfig.json
  files.push({
    path: 'tsconfig.json',
    content: JSON.stringify(
      {
        compilerOptions: {
          target: 'es5',
          lib: ['dom', 'dom.iterable', 'esnext'],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: 'esnext',
          moduleResolution: 'bundler',
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: 'preserve',
          incremental: true,
          plugins: [{ name: 'next' }],
          paths: {
            '@/*': ['./src/*'],
          },
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
        exclude: ['node_modules'],
      },
      null,
      2
    ),
  });

  // 3. tailwind.config.js
  files.push({
    path: 'tailwind.config.js',
    content: `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
`,
  });

  // 4. next.config.mjs
  files.push({
    path: 'next.config.mjs',
    content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
`,
  });

  // 5. app/globals.css
  files.push({
    path: 'app/globals.css',
    content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 248, 250, 252;
  --background-end-rgb: 255, 255, 255;
}

body {
  color: rgb(var(--foreground-rgb));
  background: rgb(var(--background-start-rgb));
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}
`,
  });

  // 6. app/layout.tsx
  files.push({
    path: 'app/layout.tsx',
    content: `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '${escapeJSX(project.name || 'Visual App')}',
  description: 'Built with Visual App Builder',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
`,
  });

  // 7. Pages (app/page.tsx and app/[slug]/page.tsx)
  const pages = project.pages || [];
  const homePage = pages.find((p) => p.slug === '/' || p.slug === 'home') || pages[0];

  if (homePage) {
    files.push({
      path: 'app/page.tsx',
      content: generatePageCode(homePage.name, homePage.root),
    });
  }

  for (const page of pages) {
    if (page.id === homePage?.id) continue;
    const slug = (page.slug || page.name || 'page')
      .toLowerCase()
      .replace(/^\//, '')
      .replace(/[^a-z0-9-_]/g, '-');
    files.push({
      path: `app/${slug}/page.tsx`,
      content: generatePageCode(page.name, page.root),
    });
  }

  // 8. README.md
  files.push({
    path: 'README.md',
    content: `# ${project.name}

> Generated by **Apex Studio Visual App Builder**

## Getting Started

First, install the dependencies:

\`\`\`bash
npm install
# or
yarn install
# or
pnpm install
\`\`\`

Next, run the development server:

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- \`app/\`: Next.js 14 App Router pages and layout
- \`app/globals.css\`: Tailwind CSS styles
- \`tailwind.config.js\`: Tailwind configuration
- \`package.json\`: Project dependencies & build scripts
`,
  });

  return {
    projectName: safeProjectName,
    files,
  };
}

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}
