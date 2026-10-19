export interface FileEntry {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  modifiedAt: Date;
  extension?: string;
}

export interface UserSession {
  userId: string;
  username: string;
  authenticated: boolean;
}

export interface NotebookCell {
  id: string;
  type: 'code' | 'markdown';
  content: string;
  output?: string;
}

export interface NotebookDocument {
  id: string;
  title: string;
  cells: NotebookCell[];
  updatedAt: string;
}

export interface SystemMetrics {
  platform: string;
  arch: string;
  uptime: number;
  loadAvg: number[];
  cpuCount: number;
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercentage: number;
  };
}
