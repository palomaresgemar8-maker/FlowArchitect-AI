import * as esbuild from 'esbuild';
import fs from 'fs';

async function build() {
  if (!fs.existsSync('dist-electron')) {
    fs.mkdirSync('dist-electron', { recursive: true });
  }

  // 1. Build server.ts to dist-electron/server.js (Node target)
  await esbuild.build({
    entryPoints: ['server.ts'],
    outfile: 'dist-electron/server.js',
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    external: [
      'electron',
      'fsevents',
      'vite',
      'vite/*',
      '@vitejs/*',
      '@tailwindcss/vite',
      '@vitejs/plugin-react'
    ],
    banner: {
      js: "import { createRequire as __createRequire } from 'module'; const require = __createRequire(import.meta.url);",
    },
  });

  // 2. Build electron/main.ts to dist-electron/main.js
  await esbuild.build({
    entryPoints: ['electron/main.ts'],
    outfile: 'dist-electron/main.js',
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    external: [
      'electron',
      'fsevents',
      'vite',
      'vite/*',
      '@vitejs/*',
      '@tailwindcss/vite',
      '@vitejs/plugin-react'
    ],
    banner: {
      js: "import { createRequire as __createRequire } from 'module'; const require = __createRequire(import.meta.url);",
    },
  });

  // 3. Build electron/preload.ts to dist-electron/preload.cjs
  await esbuild.build({
    entryPoints: ['electron/preload.ts'],
    outfile: 'dist-electron/preload.cjs',
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    external: ['electron'],
  });

  // 4. Copy dist into dist-electron/dist so static assets are always co-located
  if (fs.existsSync('dist')) {
    fs.cpSync('dist', 'dist-electron/dist', { recursive: true, force: true });
  }

  console.log('Electron and server build completed successfully!');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
