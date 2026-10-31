declare module '*.css';

// Vite's file lists (see landmap.tsx): only the part this client uses.
interface ImportMeta {
  glob(pattern: string, options: { eager: true; query: '?url'; import: 'default' }): Record<string, string>;
}
