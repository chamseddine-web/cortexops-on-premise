import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MOLLIE_API_KEY = Deno.env.get('MOLLIE_API_KEY') || '';

interface MolliePayment {
  id: string;
  status: string;
  amount: { value: string; currency: string };
  description: string;
  method?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  paidAt?: string;
  expiredAt?: string;
  failedAt?: string;
  canceledAt?: string;
  subscriptionId?: string;
  customerId?: string;
}

interface MollieSubscription {
  id: string;
  status: string;
  amount: { value: string; currency: string };
  interval: string;
  startDate: string;
  nextPaymentDate?: string;
  description?: string;
  metadata?: Record<string, any>;
  canceledAt?: string;
  customerId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Récupérer l'ID depuis le body
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return new Response(
        JSON.stringify({ error: "Missing payment or subscription ID" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing webhook for ID: ${id}`);

    // Logger le webhook
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase.from('mollie_webhooks').insert({
      mollie_payment_id: id.startsWith('tr_') ? id : null,
      mollie_subscription_id: id.startsWith('sub_') ? id : null,
      event_type: 'webhook_received',
      payload: body,
      processed: false
    });

    // Déterminer si c'est un paiement ou un abonnement
    if (id.startsWith('tr_')) {
      await handlePaymentWebhook(id, supabase);
    } else if (id.startsWith('sub_')) {
      await handleSubscriptionWebhook(id, supabase);
    } else {
      throw new Error(`Unknown ID format: ${id}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handlePaymentWebhook(paymentId: string, supabase: any) {
  console.log(`Fetching payment ${paymentId} from Mollie...`);

  // Récupérer les détails du paiement depuis Mollie
  const response = await fetch(
    `https://api.mollie.com/v2/payments/${paymentId}`,
    {
      headers: {
        'Authorization': `Bearer ${MOLLIE_API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Mollie API error: ${response.statusText}`);
  }

  const payment: MolliePayment = await response.json();
  console.log(`Payment status: ${payment.status}`);

  // Mettre à jour le paiement dans la DB
  const { error: updateError } = await supabase
    .from('mollie_payments')
    .update({
      status: payment.status,
      method: payment.method,
      paid_at: payment.paidAt || null,
      expired_at: payment.expiredAt || null,
      failed_at: payment.failedAt || null,
      canceled_at: payment.canceledAt || null,
      metadata: payment.metadata || {},
      updated_at: new Date().toISOString()
    })
    .eq('mollie_payment_id', paymentId);

  if (updateError) {
    console.error('Error updating payment:', updateError);
    throw updateError;
  }

  // Si le paiement est réussi et lié à un abonnement, créer/activer l'abonnement
  if (payment.status === 'paid' && payment.subscriptionId) {
    await handleSubscriptionWebhook(payment.subscriptionId, supabase);
  }

  // Marquer le webhook comme traité
  await supabase
    .from('mollie_webhooks')
    .update({
      processed: true,
      processed_at: new Date().toISOString()
    })
    .eq('mollie_payment_id', paymentId)
    .eq('processed', false);

  console.log(`Payment ${paymentId} processed successfully`);
}

async function handleSubscriptionWebhook(subscriptionId: string, supabase: any) {
  console.log(`Fetching subscription ${subscriptionId} from Mollie...`);

  // Récupérer les détails de l'abonnement depuis Mollie
  const response = await fetch(
    `https://api.mollie.com/v2/subscriptions/${subscriptionId}`,
    {
      headers: {
        'Authorization': `Bearer ${MOLLIE_API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Mollie API error: ${response.statusText}`);
  }

  const subscription: MollieSubscription = await response.json();
  console.log(`Subscription status: ${subscription.status}`);

  // Récupérer le user_id depuis le customer
  const { data: customerData } = await supabase
    .from('mollie_customers')
    .select('user_id')
    .eq('mollie_customer_id', subscription.customerId)
    .maybeSingle();

  if (!customerData) {
    console.error(`Customer not found: ${subscription.customerId}`);
    return;
  }

  const userId = customerData.user_id;

  // Extraire le plan depuis les metadata ou description
  const planName = subscription.metadata?.plan || 'pro';

  // Mettre à jour ou créer l'abonnement dans la DB
  const { error: upsertError } = await supabase
    .from('mollie_subscriptions')
    .upsert({
      user_id: userId,
      mollie_customer_id: subscription.customerId,
      mollie_subscription_id: subscriptionId,
      plan_name: planName,
      amount_value: parseFloat(subscription.amount.value),
      amount_currency: subscription.amount.currency,
      interval: subscription.interval,
      status: subscription.status,
      start_date: subscription.startDate,
      next_payment_date: subscription.nextPaymentDate || null,
      canceled_at: subscription.canceledAt || null,
      description: subscription.description || null,
      metadata: subscription.metadata || {},
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'mollie_subscription_id'
    });

  if (upsertError) {
    console.error('Error upserting subscription:', upsertError);
    throw upsertError;
  }

  // Marquer le webhook comme traité
  await supabase
    .from('mollie_webhooks')
    .update({
      processed: true,
      processed_at: new Date().toISOString()
    })
    .eq('mollie_subscription_id', subscriptionId)
    .eq('processed', false);

  console.log(`Subscription ${subscriptionId} processed successfully`);
}
