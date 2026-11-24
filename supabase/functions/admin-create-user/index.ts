import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ success: false, error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminEmail = (Deno.env.get("JIO_ADMIN_EMAIL") || "golddy070@gmail.com").toLowerCase();

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return reply({ success: false, error: "Server authentication is not configured." }, 500);
  }

  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return reply({ success: false, error: "Admin login required." }, 401);

  const verifier = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await verifier.auth.getUser(token);
  if (authError || !authData.user || (authData.user.email || "").toLowerCase() !== adminEmail) {
    return reply({ success: false, error: "Only the configured JIO PLAY Admin can create users." }, 403);
  }

  let body: { username?: string; password?: string };
  try { body = await req.json(); } catch { return reply({ success: false, error: "Invalid request." }, 400); }

  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!/^[a-z0-9]{3,20}$/.test(username)) {
    return reply({ success: false, error: "User ID must be 3–20 letters or numbers, without spaces." }, 400);
  }
  if (password.length < 8) {
    return reply({ success: false, error: "Password must contain at least 8 characters." }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = username + "@users.jio-play-v2.invalid";
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { jio_username: username },
    app_metadata: { jio_role: "user", jio_username: username, jio_status: "active" },
  });

  if (createError) {
    const duplicate = /already|registered|exists/i.test(createError.message);
    return reply({
      success: false,
      error: duplicate ? "This User ID already exists in secure authentication." : createError.message,
    }, duplicate ? 409 : 400);
  }

  return reply({
    success: true,
    user: { id: created.user.id, username, status: "active" },
  });
});
