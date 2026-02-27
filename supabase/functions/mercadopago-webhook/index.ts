import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Mercado Pago webhook received:", JSON.stringify(body));

    const { type, data } = body;

    if (type !== "payment") {
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Read access token from admin_settings (database), fallback to env var
    let accessToken = "";
    const { data: tokenSetting } = await supabase
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", "mp_access_token")
      .maybeSingle();

    accessToken = tokenSetting?.setting_value || Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") || "";

    if (!accessToken) {
      console.error("MERCADOPAGO_ACCESS_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentId = data?.id;
    if (!paymentId) {
      return new Response(JSON.stringify({ error: "No payment ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let mpResponse;
    try {
      mpResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    } catch (fetchErr) {
      console.error("Network error fetching payment:", fetchErr);
      return new Response(
        JSON.stringify({ received: true, error: "Network error fetching payment" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!mpResponse.ok) {
      const errText = await mpResponse.text();
      console.warn(`Mercado Pago API error [${mpResponse.status}]: ${errText}`);
      // Return 200 so MP doesn't retry — the payment may be a test or already expired
      return new Response(
        JSON.stringify({ received: true, warning: "Could not fetch payment details", mp_status: mpResponse.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payment = await mpResponse.json();
    console.log("Payment details:", JSON.stringify({
      id: payment.id,
      status: payment.status,
      external_reference: payment.external_reference,
      transaction_amount: payment.transaction_amount,
    }));

    if (payment.status === "approved") {
      const companyId = payment.external_reference;
      if (companyId) {
        const { error } = await supabase
          .from("companies")
          .update({
            plan_tier: "pro",
            stripe_customer_id: String(payment.payer?.id || ""),
            stripe_subscription_id: String(payment.id),
          })
          .eq("id", companyId);

        if (error) {
          console.error("Error updating company:", error);
        } else {
          console.log(`Company ${companyId} upgraded to pro`);
        }
      }
    }

    return new Response(JSON.stringify({ received: true, status: payment.status }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
