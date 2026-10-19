import { UserSession } from '#types';

declare module 'express-session' {
  interface SessionData {
    user?: UserSession;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: UserSession;
    }
  }
}

export {};
