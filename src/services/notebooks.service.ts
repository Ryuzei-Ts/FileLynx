import vm from 'node:vm';
import crypto from 'node:crypto';
import { db } from '#db';
import type { NotebookDocument, NotebookCell } from '#types';

interface NotebookRow {
  id: string;
  title: string;
  content: string;
  updated_at: string;
}

export const notebooksService = {
  list(): NotebookDocument[] {
    const rows = db.prepare('SELECT id, title, content, updated_at FROM notebooks ORDER BY updated_at DESC').all() as NotebookRow[];
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      cells: JSON.parse(r.content),
      updatedAt: r.updated_at,
    }));
  },

  get(id: string): NotebookDocument | null {
    const row = db.prepare('SELECT id, title, content, updated_at FROM notebooks WHERE id = ?').get(id) as NotebookRow | undefined;
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      cells: JSON.parse(row.content),
      updatedAt: row.updated_at,
    };
  },

  save(notebook: Partial<NotebookDocument>): NotebookDocument {
    const id = notebook.id || crypto.randomUUID();
    const title = notebook.title || 'Nuevo Notebook';
    const content = JSON.stringify(notebook.cells || []);
    db.prepare(`
      INSERT INTO notebooks (id, title, content, updated_at) 
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET title = excluded.title, content = excluded.content, updated_at = CURRENT_TIMESTAMP
    `).run(id, title, content);

    return { id, title, cells: notebook.cells || [], updatedAt: new Date().toISOString() };
  },

  delete(id: string): void {
    db.prepare('DELETE FROM notebooks WHERE id = ?').run(id);
  },

  async runCodeCell(code: string): Promise<string> {
    const logs: string[] = [];
    const customConsole = {
      log: (...args: unknown[]) => logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ')),
      error: (...args: unknown[]) => logs.push('[ERROR] ' + args.map(String).join(' ')),
      warn: (...args: unknown[]) => logs.push('[WARN] ' + args.map(String).join(' ')),
    };

    const sandbox = {
      console: customConsole,
      setTimeout,
      clearTimeout,
      Buffer,
      process: { env: { NODE_ENV: 'sandbox' } },
    };

    const context = vm.createContext(sandbox);
    try {
      const script = new vm.Script(code);
      const result = script.runInContext(context, { timeout: 4000 });
      if (result !== undefined) {
        logs.push(typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
      }
      return logs.join('\n') || '[Ejecutado sin retorno]';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.stack || err.message : String(err);
      return `Error: ${message}`;
    }
  },
};
