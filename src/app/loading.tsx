import { LoadingState } from "@/components/shared/loading-state";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <LoadingState />
    </main>
  );
}
