import { serve } from "https://deno.land/std/http/server.ts";
import { runScheduledPublishes } from "../../../backend/src/scheduler/runScheduledPublishes.ts";

function getBatchSize(): number {
  const raw = Deno.env.get("SCHEDULER_BATCH_SIZE");
  if (!raw) return 10;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
}

function isAuthorized(req: Request): boolean {
  const expected = Deno.env.get("SCHEDULER_TRIGGER_SECRET");
  if (!expected) return false;

  const provided = req.headers.get("x-scheduler-secret") ?? "";
  return provided === expected;
}

serve(async (req) => {
  try {
    if (!isAuthorized(req)) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const limit = getBatchSize();
    console.log(`[scheduler] start limit=${limit}`);

    const res = await runScheduledPublishes({ limit });

    console.log(`[scheduler] end attempted=${res.attempted} published=${res.published} failed=${res.failed} skipped=${res.skipped}`);

    return new Response(JSON.stringify({ ok: true, ...res }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[scheduler] error", e);
    return new Response(JSON.stringify({ ok: false, error: "Scheduler failed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});


