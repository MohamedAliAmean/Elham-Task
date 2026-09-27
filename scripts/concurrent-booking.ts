// Fires N simultaneous POST /bookings for one slot and prints the status codes.
// Usage: npm run demo:concurrent [-- <slotId> <count> <baseUrl>]
const slotId = process.argv[2] ?? '11111111-1111-4111-8111-111111111111';
const count = Number(process.argv[3] ?? 10);
const baseUrl = process.argv[4] ?? process.env.API_URL ?? 'http://localhost:3000';

async function main() {
  const results = await Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const res = await fetch(`${baseUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId, customerName: `Racer ${i}`, customerEmail: `racer${i}@example.com` }),
      });
      return { i, status: res.status, body: await res.json() };
    }),
  );

  for (const r of results) console.log(`#${r.i} -> ${r.status} ${JSON.stringify(r.body)}`);
  const tally = results.reduce<Record<number, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
  console.log('\nSummary:', tally);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
