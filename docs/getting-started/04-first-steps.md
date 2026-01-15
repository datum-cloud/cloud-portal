# First Steps - Hands-On Exercises

Now that your environment is running, let's explore the codebase with hands-on exercises.

---

## Exercise 1: Navigate the Codebase

Get familiar with the project structure by finding these files.

### Task 1.1: Find the Organizations Resource

The organizations resource module contains all logic for managing organizations.

**Find:** `app/resources/organizations/`

<details>
<summary>Hint</summary>

```bash
ls app/resources/organizations/
```

You should see:
- `organization.schema.ts` - Zod types
- `organization.adapter.ts` - API transformers
- `organization.service.ts` - API calls
- `organization.queries.ts` - React Query hooks
- `index.ts` - Exports

</details>

### Task 1.2: Find the DNS Zones Page

Pages are in `app/routes/` using file-based routing.

**Find:** The DNS zones list page component

<details>
<summary>Hint</summary>

```bash
ls app/routes/**/dns-zones*
# or
find app/routes -name "*dns-zone*"
```

</details>

### Task 1.3: Find the Logger Module

Infrastructure modules live in `app/modules/`.

**Find:** `app/modules/logger/`

<details>
<summary>Hint</summary>

```bash
ls app/modules/logger/
```

Check the README if one exists for usage documentation.

</details>

---

## Exercise 2: Trace a Request

Understand how data flows through the application.

### Task 2.1: Watch Network Traffic

1. Open the app in your browser
2. Open DevTools → **Network** tab
3. Filter by **Fetch/XHR**
4. Navigate to a page (e.g., Organizations)
5. Find the API request

**Questions to answer:**
- What's the request URL?
- What headers are sent?
- What's the response structure?

### Task 2.2: Find the Log in Terminal

With the Network request selected:

1. Note the request path (e.g., `/api/organizations`)
2. Check your terminal where `bun run dev` is running
3. Find the matching log entry

**You should see:**
```
[INFO] GET /api/... 200 XXms
  → requestId: <uuid>
```

### Task 2.3: Copy the CURL Command

If `LOG_CURL=true` in your `.env`:

1. Find the CURL command in the terminal logs
2. Copy it
3. Run it in a new terminal

```bash
# Should work and return the same data
curl -X GET "https://..." -H "Authorization: ..."
```

---

## Exercise 3: Make a Small Change

Practice the development workflow.

### Task 3.1: Modify a Button Label

1. Find any button in the UI (e.g., "Create Organization")
2. Search for its text in the codebase:
   ```bash
   grep -r "Create Organization" app/
   ```
3. Change the text to "Create New Organization"
4. Save the file
5. Watch hot reload update the UI

### Task 3.2: Add a Console Log

1. Open `app/server/entry.ts`
2. Add a log in the health check:
   ```typescript
   app.get('/_healthz', (c) => {
     console.log('Health check called!');
     return c.json({ status: 'ok' });
   });
   ```
3. Hit the health endpoint: `curl http://localhost:3000/_healthz`
4. See your log in the terminal

### Task 3.3: Revert Your Changes

```bash
git checkout -- app/
```

---

## Exercise 4: Explore the UI Components

### Task 4.1: Find shadcn Components

List all shadcn/ui primitives:

```bash
ls app/modules/shadcn/ui/
```

### Task 4.2: Find datum-ui Components

List Datum's custom components:

```bash
ls app/modules/datum-ui/components/
```

### Task 4.3: Read a Component README

```bash
cat app/modules/datum-ui/components/data-table/README.md | head -100
```

---

## Exercise 5: Run the Tests

### Task 5.1: Run TypeScript Check

```bash
bun run typecheck
```

**Expected:** No errors

### Task 5.2: Run Linting

```bash
bun run lint
```

**Expected:** No errors (or auto-fixed)

### Task 5.3: Open Cypress (Optional)

```bash
bun run cypress:open
```

Explore the test structure without running them.

---

## Completion Checkpoint

You've completed onboarding if you can answer:

- [ ] Where do resource modules live? (`app/resources/`)
- [ ] Where do routes/pages live? (`app/routes/`)
- [ ] Where do infrastructure modules live? (`app/modules/`)
- [ ] How do you trace an API request? (Network tab → Terminal logs)
- [ ] What's the difference between shadcn and datum-ui?

---

## What's Next?

Now that you're oriented, explore these docs based on your needs:

| I want to... | Read... |
|--------------|---------|
| Understand the architecture | [Architecture Overview](../architecture/overview.md) |
| Add a new page | [Adding a New Page](../guides/adding-new-page.md) |
| Add a new API resource | [Adding a New Resource](../guides/adding-new-resource.md) |
| Use UI components | [UI Overview](../ui/overview.md) |
| Debug an issue | [Debugging Guide](../guides/debugging-guide.md) |

---

**Congratulations!** You're ready to contribute to the Datum Cloud Portal.
