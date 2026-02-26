# Contributing to AgentForge

## Branch Naming

- `feature/<description>` — New features
- `fix/<description>` — Bug fixes
- `refactor/<description>` — Code refactoring
- `docs/<description>` — Documentation changes

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with clear, atomic commits
3. Ensure `npm run build` passes without errors
4. Run `npm run lint` and fix any issues
5. Open a pull request with:
   - Clear title describing the change
   - Description of what and why
   - Screenshots for UI changes
6. Request review from a maintainer

## Development Setup

```bash
cd agentforge
cp .env.example .env
# Fill in your environment variables

npm install
npx prisma generate
npx prisma db push
npm run dev
```

## Code Style

- TypeScript strict mode — no `any` types
- Use Zod for runtime validation on all API inputs
- Components in `src/components/`, utilities in `src/lib/`
- Use shadcn/ui components from `src/components/ui/`
- Follow existing patterns for API routes and page components
