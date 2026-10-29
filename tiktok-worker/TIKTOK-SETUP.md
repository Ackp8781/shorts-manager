# Connecting TikTok accounts

TikTok sign-in needs a secret key that cannot live in the public site. A small Cloudflare Worker (`worker.js`) holds it. Both services are free.

## 1. Deploy the worker (Cloudflare)

1. Sign up at https://dash.cloudflare.com.
2. Go to **Workers & Pages** > **Create** > **Create Worker**. Name it `shorts-tiktok`, then click **Deploy**.
3. Click **Edit code**. Replace everything with the contents of `worker.js`, then click **Deploy**.
4. Copy the worker URL, for example `https://shorts-tiktok.yourname.workers.dev`.

## 2. Create the TikTok app

1. Sign up at https://developers.tiktok.com and go to **Manage apps** > **Connect an app**.
2. Fill in the app name, icon, category and description. TikTok asks for a terms of service URL and a privacy policy URL; your site URL works for both while you test.
3. Under **Products**, add **Login Kit**.
4. In Login Kit, add this **redirect URI** (your worker URL plus `/callback`):
   `https://shorts-tiktok.yourname.workers.dev/callback`
5. Under **Scopes**, enable `user.info.basic`, `user.info.stats` and `video.list`.
6. Copy the **Client key** and **Client secret**.
7. Submit the app for review. Until it is approved, use **Sandbox** mode and add your TikTok accounts as target users there.

## 3. Give the worker its keys

In Cloudflare, open the worker > **Settings** > **Variables and Secrets**. Add:

| Name | Type | Value |
|---|---|---|
| `TIKTOK_CLIENT_KEY` | Text | your client key |
| `TIKTOK_CLIENT_SECRET` | Secret | your client secret |
| `SITE_URL` | Text | `https://ackp8781.github.io/shorts-manager/` |

Click **Deploy**.

## 4. Connect in the app

1. Open the site and unlock it.
2. Click **Accounts** > **Setup**, and paste the worker URL into **TikTok worker URL**.
3. Click **+ TikTok** and sign in. You come back to the site; unlock it again and the account connects and syncs.

Repeat **+ TikTok** for each account. Each account stays signed in for up to a year in this browser.
