import request from 'supertest';
import { connectSocket, resetDatabase, SEED_SLOTS, sleep, startApp, TestContext } from './helpers';

const SLOT_A = SEED_SLOTS[0].id;
const SLOT_B = SEED_SLOTS[1].id;
const UNKNOWN_UUID = '99999999-9999-4999-8999-999999999999';

const customer = (n: number) => ({ customerName: `Customer ${n}`, customerEmail: `customer${n}@example.com` });

describe('Booking API (e2e, real PostgreSQL)', () => {
  let ctx: TestContext;
  let api: () => ReturnType<typeof request>;

  beforeAll(async () => {
    ctx = await startApp();
    api = () => request(ctx.baseUrl);
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const book = (slotId: string, n = 1) => api().post('/bookings').send({ slotId, ...customer(n) });
  const availableIds = async () => ((await api().get('/slots').expect(200)).body.slots as { id: string }[]).map((s) => s.id);
  const activeBookingsFor = (slotId: string) => ctx.prisma.booking.count({ where: { slotId, status: 'active' } });

  describe('GET /slots', () => {
    it('returns all seeded slots sorted by startsAt then id, in the documented shape', async () => {
      const res = await api().get('/slots').expect(200).expect('Content-Type', /json/);
      expect(res.body).toEqual({ slots: SEED_SLOTS });
    });

    it('breaks startsAt ties by id', async () => {
      await ctx.prisma.slot.create({
        data: { id: '00000000-0000-4000-8000-000000000001', startsAt: new Date(SEED_SLOTS[0].startsAt), endsAt: new Date(SEED_SLOTS[0].endsAt) },
      });
      const ids = await availableIds();
      expect(ids.slice(0, 2)).toEqual(['00000000-0000-4000-8000-000000000001', SLOT_A]);
    });

    it('returns {"slots":[]} when nothing is available', async () => {
      await Promise.all(SEED_SLOTS.map((s, i) => book(s.id, i).expect(201)));
      await api().get('/slots').expect(200, { slots: [] });
    });
  });

  describe('POST /bookings', () => {
    // Required test 1
    it('creates a booking (201) and the slot disappears from the available list', async () => {
      const res = await book(SLOT_A).expect(201);

      expect(res.body).toEqual({
        booking: { id: expect.any(String), slotId: SLOT_A, ...customer(1), status: 'active' },
      });
      expect(res.body.booking.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(await availableIds()).not.toContain(SLOT_A);
      expect(await availableIds()).toHaveLength(SEED_SLOTS.length - 1);
    });

    // Required test 2: both requests are in flight at the same time (no await between them).
    it('two overlapping requests for the same slot: exactly one 201 and one 409, one active booking stored', async () => {
      const [r1, r2] = await Promise.all([book(SLOT_A, 1), book(SLOT_A, 2)]);

      expect([r1.status, r2.status].sort()).toEqual([201, 409]);
      const loser = r1.status === 409 ? r1 : r2;
      expect(loser.body).toEqual({ error: { code: 'SLOT_UNAVAILABLE', message: expect.any(String) } });
      expect(await activeBookingsFor(SLOT_A)).toBe(1);
      expect(await ctx.prisma.booking.count()).toBe(1);
    });

    it('same guarantee with identical customer data and higher contention (20 parallel requests)', async () => {
      const results = await Promise.all(Array.from({ length: 20 }, () => book(SLOT_A, 7)));

      const statuses = results.map((r) => r.status);
      expect(statuses.filter((s) => s === 201)).toHaveLength(1);
      expect(statuses.filter((s) => s === 409)).toHaveLength(19);
      expect(await activeBookingsFor(SLOT_A)).toBe(1);
    });

    it('returns 409 when the slot already has an active booking', async () => {
      await book(SLOT_A, 1).expect(201);
      const res = await book(SLOT_A, 2).expect(409);
      expect(res.body.error.code).toBe('SLOT_UNAVAILABLE');
    });

    it('trims customerName and customerEmail before validating and saving', async () => {
      const res = await api()
        .post('/bookings')
        .send({ slotId: SLOT_A, customerName: '  Alex Morgan \t', customerEmail: ' alex@example.com  ' })
        .expect(201);
      expect(res.body.booking).toMatchObject({ customerName: 'Alex Morgan', customerEmail: 'alex@example.com' });
      const stored = await ctx.prisma.booking.findUniqueOrThrow({ where: { id: res.body.booking.id } });
      expect(stored).toMatchObject({ customerName: 'Alex Morgan', customerEmail: 'alex@example.com' });
    });

    it('returns 404 SLOT_NOT_FOUND for a valid but unknown slot id', async () => {
      const res = await book(UNKNOWN_UUID).expect(404);
      expect(res.body).toEqual({ error: { code: 'SLOT_NOT_FOUND', message: expect.any(String) } });
    });

    it.each([
      ['missing fields', {}],
      ['missing slotId', customer(1)],
      ['invalid slotId', { slotId: 'not-a-uuid', ...customer(1) }],
      ['non-string slotId', { slotId: 42, ...customer(1) }],
      ['blank name after trim', { slotId: SLOT_A, customerName: '   ', customerEmail: 'a@example.com' }],
      ['non-string name', { slotId: SLOT_A, customerName: 5, customerEmail: 'a@example.com' }],
      ['invalid email', { slotId: SLOT_A, customerName: 'A', customerEmail: 'not-an-email' }],
      ['missing email', { slotId: SLOT_A, customerName: 'A' }],
    ])('returns 400 VALIDATION_ERROR for %s', async (_label, body) => {
      const res = await api().post('/bookings').send(body).expect(400);
      expect(res.body).toEqual({ error: { code: 'VALIDATION_ERROR', message: expect.any(String) } });
      expect(res.body.error.message.length).toBeGreaterThan(0);
      expect(await ctx.prisma.booking.count()).toBe(0);
    });

    it.each([
      ['malformed JSON', '{"slotId": '],
      ['a JSON array', '[]'],
      ['a JSON string', '"hello"'],
    ])('returns 400 VALIDATION_ERROR for %s', async (_label, raw) => {
      const res = await api().post('/bookings').set('Content-Type', 'application/json').send(raw).expect(400);
      expect(res.body).toEqual({ error: { code: 'VALIDATION_ERROR', message: expect.any(String) } });
    });
  });

  describe('DELETE /bookings/:bookingId', () => {
    // Required test 3
    it('cancels (200), makes the slot available again and allows a new booking', async () => {
      const created = (await book(SLOT_A, 1).expect(201)).body.booking;

      const res = await api().delete(`/bookings/${created.id}`).expect(200);
      expect(res.body).toEqual({ booking: { ...created, status: 'cancelled' } });
      expect(await availableIds()).toContain(SLOT_A);

      const rebooked = await book(SLOT_A, 2).expect(201);
      expect(rebooked.body.booking.id).not.toBe(created.id);
      expect(await activeBookingsFor(SLOT_A)).toBe(1);
    });

    it('is idempotent: repeating a cancel returns 200 with the same unchanged booking', async () => {
      const created = (await book(SLOT_A).expect(201)).body.booking;
      const first = await api().delete(`/bookings/${created.id}`).expect(200);
      const before = await ctx.prisma.booking.findUniqueOrThrow({ where: { id: created.id } });

      const second = await api().delete(`/bookings/${created.id}`).expect(200);
      const after = await ctx.prisma.booking.findUniqueOrThrow({ where: { id: created.id } });

      expect(second.body).toEqual(first.body);
      expect(after).toEqual(before);
    });

    it('cancelling an old cancelled booking does not affect a newer active booking of the same slot', async () => {
      const old = (await book(SLOT_A, 1).expect(201)).body.booking;
      await api().delete(`/bookings/${old.id}`).expect(200);
      const current = (await book(SLOT_A, 2).expect(201)).body.booking;

      await api().delete(`/bookings/${old.id}`).expect(200);

      const stored = await ctx.prisma.booking.findUniqueOrThrow({ where: { id: current.id } });
      expect(stored.status).toBe('active');
      expect(await availableIds()).not.toContain(SLOT_A);
    });

    it('returns 400 VALIDATION_ERROR for an invalid UUID', async () => {
      const res = await api().delete('/bookings/not-a-uuid').expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 BOOKING_NOT_FOUND for a valid but unknown id', async () => {
      const res = await api().delete(`/bookings/${UNKNOWN_UUID}`).expect(404);
      expect(res.body).toEqual({ error: { code: 'BOOKING_NOT_FOUND', message: expect.any(String) } });
    });
  });

  describe('Socket.IO events', () => {
    it('emits slot.booked / slot.released once, without customer data, and nothing for rejected or repeated requests', async () => {
      const { socket, events } = await connectSocket(ctx.baseUrl);
      try {
        const created = (await book(SLOT_B, 1).expect(201)).body.booking;
        await book(SLOT_B, 2).expect(409);
        await book(UNKNOWN_UUID).expect(404);
        await api().delete(`/bookings/${created.id}`).expect(200);
        await api().delete(`/bookings/${created.id}`).expect(200);
        await sleep(300);

        expect(events).toEqual([
          { name: 'slot.booked', payload: { slotId: SLOT_B, bookingId: created.id, available: false } },
          { name: 'slot.released', payload: { slotId: SLOT_B, bookingId: created.id, available: true } },
        ]);
      } finally {
        socket.disconnect();
      }
    });

    it('emits exactly one slot.booked when concurrent requests race', async () => {
      const { socket, events } = await connectSocket(ctx.baseUrl);
      try {
        await Promise.all(Array.from({ length: 5 }, (_, i) => book(SLOT_A, i)));
        await sleep(300);
        expect(events.filter((e) => e.name === 'slot.booked')).toHaveLength(1);
      } finally {
        socket.disconnect();
      }
    });
  });

  describe('OpenAPI', () => {
    it('serves the spec at /openapi.json with all three operations', async () => {
      const res = await api().get('/openapi.json').expect(200);
      expect(res.body.openapi).toMatch(/^3\./);
      expect(Object.keys(res.body.paths['/slots'])).toEqual(['get']);
      expect(Object.keys(res.body.paths['/bookings'])).toEqual(['post']);
      expect(Object.keys(res.body.paths['/bookings/{bookingId}'])).toEqual(['delete']);
      expect(Object.keys(res.body.paths['/bookings'].post.responses).sort()).toEqual(['201', '400', '404', '409', '500']);
      expect(Object.keys(res.body.paths['/bookings/{bookingId}'].delete.responses).sort()).toEqual(['200', '400', '404', '500']);
    });

    it('serves Swagger UI at /docs', async () => {
      const res = await api().get('/docs').redirects(1).expect(200);
      expect(res.text).toContain('swagger');
    });
  });
});
