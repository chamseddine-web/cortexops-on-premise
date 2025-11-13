import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Webhook-Signature",
};

interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  webhook_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse webhook payload
    const payload: WebhookPayload = await req.json();
    const { event, data, webhook_id } = payload;

    if (!event) {
      return new Response(
        JSON.stringify({ error: "Event type required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get all active webhooks for this event
    const { data: webhooks, error: webhooksError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('enabled', true)
      .contains('events', [event]);

    if (webhooksError) throw webhooksError;

    if (!webhooks || webhooks.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No active webhooks for this event",
          deliveries: 0
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Deliver to all matching webhooks
    const deliveryPromises = webhooks.map(webhook =>
      deliverWebhook(supabase, webhook, event, data)
    );

    const results = await Promise.allSettled(deliveryPromises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected').length;

    return new Response(
      JSON.stringify({
        success: true,
        event,
        deliveries: {
          total: webhooks.length,
          success: successCount,
          failed: failCount
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Webhook relay error:", error);
    return new Response(
      JSON.stringify({
        error: "Webhook relay failed",
        message: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function deliverWebhook(
  supabase: any,
  webhook: any,
  event: string,
  data: any
): Promise<void> {
  const startTime = Date.now();

  try {
    // Build payload
    const payload = {
      event,
      data,
      timestamp: new Date().toISOString(),
      webhook_id: webhook.id
    };

    // Generate HMAC signature
    const signature = createHmac('sha256', webhook.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Event': event,
      'User-Agent': 'CortexOps-Webhook/1.0',
      ...(webhook.headers || {})
    };

    // Send webhook
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      (webhook.timeout_seconds || 30) * 1000
    );

    const response = await fetch(webhook.url, {
      method: webhook.method || 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;
    const responseBody = await response.text();

    // Log delivery
    await supabase.rpc('send_webhook_notification', {
      p_webhook_id: webhook.id,
      p_event_type: event,
      p_payload: payload
    });

    await supabase
      .from('webhook_deliveries')
      .update({
        status: response.ok ? 'success' : 'failed',
        status_code: response.status,
        response_body: responseBody.substring(0, 1000), // Limit size
        response_time_ms: responseTime
      })
      .eq('webhook_id', webhook.id)
      .order('created_at', { ascending: false })
      .limit(1);

    // Update webhook stats
    await supabase
      .from('webhooks')
      .update({
        last_status_code: response.status,
        failed_deliveries: response.ok
          ? webhook.failed_deliveries
          : webhook.failed_deliveries + 1
      })
      .eq('id', webhook.id);

  } catch (error) {
    const responseTime = Date.now() - startTime;

    // Log failed delivery
    await supabase
      .from('webhook_deliveries')
      .insert({
        webhook_id: webhook.id,
        event_type: event,
        payload: { event, data },
        status: error.name === 'AbortError' ? 'timeout' : 'failed',
        response_time_ms: responseTime,
        error_message: error.message
      });

    // Update failed count
    await supabase
      .from('webhooks')
      .update({
        failed_deliveries: webhook.failed_deliveries + 1
      })
      .eq('id', webhook.id);

    throw error;
  }
}
