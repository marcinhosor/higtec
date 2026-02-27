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

    // GET action - return current credentials status
    if (body.action === "get") {
      const { data: settings } = await supabase
        .from("admin_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["mp_access_token", "mp_public_key"]);

      const accessToken = settings?.find(s => s.setting_key === "mp_access_token")?.setting_value || "";
      const publicKey = settings?.find(s => s.setting_key === "mp_public_key")?.setting_value || "";

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

    // SAVE action - validate and store credentials
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

    // Upsert credentials into admin_settings
    const upserts: Promise<any>[] = [];

    if (access_token) {
      upserts.push(
        supabase.from("admin_settings").upsert(
          { setting_key: "mp_access_token", setting_value: access_token, updated_at: new Date().toISOString() },
          { onConflict: "setting_key" }
        )
      );
    }

    if (public_key) {
      upserts.push(
        supabase.from("admin_settings").upsert(
          { setting_key: "mp_public_key", setting_value: public_key, updated_at: new Date().toISOString() },
          { onConflict: "setting_key" }
        )
      );
    }

    const results = await Promise.all(upserts);
    const upsertErrors = results.filter(r => r.error);

    if (upsertErrors.length > 0) {
      console.error("Upsert errors:", upsertErrors.map(r => r.error));
      return new Response(
        JSON.stringify({ error: "Erro ao salvar credenciais no banco de dados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Credenciais salvas com sucesso!",
        saved: true,
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
