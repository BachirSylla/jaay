import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder of the shop space while the shop and session load. */
export function ShellSkeleton() {
  return (
    <>
      <div className="fixed inset-y-0 left-0 hidden w-[76px] bg-espresso md:block lg:w-[248px]" />
      <div className="min-h-dvh md:pl-[76px] lg:pl-[248px]">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-5 pt-6 md:px-8 lg:px-10 lg:pt-8">
          <Skeleton className="h-9 w-56" />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-32 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 h-16 border-t border-line bg-surface md:hidden" />
    </>
  );
}
