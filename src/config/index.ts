import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SESSION_SECRET: z.string().default('filelynx_super_secret_local_key'),
  DATABASE_PATH: z.string().default('./data/filelynx.db'),
  ROOT_DIR: z.string().default(process.cwd()),
});

export const config = envSchema.parse(process.env);
