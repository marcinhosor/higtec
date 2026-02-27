import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get company_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: "Empresa não encontrada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get MP access token
    const { data: tokenSetting } = await supabase
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", "mp_access_token")
      .maybeSingle();

    const accessToken = tokenSetting?.setting_value || Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") || "";
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Gateway de pagamento não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { payment_method_id, token: cardToken, issuer_id, installments, payer, plan, payment_type } = body;

    // Validate plan
    const planConfig: Record<string, { title: string; price: number }> = {
      pro: { title: "HigTec PRO - Mensal", price: 99 },
      premium: { title: "HigTec PREMIUM - Mensal", price: 199 },
    };

    const planData = planConfig[plan];
    if (!planData) {
      return new Response(JSON.stringify({ error: "Plano inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build payment body based on type
    let paymentBody: Record<string, any> = {
      transaction_amount: planData.price,
      description: planData.title,
      external_reference: profile.company_id,
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      payer: {
        email: payer?.email || user.email || "",
        ...(payer?.identification ? { identification: payer.identification } : {}),
      },
    };

    if (payment_type === "pix") {
      paymentBody.payment_method_id = "pix";
    } else if (payment_type === "boleto") {
      paymentBody.payment_method_id = "bolbradesco";
      if (payer?.first_name) paymentBody.payer.first_name = payer.first_name;
      if (payer?.last_name) paymentBody.payer.last_name = payer.last_name;
    } else {
      // Card payment
      paymentBody.token = cardToken;
      paymentBody.payment_method_id = payment_method_id;
      paymentBody.installments = installments || 1;
      if (issuer_id) paymentBody.issuer_id = issuer_id;
    }

    console.log("Creating payment:", JSON.stringify({ type: payment_type, plan, amount: planData.price }));

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": `${profile.company_id}-${plan}-${Date.now()}`,
      },
      body: JSON.stringify(paymentBody),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("MP payment error:", JSON.stringify(mpData));
      return new Response(
        JSON.stringify({
          error: mpData.message || "Erro ao processar pagamento",
          details: mpData.cause || [],
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Payment created:", JSON.stringify({
      id: mpData.id,
      status: mpData.status,
      status_detail: mpData.status_detail,
    }));

    // Build response based on payment type
    const response: Record<string, any> = {
      id: mpData.id,
      status: mpData.status,
      status_detail: mpData.status_detail,
    };

    // Pix: return QR code data
    if (payment_type === "pix" && mpData.point_of_interaction?.transaction_data) {
      response.pix_qr_code = mpData.point_of_interaction.transaction_data.qr_code;
      response.pix_qr_code_base64 = mpData.point_of_interaction.transaction_data.qr_code_base64;
      response.pix_expiration = mpData.date_of_expiration;
    }

    // Boleto: return barcode/URL
    if (payment_type === "boleto" && mpData.transaction_details) {
      response.boleto_url = mpData.transaction_details.external_resource_url;
      response.barcode = mpData.barcode?.content;
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
