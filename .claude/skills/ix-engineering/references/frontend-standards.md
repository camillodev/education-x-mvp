# Frontend Standards — Impact X

## Stack padrão
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand (global) + React state (local)
- **Forms**: React Hook Form + Zod
- **Data Fetching**: TanStack Query (React Query)
- **Testing**: Vitest + Testing Library

## Estrutura de pastas
```
src/
├── app/                # Next.js App Router pages
│   ├── (auth)/         # Route groups
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/             # Primitives (Button, Input, Card, Dialog)
│   └── features/       # Feature components (LoginForm, DashboardChart)
├── hooks/              # Custom hooks (useAuth, useDebounce)
├── lib/                # Utilities
│   ├── api.ts          # API client
│   ├── utils.ts        # General helpers
│   └── constants.ts    # App constants
├── types/              # TypeScript types
├── stores/             # Zustand stores
└── styles/
    └── globals.css     # Tailwind config + custom CSS vars
```

## Naming conventions
| Item | Convention | Example |
|------|-----------|---------|
| Component files | kebab-case | `user-profile.tsx` |
| Component names | PascalCase | `UserProfile` |
| Functions/vars | camelCase | `getUserData` |
| Types/Interfaces | PascalCase | `UserProfile` |
| Constants | SCREAMING_SNAKE | `MAX_RETRY_COUNT` |
| CSS classes | Tailwind utilities | `flex items-center gap-4` |
| Hooks | use-prefixed camelCase | `useAuth` |

## Component patterns

### Functional component template
```tsx
import { type FC } from 'react'

interface UserCardProps {
  name: string
  email: string
  onEdit?: () => void
}

export const UserCard: FC<UserCardProps> = ({ name, email, onEdit }) => {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="font-semibold text-foreground">{name}</h3>
      <p className="text-sm text-muted-foreground">{email}</p>
      {onEdit && (
        <button onClick={onEdit} className="mt-2 text-sm text-primary">
          Edit
        </button>
      )}
    </div>
  )
}
```

### Rules
- ALWAYS type props with interface (not inline)
- NEVER use `any` — use `unknown` if truly unknown
- ALWAYS use named exports (not default)
- Prefer composition over prop drilling
- Max 150 lines per component — extract if larger
- Colocate: tests, types, and styles near their component

## Tailwind organization
Order classes: layout → sizing → spacing → typography → colors → borders → effects
```
className="flex items-center gap-4 w-full p-4 text-sm font-medium text-foreground bg-card border rounded-lg shadow-sm hover:bg-accent transition-colors"
```

## Performance patterns
- `React.memo` only when measured — not by default
- `useMemo`/`useCallback` for expensive computations or stable references
- Dynamic imports for heavy components: `const Chart = dynamic(() => import('./Chart'))`
- Image optimization: always use `next/image`
- Prefetch links with `<Link prefetch>`

## Error handling
- Wrap routes with Error Boundaries
- Show user-friendly error messages
- Log errors to console in dev, to service in prod
- Never show stack traces to users

## Accessibility basics
- All images have `alt` text
- Interactive elements are keyboard accessible
- Color contrast meets WCAG AA (4.5:1 text, 3:1 large)
- Form inputs have labels
- Use semantic HTML (`<nav>`, `<main>`, `<section>`)
