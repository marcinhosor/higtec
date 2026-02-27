import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user is admin
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

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    if (req.method === "GET" || body.action === "get") {
      // Return masked versions of current credentials
      const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") || "";
      const publicKey = Deno.env.get("MERCADOPAGO_PUBLIC_KEY") || "";

      return new Response(
        JSON.stringify({
          access_token_set: accessToken.length > 0,
          access_token_preview: accessToken.length > 8
            ? `${accessToken.substring(0, 8)}...${"*".repeat(20)}`
            : "",
          public_key_set: publicKey.length > 0,
          public_key_preview: publicKey.length > 8
            ? `${publicKey.substring(0, 8)}...${"*".repeat(20)}`
            : "",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Note: Deno.env.set is not persistent in edge functions.
    // Secrets must be set via the Lovable Cloud secrets management.
    // This endpoint validates the credentials format and confirms they should be updated.
    const { access_token, public_key } = body;

    const errors: string[] = [];
    if (access_token !== undefined && typeof access_token !== "string") {
      errors.push("Access Token deve ser uma string");
    }
    if (public_key !== undefined && typeof public_key !== "string") {
      errors.push("Public Key deve ser uma string");
    }
    if (access_token && !access_token.startsWith("APP_USR-")) {
      errors.push("Access Token inválido — deve começar com APP_USR-");
    }
    if (public_key && !public_key.startsWith("APP_USR-")) {
      errors.push("Public Key inválida — deve começar com APP_USR-");
    }

    if (errors.length > 0) {
      return new Response(JSON.stringify({ error: errors.join("; ") }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        message:
          "Credenciais validadas. Para atualizar os segredos, utilize o painel de segredos do Lovable Cloud.",
        validated: true,
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
