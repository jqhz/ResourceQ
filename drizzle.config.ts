import { type Config } from 'drizzle-kit';

export default {
  schema: './src/utils/schema.ts',
  out: './drizzle',
  migrations: {
    prefix: 'timestamp',
  },
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
  verbose: true,
} satisfies Config;