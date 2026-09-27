import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import { SEED_SLOTS } from '../prisma/seed-data';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  baseUrl: string;
}

/** Boots the real app on a random port so requests go over real HTTP/TCP to a real PostgreSQL. */
export async function startApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: ['error'] });
  configureApp(app);
  await app.listen(0);
  const address = app.getHttpServer().address();
  return { app, prisma: app.get(PrismaService), baseUrl: `http://127.0.0.1:${address.port}` };
}

/** Wipes all data and re-inserts the fixed seed slots, so each test starts from the same state. */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Booking", "Slot" CASCADE');
  await prisma.slot.createMany({
    data: SEED_SLOTS.map((s) => ({ id: s.id, startsAt: new Date(s.startsAt), endsAt: new Date(s.endsAt) })),
  });
}

export interface RecordedEvent {
  name: string;
  payload: unknown;
}

export async function connectSocket(baseUrl: string): Promise<{ socket: Socket; events: RecordedEvent[] }> {
  const socket = io(baseUrl, { transports: ['websocket'], forceNew: true });
  const events: RecordedEvent[] = [];
  socket.onAny((name: string, payload: unknown) => events.push({ name, payload }));
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve());
    socket.once('connect_error', reject);
  });
  return { socket, events };
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export { SEED_SLOTS };
