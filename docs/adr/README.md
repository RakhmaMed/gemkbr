# ADR-001: Modular monolith
Adopt a single deployable Node app with clear internal modules instead of microservices.

# ADR-002: Pure Bracelet Engine
Business logic for bracelet design lives in pure TypeScript with no Astro/Svelte/Three/Drizzle imports.

# ADR-003: SQLite + repository ports
SQLite via Drizzle for MVP; subject-specific repository interfaces allow a later PostgreSQL implementation.

# ADR-004: Integer money
All monetary values are integer minor units (kopecks, RUB). Never float.

# ADR-005: Server price truth
Frontend price is UX-only. Save/cart/checkout recalculate from DB variants.

# ADR-006: Astro Actions
Internal mutations use Astro Actions + Zod, not a public REST surface.

# ADR-007: Better Auth
Authentication and sessions are handled by Better Auth with HttpOnly cookies.

# ADR-008: Transactional outbox
Order notifications are written in the same DB transaction as the order and drained by a worker.

# ADR-009: Storage port
Preview binaries go through Storage (LocalFilesystem now, S3 later).

# ADR-010: Product designer engines
Bracelet is the first product-specific engine; bags/necklaces become sibling modules later.

# ADR-011: Design schemaVersion
BraceletDesign JSON is versioned; migrations live under domain/bracelet.

# ADR-012: Guest-first checkout
Constructor and checkout work without an account; auth unlocks saved designs/wishlist/history.

# ADR-013: Circular layout v1
LayoutPose is produced by arc-length circular layout; algorithm is replaceable behind the same contract.

# ADR-014: PII-safe notifier mode
OrderNotifier supports console / pii_safe / full payloads for external integrations.
