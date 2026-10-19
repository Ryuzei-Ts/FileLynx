import { db } from '#db';
import crypto from 'node:crypto';
import type { NotebookDocument } from '#types';

export const notebooksService = {
  list(): NotebookDocument[] {
    const rows = db.prepare('SELECT id, title, content, updated_at FROM notebooks ORDER BY updated_at DESC').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      cells: JSON.parse(r.content),
      updatedAt: r.updated_at,
    }));
  },

  get(id: string): NotebookDocument | null {
    const row = db.prepare('SELECT id, title, content, updated_at FROM notebooks WHERE id = ?').get(id) as any;
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
    const title = notebook.title || 'Untitled Notebook';
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
};
