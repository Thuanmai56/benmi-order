# Menu update safety (P0)

`POST /api/menu` now upserts supplied records. Omitted items, categories and customization groups are preserved. An empty customization list is not an instruction to delete existing groups. Malformed customization data fails validation before any writes.

Explicit deletions use an optional top-level field:

```json
{
  "__delete": {
    "categories": ["tenant_category_id"],
    "items": ["tenant_item_id"],
    "customizations": ["custom_tenant_group_id"]
  }
}
```

Category identifiers also accept the tenant's existing slug for compatibility with newly saved editor categories. IDs must resolve within the request tenant. Deleting a category deletes its child menu items; deleting a customization section additionally requires its group IDs. All writes/deletes use the existing atomic D1 batch. Missing database bindings fail instead of acknowledging an unsaved menu.

The POS retains item IDs on rename, assigns unique IDs to new items, and derives deletion lists only from its successfully loaded snapshot. Category deletion sends one deletion-only request and preserves unrelated draft edits. Old clients that omit records no longer delete those records; refresh the POS before using deletion.

Bootstrap reports `menuComplete` and `customizationCategoryId`. The editor requires a complete response, bypasses KV when loading, and offers retry on failure rather than editing a legacy fallback. Failed core queries or malformed customization JSON cannot mark a response complete or cache it.

Deploy the backend before the frontend: the new frontend deliberately refuses to save when talking to an older backend without `menuComplete`. No database migration is required. This change does not include P1 revision conflict detection, audit history, or checkout validation.

Validation:

- `npm run test:menu-safety` (Node with `node:sqlite`; worker TypeScript dependency installed).
- `npm run check`.
- `cd benmi-worker-official && npx tsc --noEmit`.

The regression suite executes production sync SQL on isolated in-memory SQLite databases and exercises editor behavior in a VM. It does not mutate remote D1 or verify a live deployment.
