// Cloudflare Worker: keeps the TikTok client secret off the public site.
// Routes:
//   GET  /login?state=…   → redirects to TikTok sign-in
//   GET  /callback        → TikTok returns here; swaps the code for tokens, sends them back to the site in the URL hash
//   POST /refresh         → { refresh_token } → new tokens
//   POST /user            → { access_token } → profile (name, avatar, followers)
//   POST /videos          → { access_token, cursor? } → one page of videos
// Env vars: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET (secret), SITE_URL (e.g. https://ackp8781.github.io/shorts-manager/)

const API = "https://open.tiktokapis.com/v2/";
const SCOPES = "user.info.basic,user.info.stats,video.list";

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const site = new URL(env.SITE_URL);
    const cors = {
      "Access-Control-Allow-Origin": site.origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
    const redirectUri = url.origin + "/callback";

    if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    if (url.pathname === "/login") {
      const auth = new URL("https://www.tiktok.com/v2/auth/authorize/");
      auth.search = new URLSearchParams({
        client_key: env.TIKTOK_CLIENT_KEY, scope: SCOPES, response_type: "code",
        redirect_uri: redirectUri, state: url.searchParams.get("state") || "",
      });
      return Response.redirect(auth.toString(), 302);
    }

    if (url.pathname === "/callback") {
      const back = new URL(env.SITE_URL);
      const state = url.searchParams.get("state") || "";
      const code = url.searchParams.get("code");
      let payload;
      if (!code) {
        payload = { error: url.searchParams.get("error_description") || url.searchParams.get("error") || "Sign-in cancelled." };
      } else {
        payload = await token(env, { grant_type: "authorization_code", code, redirect_uri: redirectUri });
      }
      back.hash = "tt=" + encodeURIComponent(JSON.stringify({ ...payload, state }));
      return Response.redirect(back.toString(), 302);
    }

    if (req.method !== "POST") return json({ error: "Not found" }, 404);
    let body;
    try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }

    if (url.pathname === "/refresh") {
      return json(await token(env, { grant_type: "refresh_token", refresh_token: body.refresh_token || "" }));
    }

    if (url.pathname === "/user") {
      const r = await fetch(API + "user/info/?fields=open_id,display_name,avatar_url,follower_count", {
        headers: { Authorization: "Bearer " + body.access_token },
      });
      return json(await r.json(), r.status);
    }

    if (url.pathname === "/videos") {
      const r = await fetch(API + "video/list/?fields=id,title,video_description,duration,view_count,create_time,share_url", {
        method: "POST",
        headers: { Authorization: "Bearer " + body.access_token, "Content-Type": "application/json" },
        body: JSON.stringify({ max_count: 20, ...(body.cursor ? { cursor: body.cursor } : {}) }),
      });
      return json(await r.json(), r.status);
    }

    return json({ error: "Not found" }, 404);
  },
};

async function token(env, params) {
  const r = await fetch(API + "oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_key: env.TIKTOK_CLIENT_KEY, client_secret: env.TIKTOK_CLIENT_SECRET, ...params }),
  });
  const j = await r.json();
  if (j.error) return { error: j.error_description || j.error };
  return {
    access_token: j.access_token, refresh_token: j.refresh_token, open_id: j.open_id,
    expires_in: j.expires_in, refresh_expires_in: j.refresh_expires_in,
  };
}
