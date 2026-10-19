declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string;
      NODE_ENV?: 'development' | 'production' | 'test';
      SESSION_SECRET?: string;
      DATABASE_PATH?: string;
      ROOT_DIR?: string;
    }
  }
}

export {};
