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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return reply({ success: false, error: "Server authentication is not configured." }, 500);
  }

  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return reply({ success: false, error: "Login required." }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return reply({ success: false, error: "Your login session is invalid. Please sign in again." }, 401);

  const authUser = authData.user;
  const email = String(authUser.email || "").toLowerCase();
  const username = String(
    authUser.app_metadata?.jio_username ||
    authUser.user_metadata?.jio_username ||
    (email.endsWith("@users.jio-play-v2.invalid") ? email.slice(0, -"@users.jio-play-v2.invalid".length) : "")
  ).trim().toLowerCase();

  if (!/^[a-z0-9]{3,20}$/.test(username) || email !== username + "@users.jio-play-v2.invalid") {
    return reply({ success: false, error: "This authentication account is not a valid JIO PLAY user." }, 403);
  }

  const { data, error } = await admin
    .from("jio_play_state")
    .select("data")
    .eq("id", "main")
    .maybeSingle();

  if (error) return reply({ success: false, error: "Could not load your JIO PLAY account. Please try again." }, 503);

  const cloudData = data?.data;
  const meta = cloudData && (cloudData.meta || cloudData);
  const list = Array.isArray(meta?.users) ? meta.users : [];
  const found = list.find((u: Record<string, unknown>) =>
    String(u.id || "").trim().toLowerCase() === username &&
    String(u.role || "user").toLowerCase() !== "admin"
  );

  // Older accounts may exist in Supabase Auth but not yet in the shared
  // jio_play_state user list. Their app_metadata is written only by the
  // trusted admin-create-user function, so it is a safe migration fallback.
  const trustedMeta = authUser.app_metadata || {};
  const trustedRole = String(trustedMeta.jio_role || "").toLowerCase();
  const profile = found || (
    trustedRole === "user" && String(trustedMeta.jio_username || "").toLowerCase() === username
      ? { id: username, role: "user", status: trustedMeta.jio_status || "active", multipliers: {} }
      : null
  );

  if (!profile) return reply({ success: false, error: "This User ID is not active in JIO PLAY. Contact Admin." }, 404);

  const status = String(profile.status || "active").toLowerCase();
  if (status === "blocked") return reply({ success: false, error: "Your account is BLOCKED by Admin." }, 403);

  return reply({
    success: true,
    user: {
      id: username,
      role: "user",
      status: status === "paused" ? "paused" : "active",
      multipliers: profile.multipliers && typeof profile.multipliers === "object" ? profile.multipliers : {},
    },
  });
});
