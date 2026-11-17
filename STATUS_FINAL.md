# Admin Panel — SQL Migration Fix Complete

## Issue
`ERROR: 42P13: input parameters after one with a default value must also have defaults`

**Root cause:** In `supabase/migrations/0006_admin_panel.sql`, the function `public.admin_notice_save` defined:
```sql
p_id uuid default null,      -- has default
p_title text,                 -- NO default ← violates rule
p_body text,                  -- NO default
...
p_expires_at timestamptz default null  -- has default, but too late
```

PostgreSQL enforces: once a parameter has a default, all subsequent parameters must also have defaults. The `p_id` default came too early, causing error 42P13.

## Fix
Removed `default null` from `p_id` in `admin_notice_save`:
```sql
-- Before (broken):
p_id uuid default null,

-- After (fixed):
p_id uuid,
```

The function body already handles `p_id is not null` (update vs insert), so this is safe.

## Changed Files
- `supabase/migrations/0006_admin_panel.sql` — 1 line changed (removed `default null` from `p_id`)
- `git commit e511f4a` — "Fix admin_notice_save RPC: remove default null from p_id parameter"
- `git push origin master` — deployed to Netlify

## Verification
- Migration can now be applied without 42P13 error
- All admin RPCs are valid:
  - `admin_dashboard_stats(p_secret text)` ✅
  - `admin_rooms_all(p_secret text)` ✅
  - `admin_notices_list(p_secret text)` ✅
  - `admin_notice_save(p_secret text, p_id uuid, p_title text, p_body text, p_type text, p_is_active boolean, p_expires_at timestamptz default null)` ✅
  - `admin_notice_delete(p_secret text, p_id uuid)` ✅
  - `admin_seo_list(p_secret text)` ✅
  - `admin_seo_save(p_secret text, p_page_path text, p_title text default null, p_description text default null, p_og_image text default null)` ✅
- Netlify auto-deploys on push; admin panel live at `/admin` once `VITE_ADMIN_SECRET` is set

## Full Commit History (most recent first)
```
e511f4a Fix admin_notice_save RPC: remove default null from p_id parameter
99dbee5 Add single-player practice mode vs CPU + admin panel with dashboard, rooms, notices, SEO, settings
adad750 Add single-player practice mode vs CPU
f903d12 Fix dark-mode text contrast across the full UI
```