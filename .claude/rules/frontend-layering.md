# Frontend layering

Domain rule for frontend code, stack-agnostic (framework-specific examples generalize the same shape regardless of which component/state library is in use). Applies whenever an agent writes, refactors, or reviews UI code.

## Mandatory layer flow

```
Component        → UI only, dumb, no logic
    ↓ calls
Hook              → bridge: formats data for UI, exposes actions
    ↓ calls
Store (state)     → centralized state, calls services, handles loading/error
    ↓ calls
Service           → business logic, validation, mapping — stateless
    ↓ calls
API layer         → single client instance, interceptors
    ↓ HTTP
Backend
```

Never skip a layer, never call a lower layer directly from a higher one. Each layer has exactly one job; skipping layers is what makes UI code untestable and turns small changes into cross-cutting refactors.

### Component (dumb/presentational)
- Never fetches data directly (no `fetch`/HTTP client/service call).
- Never accesses global state directly — only through a hook.
- Never transforms, normalizes, or validates data — receives it ready to render.
- Local state is UI-only (`isOpen`, `activeTab`); application data never lives in component state.
- Quick check: if a component imports a data-fetching primitive, formats data, or holds domain data in local state, it has taken on a job that belongs to a lower layer.

### Hook (bridge)
- Never calls the API layer directly.
- Never contains business logic — that belongs in the service.
- One hook per feature domain; returns only what the component needs, not the whole store surface.

### Store (state)
- The only layer that calls services.
- Separate concerns explicitly: raw state, derived getters, mutations, async actions.
- Filter/sort/pagination state changes recompute from already-loaded data — they don't trigger a new network request.

### Service (business logic)
- Stateless, framework-agnostic. Validation, mapping, business rules live here — nowhere else.

## File size limit — split at ~500 lines

A file past ~500 lines of application code reliably signals mixed responsibilities, regardless of layer. Split by extracting the distinct responsibility into its own file (sub-component, domain-specific hook, sub-store, sub-service) rather than letting the original file keep growing. Check the target file's line count before adding code — split first if the addition would cross the threshold.

This does not apply to documentation, config, or generated files — only application code.

## DRY — extract before repeating

The moment the same UI block, state pattern, or transformation appears in two places, extract it (sub-component, custom hook, or utility function) rather than letting a third copy appear. Before creating something new, check whether an equivalent already exists to compose instead.
