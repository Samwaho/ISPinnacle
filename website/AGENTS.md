# Repository Guidelines

## Project Structure & Module Organization
The Next.js App Router lives in `app/`. Segment folders like `app/(root)` and `app/hotspot` isolate major flows, while API handlers sit under `app/api`. Shared UI components live in `components/`, hooks in `hooks/`, and domain helpers (auth, formatting, TRPC caller) in `lib/`, `auth.ts`, and `routes.ts`. Validation schemas reside in `schemas/`, TRPC routers in `trpc/`, and Prisma schema plus migrations in `prisma/`. Static assets are stored in `public/`, and Tailwind globals live in `app/globals.css`.

## Build, Test, and Development Commands
- `npm run dev` — launches the local Next server on `http://localhost:3000` with hot reload.
- `npm run build` — compiles the App Router bundles, processes Tailwind, and checks for type errors.
- `npm run start` — serves the production build; use this before shipping config or schema changes.
- `npm run lint` — runs the shared ESLint config; this is the lightweight pre-flight gate.
- `npx prisma migrate dev` / `npx prisma studio` — update the schema and inspect data; keep migrations under `prisma/migrations/`.

## Coding Style & Naming Conventions
Write TypeScript everywhere; keep server-only utilities in `lib/server-*.ts` and client hooks/components suffixed with `use*.ts` or `*.client.tsx`. Follow the ESLint + Next rules (2-space indent, single quotes, no default exports for components). Co-locate related UI in folders using kebab-case (e.g., `voucher-table/`), while exported React components use PascalCase filenames. Tailwind classes should remain mobile-first and leverage the design tokens defined in `app/globals.css`.

## Testing Guidelines
A formal test runner is not shipped yet. When contributing, add focused specs alongside the feature (e.g., `components/voucher/__tests__/voucher-table.spec.tsx`) using Testing Library + Vitest or Playwright. At minimum, provide reproduction steps and screenshots in the PR, and ensure `npm run lint` passes. Exercise TRPC routers via their caller helpers in `trpc/routers` so regressions in validation are caught early.

## Commit & Pull Request Guidelines
Commits follow the conventional short prefix used in the log (`feat:`, `fix:`, `chore:`, `refactor:`). Keep them scoped to a single concern and reference tickets in the body (`Refs #123`). PRs must describe the change, list migration/env impacts, attach UI screenshots for visual updates, and link the relevant issue. Add reviewer checklist items for schema or auth changes.

## Security & Configuration Tips
All secrets are loaded via `.env`; start from `env.example` and never commit filled files. Any change to auth providers must update both `auth.ts` and `auth.config.ts`. Prisma schema edits should also update validation inside `schemas/` and the TRPC procedures that expose the data.
