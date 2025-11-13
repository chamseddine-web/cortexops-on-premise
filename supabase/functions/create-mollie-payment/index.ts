import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MOLLIE_API_KEY = Deno.env.get('MOLLIE_API_KEY') || '';
const APP_URL = Deno.env.get('APP_URL') || 'https://cortexops.dev';

interface CreatePaymentRequest {
  plan: 'pro' | 'team' | 'enterprise';
  interval?: '1 month' | '3 months' | '1 year';
  isSubscription?: boolean;
}

const PLANS = {
  pro: {
    name: 'Pro DevOps',
    monthly: '19.90',
    quarterly: '54.90',
    yearly: '199.00',
    description: 'Abonnement Pro CortexOps'
  },
  team: {
    name: 'Team',
    monthly: '49.00',
    quarterly: '135.00',
    yearly: '499.00',
    description: 'Abonnement Team CortexOps'
  },
  enterprise: {
    name: 'Enterprise',
    monthly: '149.00',
    quarterly: '399.00',
    yearly: '1499.00',
    description: 'Abonnement Enterprise CortexOps'
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Créer client Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer le user depuis le token
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const { plan, interval = '1 month', isSubscription = false }: CreatePaymentRequest = await req.json();

    if (!plan || !PLANS[plan]) {
      return new Response(
        JSON.stringify({ error: "Invalid plan" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Récupérer le profil utilisateur
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Créer ou récupérer le customer Mollie
    let mollieCustomerId: string;
    const { data: existingCustomer } = await supabaseClient
      .from('mollie_customers')
      .select('mollie_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingCustomer) {
      mollieCustomerId = existingCustomer.mollie_customer_id;
    } else {
      // Créer un nouveau customer Mollie
      const customerResponse = await fetch('https://api.mollie.com/v2/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MOLLIE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profile.full_name,
          email: profile.email,
          locale: 'fr_FR',
          metadata: {
            user_id: user.id
          }
        })
      });

      if (!customerResponse.ok) {
        throw new Error('Failed to create Mollie customer');
      }

      const customerData = await customerResponse.json();
      mollieCustomerId = customerData.id;

      // Sauvegarder le customer dans la DB
      await supabaseClient.from('mollie_customers').insert({
        user_id: user.id,
        mollie_customer_id: mollieCustomerId,
        name: profile.full_name,
        email: profile.email,
        metadata: { user_id: user.id }
      });
    }

    // Calculer le montant selon l'interval
    const planConfig = PLANS[plan];
    let amount: string;
    let description: string;

    switch (interval) {
      case '3 months':
        amount = planConfig.quarterly;
        description = `${planConfig.description} - Trimestriel`;
        break;
      case '1 year':
        amount = planConfig.yearly;
        description = `${planConfig.description} - Annuel`;
        break;
      default:
        amount = planConfig.monthly;
        description = `${planConfig.description} - Mensuel`;
    }

    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/mollie-webhook`;

    if (isSubscription) {
      // Créer un premier paiement pour initier l'abonnement
      const firstPaymentResponse = await fetch('https://api.mollie.com/v2/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MOLLIE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: {
            currency: 'EUR',
            value: amount
          },
          description: `${description} - 1er paiement`,
          redirectUrl: `${APP_URL}/subscription/success`,
          webhookUrl: webhookUrl,
          customerId: mollieCustomerId,
          sequenceType: 'first',
          metadata: {
            user_id: user.id,
            plan: plan,
            interval: interval,
            type: 'subscription_first_payment'
          }
        })
      });

      if (!firstPaymentResponse.ok) {
        const error = await firstPaymentResponse.json();
        throw new Error(`Mollie API error: ${JSON.stringify(error)}`);
      }

      const firstPayment = await firstPaymentResponse.json();

      // Sauvegarder le paiement initial dans la DB
      await supabaseClient.from('mollie_payments').insert({
        user_id: user.id,
        mollie_customer_id: mollieCustomerId,
        mollie_payment_id: firstPayment.id,
        amount_value: parseFloat(amount),
        amount_currency: 'EUR',
        description: `${description} - 1er paiement`,
        status: firstPayment.status,
        method: firstPayment.method || null,
        checkout_url: firstPayment._links.checkout.href,
        redirect_url: `${APP_URL}/subscription/success`,
        webhook_url: webhookUrl,
        metadata: {
          plan: plan,
          interval: interval,
          type: 'subscription_first_payment'
        }
      });

      // Créer l'abonnement (sera activé après le premier paiement)
      const subscriptionResponse = await fetch(
        `https://api.mollie.com/v2/customers/${mollieCustomerId}/subscriptions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${MOLLIE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: {
              currency: 'EUR',
              value: amount
            },
            interval: interval,
            description: description,
            webhookUrl: webhookUrl,
            metadata: {
              user_id: user.id,
              plan: plan
            }
          })
        }
      );

      if (!subscriptionResponse.ok) {
        const error = await subscriptionResponse.json();
        throw new Error(`Mollie subscription error: ${JSON.stringify(error)}`);
      }

      const subscription = await subscriptionResponse.json();

      // Sauvegarder l'abonnement dans la DB
      await supabaseClient.from('mollie_subscriptions').insert({
        user_id: user.id,
        mollie_customer_id: mollieCustomerId,
        mollie_subscription_id: subscription.id,
        plan_name: plan,
        amount_value: parseFloat(amount),
        amount_currency: 'EUR',
        interval: interval,
        status: subscription.status,
        start_date: subscription.startDate,
        next_payment_date: subscription.nextPaymentDate || null,
        description: description,
        metadata: {
          plan: plan,
          interval: interval
        }
      });

      // Mettre à jour le paiement avec le subscription_id
      await supabaseClient
        .from('mollie_payments')
        .update({ mollie_subscription_id: subscription.id })
        .eq('mollie_payment_id', firstPayment.id);

      return new Response(
        JSON.stringify({
          success: true,
          checkoutUrl: firstPayment._links.checkout.href,
          paymentId: firstPayment.id,
          subscriptionId: subscription.id,
          type: 'subscription'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    } else {
      // Créer un paiement one-time
      const paymentResponse = await fetch('https://api.mollie.com/v2/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MOLLIE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: {
            currency: 'EUR',
            value: amount
          },
          description: description,
          redirectUrl: `${APP_URL}/payment/success`,
          webhookUrl: webhookUrl,
          customerId: mollieCustomerId,
          metadata: {
            user_id: user.id,
            plan: plan,
            type: 'one_time_payment'
          }
        })
      });

      if (!paymentResponse.ok) {
        const error = await paymentResponse.json();
        throw new Error(`Mollie API error: ${JSON.stringify(error)}`);
      }

      const payment = await paymentResponse.json();

      // Sauvegarder le paiement dans la DB
      await supabaseClient.from('mollie_payments').insert({
        user_id: user.id,
        mollie_customer_id: mollieCustomerId,
        mollie_payment_id: payment.id,
        amount_value: parseFloat(amount),
        amount_currency: 'EUR',
        description: description,
        status: payment.status,
        method: payment.method || null,
        checkout_url: payment._links.checkout.href,
        redirect_url: `${APP_URL}/payment/success`,
        webhook_url: webhookUrl,
        metadata: {
          plan: plan,
          type: 'one_time_payment'
        }
      });

      return new Response(
        JSON.stringify({
          success: true,
          checkoutUrl: payment._links.checkout.href,
          paymentId: payment.id,
          type: 'one_time'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

  } catch (error) {
    console.error("Payment creation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
