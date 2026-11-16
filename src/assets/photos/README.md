# MycoView photographs

This folder holds the original photographs used on MycoView pages, and candidates being considered for them.

## Why this folder (not `public/images/`)

At build time Astro resizes every photo used on a page and converts it to WebP, so visitors download a version sized for their screen instead of the full original. A 1 MB original typically becomes 40–150 KB.

Photos in this folder are **only published when a page uses them**. Candidates that no page uses are not deployed, so they are not reachable on the live site. (Anything in `public/` is always published.)

## Uploading

Upload JPG, PNG, or WebP originals here. Use descriptive lowercase hyphenated filenames (for example `forest-documentation-overhead-01.jpg`). Upload the original photo, not a screenshot of it in a phone photo viewer. Remove sensitive GPS metadata if needed, and confirm permission before publishing photographs of identifiable people, particularly children.

## Using a photo on a page

```astro
---
import Photo from '../components/Photo.astro'; // adjust the ../ to the page's folder depth
---
<Photo src="forest-documentation-overhead-01.jpg" alt="Describe what the photo shows" loading="lazy" />
```

- `src` is just the file name.
- `alt` is required: describe the photo for people who can't see it.
- `display` (optional) is the widest the photo appears on desktop, in CSS pixels. The default, 700, suits most photos. Use a smaller number for thumbnails and portraits (e.g. `display={180}`) so phones download less.
- `quality` (optional) defaults to 78. Logos and line art look better at 90.
- If the file name is wrong, the build stops with an error naming the missing photo, instead of publishing a broken image.
