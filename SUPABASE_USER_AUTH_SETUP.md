# JIO-PLAY-V2 secure username login setup

The frontend now uses Supabase Auth for user accounts. User IDs such as `jack` are mapped internally to synthetic Auth emails:
`jack@users.jio-play-v2.invalid`. Users still type only their User ID and password.

## Important security notes

- Do not put a Supabase service-role/secret key in `index.html`, GitHub Pages, or any browser code.
- The `admin-create-user` Edge Function uses the service-role key only on the server.
- User passwords are not included in the `jio_play_state` user list.
- New passwords must be at least 8 characters. The old demo password `8055` is too short and must be replaced when the account is recreated.

## Deploy the Edge Function

Project ref: `ldvjvcffzodtwkxocreb`

Deploy this repository file as a Supabase Edge Function named exactly:

`supabase/functions/admin-create-user/index.ts`

Recommended deployment method (Supabase CLI):

```bash
supabase login
supabase link --project-ref ldvjvcffzodtwkxocreb
supabase functions deploy admin-create-user
```

Supabase Edge Functions normally receive `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` automatically. If your project does not expose the service-role variable to the function, add it under **Project Settings → Edge Functions → Secrets** using the service-role key from the Supabase dashboard. Also add:

- `JIO_ADMIN_EMAIL` = `golddy070@gmail.com`

Never share the service-role key in chat or commit it to GitHub.

## First test

1. Sign in to JIO-PLAY as Admin.
2. In Users, create a new ID such as `jack` and set a password with at least 8 characters.
3. Wait for the success message **Cloud account "jack" created**.
4. Open JIO-PLAY in a private/incognito browser or another phone.
5. Sign in using User ID `jack` and the new password.

The previous demo-only `jack` record can be recreated: the Admin form now asks the secure Auth function to create the real account and replaces the old local metadata record.

## Existing accounts

Old demo accounts were not Supabase Auth accounts. Recreate each one through Admin with a new password of at least 8 characters. Do not reuse the old 4-digit demo password.
