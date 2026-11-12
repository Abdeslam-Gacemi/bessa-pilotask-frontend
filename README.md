# Pilotask app (Vue 3 + Capacitor)

Vue 3 SFCs, TypeScript, Pinia, Vue Router, vue-i18n, VueUse, lodash-es,
Hugeicons, Tailwind CSS 4, Tiptap (rich text + @mentions), vue-draggable-plus
(kanban, touch-friendly), ECharts.

```bash
npm install
cp .env.example .env      # VITE_API_URL, optional VITE_FIREBASE_*
npm run dev
npm run build             # vue-tsc + vite build

# Mobile
npx cap add android       # once (and/or: npx cap add ios)
npm run android           # build, sync, open Android Studio
```

## Structure

```
src/
├── api/          axios client (token, language, error normalisation) + typed endpoints
├── components/
│   ├── ui/       design-system primitives (Pt*: button, sheet, pickers, toasts…)
│   ├── board/    kanban, list, timeline, status manager
│   ├── tasks/    card, row, form, drawer, comments
│   ├── analytics/ stat tiles, throughput chart, bar lists
│   ├── activity/ feed + human-readable entries
│   └── editor/   Tiptap editor with @mentions
├── composables/  useBoardTasks (optimistic moves), useTaskUi, useDates, useToast, useConfirm…
├── domain/       pure logic: priorities, calendar grid, timeline bars
├── layouts/      AppShell (sidebar on desktop, floating bottom bar + FAB on phones)
├── locales/      fr (default), en, ar
├── services/     push (Capacitor + Firebase web), token storage
├── stores/       session, preferences (theme/locale/RTL), meta, projects, notifications
└── views/        one file per screen
```

Design tokens live in `src/styles/main.css` (`--pt-*`, light and dark). Layout
uses logical properties (`ms-`, `pe-`, `start-`…) so Arabic mirrors correctly.

## Deploy

Clone to `/opt/pilotask/frontend`, then `sudo bash ./deploy.sh` (after the backend's deploy): builds the app in
Docker and publishes it to `/opt/pilotask/web`, served on port 8013 with `/api` going
to Laravel. Keep `VITE_API_URL` unset (or `/api`) in the server's `.env`.
Local preview: `docker compose up -d --build` → http://localhost:8093.
