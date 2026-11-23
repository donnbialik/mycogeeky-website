# Featured observation (homepage specimen sheet)

The homepage's specimen sheet shows one iNaturalist observation.

* **Built-in feature:** `src/data/featuredObservation.ts` (observation number, photo, field note). Used when nothing has
  been saved on the admin page, and as the no-JavaScript fallback. Changing it needs a new build.
* **Saved feature:** chosen at **/admin/feature/** (owner only). It is stored in Workers KV and swapped into the homepage
  as the page is served (`functions/index.js`), so it shows immediately, with no rebuild.
* One renderer draws the sheet everywhere: `src/lib/feature-sheet.js` (build, live homepage, admin preview).

## Using the admin page

1. Open `/admin/feature/` and sign in (Cloudflare Access, owner e-mail).
2. Enter an observation number or paste its iNaturalist link, then **Load observation**.
3. Pick a photo, then drag it in the preview or use the sliders to frame it. Check every field; trim the locality if the
   exact place shouldn't be public.
4. **Put it on the homepage.** The last 20 features are kept under **Earlier features**, each with **Restore**.
   **Go back to the built-in feature** removes the saved one.

Rules the page enforces: only iNaturalist photos; other people's photos need a Creative Commons licence and are credited;
the question link must be a page on this site (starting with `/`) or an `https://` address.

## One-time setup (owner, Cloudflare dashboard)

1. **Storage:** Storage & Databases → KV → two namespaces: `mycoview-site` (live) and `mycoview-site-preview` (previews).
2. **Binding:** Workers & Pages → `mycogeeky-website` → Settings → Bindings → KV namespace, variable name `SITE`:
   **Production** → `mycoview-site`; **Preview** → `mycoview-site-preview`. Keeping them separate means a feature saved
   while testing on a preview address never changes the live homepage. (Set up 22–23 Nov 2026.)
3. **Sign-in on the live site:** in Zero Trust → Access → Applications, make sure an application covers
   `mycoview.com/admin` and `mycoview.com/api/admin` with a policy that allows only your e-mail.
   (Preview addresses on `*.mycogeeky-website.pages.dev` are already covered by the Explorer's application.)
4. **Variables:** the Production environment needs the same `ACCESS_AUD`, `ACCESS_TEAM_DOMAIN` and `OWNER_EMAIL` the
   Preview environment already has for the Explorer (use the AUD tag of the application from step 3).
5. Retry the latest deployment so the binding takes effect.

Until `SITE` exists the homepage simply shows the built-in feature, and the admin page says storage isn't set up.
Without a valid Access sign-in for the owner e-mail, the admin API refuses every request (it fails closed).

## Tested (22 Nov 2026, local Cloudflare runtime with test sign-in keys)

No sign-in, a non-owner, and a request from another site are refused (403). An "all rights reserved" photo by someone
else, and a `javascript:` link, are refused (400). Text with HTML in it is escaped on the homepage. An owner save shows
on the homepage at once and the previous feature moves to the history.
