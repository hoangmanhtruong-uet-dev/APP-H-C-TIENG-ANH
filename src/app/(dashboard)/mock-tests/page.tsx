import type { Metadata } from "next";

import { MockTestCatalog } from "@/components/mock-tests/mock-test-catalog";
import { getMockTestCatalog } from "@/server/mock-tests/content";

export const metadata: Metadata = { title: "Mock tests" };

export default async function MockTestsPage() {
  return <MockTestCatalog tests={await getMockTestCatalog()} />;
}
