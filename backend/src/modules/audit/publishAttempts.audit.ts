type PublishPostType = 'feed' | 'reel';
type PublishTriggerType = 'manual' | 'scheduled' | 'retry';
type PublishAttemptStatus = 'publishing' | 'published' | 'failed';

type PublishAttemptRow = {
  post_id: string;
  post_type: PublishPostType;
  platform: string;
  trigger_type: PublishTriggerType;
  attempt_number: number;
  status: PublishAttemptStatus;
  error_message?: string | null;
};

function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase env (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/+$/, ''),
    serviceRoleKey,
  };
}

async function supabaseRest(pathWithQuery: string, init?: RequestInit): Promise<void> {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();

  const resp = await fetch(`${supabaseUrl}${pathWithQuery}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!resp.ok) {
    throw new Error(`Supabase REST error: ${resp.status}`);
  }
}

/**
 * Best-effort audit log write.
 * MUST NOT impact publish outcomes (errors are swallowed).
 */
export async function tryWritePublishAttempt(row: PublishAttemptRow): Promise<void> {
  try {
    await supabaseRest('/rest/v1/publish_attempts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        post_id: row.post_id,
        post_type: row.post_type,
        platform: row.platform,
        trigger_type: row.trigger_type,
        attempt_number: row.attempt_number,
        status: row.status,
        error_message: row.error_message ?? null,
      }),
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[audit] failed to write publish_attempts', e instanceof Error ? e.message : e);
  }
}


