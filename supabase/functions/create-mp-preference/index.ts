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

    // Validate user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get company_id for external_reference
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

    // Get access token from admin_settings
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
    const { plan } = body;

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

    // Create preference via Mercado Pago API
    const preference = {
      items: [
        {
          title: planData.title,
          quantity: 1,
          unit_price: planData.price,
          currency_id: "BRL",
        },
      ],
      payer: {
        email: user.email || "",
      },
      external_reference: profile.company_id,
      back_urls: {
        success: `${req.headers.get("origin") || "https://higtec.lovable.app"}/checkout?status=approved`,
        failure: `${req.headers.get("origin") || "https://higtec.lovable.app"}/checkout?status=failure`,
        pending: `${req.headers.get("origin") || "https://higtec.lovable.app"}/checkout?status=pending`,
      },
      auto_return: "approved",
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
    };

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preference),
    });

    if (!mpResponse.ok) {
      const errText = await mpResponse.text();
      console.error("MP preference error:", errText);
      return new Response(JSON.stringify({ error: "Erro ao criar preferência de pagamento" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prefData = await mpResponse.json();
    console.log("Preference created:", prefData.id);

    return new Response(
      JSON.stringify({
        preference_id: prefData.id,
        init_point: prefData.init_point,
        sandbox_init_point: prefData.sandbox_init_point,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
