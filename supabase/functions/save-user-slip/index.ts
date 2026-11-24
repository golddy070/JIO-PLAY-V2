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
  const adminEmail = (Deno.env.get("JIO_ADMIN_EMAIL") || "golddy070@gmail.com").toLowerCase();
  if (!supabaseUrl || !serviceRoleKey) return reply({ success: false, error: "Server authentication is not configured." }, 500);

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\\s+/i, "");
  if (!token) return reply({ success: false, error: "Login required." }, 401);

  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await db.auth.getUser(token);
  if (authError || !authData.user) return reply({ success: false, error: "Your login session is invalid. Please sign in again." }, 401);

  const authUser = authData.user;
  const email = String(authUser.email || "").toLowerCase();
  const isAdmin = email === adminEmail;
  const username = String(
    authUser.app_metadata?.jio_username ||
    authUser.user_metadata?.jio_username ||
    (email.endsWith("@users.jio-play-v2.invalid") ? email.slice(0, -"@users.jio-play-v2.invalid".length) : "")
  ).trim().toLowerCase();

  if (!isAdmin && (!/^[a-z0-9]{3,20}$/.test(username) || email !== username + "@users.jio-play-v2.invalid" ||
      String(authUser.app_metadata?.jio_role || "").toLowerCase() !== "user")) {
    return reply({ success: false, error: "This account is not authorized to save JIO PLAY slips." }, 403);
  }

  let body: { slip?: Record<string, unknown> };
  try { body = await req.json(); } catch { return reply({ success: false, error: "Invalid request body." }, 400); }
  const slip = body?.slip;
  if (!slip || typeof slip !== "object" || Array.isArray(slip)) return reply({ success: false, error: "Slip data is missing." }, 400);
  if (JSON.stringify(slip).length > 200000) return reply({ success: false, error: "Slip data is too large." }, 413);

  if (!isAdmin) {
    const { data: stateRow, error: stateError } = await db.from("jio_play_state").select("data").eq("id", "main").maybeSingle();
    if (stateError) {
      console.error("save-user-slip profile lookup failed", stateError);
      return reply({ success: false, error: "Could not verify your JIO PLAY account." }, 503);
    }
    const cloud = stateRow?.data;
    const meta = cloud && (cloud.meta || cloud);
    const profiles = Array.isArray(meta?.users) ? meta.users : [];
    const profile = profiles.find((u: Record<string, unknown>) => String(u.id || "").trim().toLowerCase() === username);
    const trustedStatus = String(authUser.app_metadata?.jio_status || "active").toLowerCase();
    const profileStatus = String(profile?.status || trustedStatus || "active").toLowerCase();
    if (!profile && String(authUser.app_metadata?.jio_role || "").toLowerCase() !== "user") {
      return reply({ success: false, error: "Your JIO PLAY profile could not be verified." }, 403);
    }
    if (profileStatus !== "active") return reply({ success: false, error: profileStatus === "paused" ? "Your account is paused. Slip generation is disabled." : "Your account is blocked." }, 403);
    if (String(slip.user || "").trim().toLowerCase() !== username) {
      return reply({ success: false, error: "Slip owner does not match the signed-in user." }, 403);
    }
  }

  const cloudKey = String(slip.cloudKey || "").trim();
  if (!/^[a-zA-Z0-9_-]{8,120}$/.test(cloudKey)) return reply({ success: false, error: "Slip identifier is invalid." }, 400);

  const { error: saveError } = await db.from("jio_play_slips").upsert({
    cloud_key: cloudKey,
    data: slip,
  }, { onConflict: "cloud_key" });
  if (saveError) {
    console.error("save-user-slip database write failed", saveError);
    return reply({ success: false, error: "Could not save this slip to the shared database." }, 503);
  }

  return reply({ success: true, cloudKey });
});
