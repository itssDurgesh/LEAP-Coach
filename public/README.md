# Public assets

Files here are served from the site root (`/logo.png`, `/professor.jpg`, …).

| File | Used for |
| --- | --- |
| `logo-mark.png` | The LEAP emblem (three figures and gold star), trimmed square. Used by the logo in every header, the favicon/app icon and as the AI tutor's face (`components/ui/Logo.tsx`, `components/marketing/Brand.tsx`). |
| `logo.png` | The full-size emblem, referenced in the site metadata and structured data (`app/layout.tsx`). |
| `professor.jpg` | Photo of Prof. Vishal Gupta (`components/ProfessorPhoto.tsx`, admin Team page). If it is missing the UI shows his initials instead. |
| `professor-hero.mp4` | The short clip in the home page hero and scroll story (`components/HeroMedia.tsx`). Keep it small (about 450 KB today): every copy on the page shares one download. |
| `og-image.png` | The preview image shown when the site is shared on social media (`app/layout.tsx`). |

Fonts are not here: they are self-hosted from `app/fonts/` through `next/font/local`.
Everything admins upload (topic covers, notes, audio, resources, avatars, team
photos) goes to the Supabase Storage bucket `media`, not to this folder.
