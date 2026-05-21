import { Suspense } from "react";
import CreatePageContent from "./CreatePageContent";

/**
 * Server-rendered shell for the /create route. The real client UI
 * lives in `CreatePageContent` and calls `useSearchParams()` to read
 * `?from=` / `?to=` seed params from "Send one back" replies.
 *
 * Next.js requires any client component that uses `useSearchParams`
 * to be wrapped in a `<Suspense>` boundary so the rest of the page
 * shell can still be prerendered; without it the production build
 * bails out with "missing-suspense-with-csr-bailout" and Vercel
 * refuses to deploy. The fallback is intentionally `null` because
 * `CreatePageContent` itself runs its own entrance animations and
 * loads near-instantly on the client.
 */
export default function CreatePage() {
  return (
    <Suspense fallback={null}>
      <CreatePageContent />
    </Suspense>
  );
}
