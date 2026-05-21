import type { Metadata } from "next";
import { AdminSceneContent } from "./AdminSceneContent";

export const metadata: Metadata = {
  title: "Scene Style — Admin",
  // Keep this page out of every search index in case the URL leaks.
  // It's intentionally not linked from the public navigation, but the
  // localStorage settings + outbound style URL params it manages are
  // sender-specific and shouldn't be discoverable.
  robots: { index: false, follow: false },
};

/**
 * Server shell for /admin/scene. The actual editor is a client
 * component that needs localStorage + the live 3D preview. No
 * useSearchParams here, so no Suspense boundary is needed.
 */
export default function AdminScenePage() {
  return <AdminSceneContent />;
}
