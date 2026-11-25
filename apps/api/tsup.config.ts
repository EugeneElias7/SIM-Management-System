import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/worker.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  splitting: false,
  noExternal: ['@san/shared'],
  external: [
    '@prisma/client',
    'argon2',
    'pdfkit',
    'nodemailer',
    'exceljs',
    'pg-boss',
    'pino',
    'pino-pretty',
  ],
  banner: {
    js: "import { createRequire as __sanCreateRequire } from 'module'; const require = __sanCreateRequire(import.meta.url);",
  },
});
