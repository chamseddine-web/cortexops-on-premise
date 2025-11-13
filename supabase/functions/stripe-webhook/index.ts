import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.10.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

Deno.serve(async (req: Request) => {
  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No signature");
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`Processing webhook: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  if (!userId) {
    console.error("No user_id in session metadata");
    return;
  }

  console.log(`Checkout completed for user ${userId}`);

  // Get the subscription
  if (session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    await updateSubscription(userId, subscription);
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;
  if (!userId) {
    console.error("No user_id in subscription metadata");
    return;
  }

  await updateSubscription(userId, subscription);
}

async function updateSubscription(userId: string, subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price.id;

  // Determine plan based on price ID
  let plan = "free";
  const proPriceId = Deno.env.get("STRIPE_PRICE_ID_PRO");
  const enterprisePriceId = Deno.env.get("STRIPE_PRICE_ID_ENTERPRISE");

  if (priceId === proPriceId) {
    plan = "pro";
  } else if (priceId === enterprisePriceId) {
    plan = "enterprise";
  }

  console.log(`Updating user ${userId} to plan ${plan}`);

  // Update subscription in database
  const { error: subError } = await supabase
    .from("stripe_subscriptions")
    .upsert({
      user_id: userId,
      subscription_id: subscription.id,
      customer_id: subscription.customer as string,
      status: subscription.status,
      price_id: priceId,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    });

  if (subError) {
    console.error("Error updating subscription:", subError);
    throw subError;
  }

  // Update user profile with new plan
  const { error: profileError } = await supabase
    .from("user_profiles")
    .update({
      user_plan: plan,
      user_status: subscription.status === "active" ? "active" : "inactive",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileError) {
    console.error("Error updating user profile:", profileError);
    throw profileError;
  }

  console.log(`Successfully updated user ${userId} to ${plan} plan`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;
  if (!userId) {
    console.error("No user_id in subscription metadata");
    return;
  }

  console.log(`Subscription deleted for user ${userId}`);

  // Mark subscription as canceled
  await supabase
    .from("stripe_subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("subscription_id", subscription.id);

  // Downgrade user to free plan
  await supabase
    .from("user_profiles")
    .update({
      user_plan: "free",
      user_status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  console.log(`User ${userId} downgraded to free plan`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`Payment succeeded for invoice ${invoice.id}`);

  // Log successful payment
  const customerId = invoice.customer as string;
  const { data: customer } = await supabase
    .from("stripe_customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (customer) {
    await supabase.from("payment_history").insert({
      user_id: customer.user_id,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_paid / 100, // Convert from cents
      currency: invoice.currency,
      status: "succeeded",
      created_at: new Date().toISOString(),
    });
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log(`Payment failed for invoice ${invoice.id}`);

  // Log failed payment
  const customerId = invoice.customer as string;
  const { data: customer } = await supabase
    .from("stripe_customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (customer) {
    await supabase.from("payment_history").insert({
      user_id: customer.user_id,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_due / 100,
      currency: invoice.currency,
      status: "failed",
      created_at: new Date().toISOString(),
    });

    // Optionally suspend user access
    await supabase
      .from("user_profiles")
      .update({
        user_status: "suspended",
        updated_at: new Date().toISOString(),
      })
      .eq("id", customer.user_id);

    console.log(`User ${customer.user_id} suspended due to payment failure`);
  }
}
