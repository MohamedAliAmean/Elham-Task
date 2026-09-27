import { execSync } from 'node:child_process';

/** Applies migrations to the test database once before the suite. */
export default function globalSetup(): void {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Copy .env.test.example to .env.test (see README).');
  }
  const dbName = new URL(url).pathname.replace(/^\//, '');
  if (!/test/i.test(dbName)) {
    throw new Error(`Refusing to run: tests wipe the database, but "${dbName}" does not look like a test database.`);
  }
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
}
