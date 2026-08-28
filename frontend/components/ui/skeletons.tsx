import { Skeleton } from "@/components/ui/skeleton";

export const FullPageSpinner = () => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center gap-10">
        {/* لوگوی بزرگ در بالا — نسخه لایت (بزرگ‌تر + سایه) */}
        <img
          src="/images/tabadol-logo-light.PNG"
          alt="پلتفرم آگهی تبادل"
          className="h-40 md:h-52 w-auto object-contain drop-shadow-xl dark:hidden"
        />
        {/* لوگوی بزرگ در بالا — نسخه دارک (بزرگ‌تر + سایه) */}
        <img
          src="/images/tabadol-logo-dark.PNG"
          alt="پلتفرم آگهی تبادل"
          className="h-40 md:h-52 w-auto object-contain drop-shadow-xl hidden dark:block"
        />

        <div className="flex flex-col items-center gap-6">
          {/* اسپینر + سه‌نقطه */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-primary/20 rounded-full" />
              <div className="absolute top-0 left-0 w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            {/* سه نقطه با انیمیشن bounce */}
        
          </div>

          {/* عنوان */}
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-black text-primary">
              پلتفرم آگهی تبادل
            </h1>
            <p className="text-sm text-primary mt-2 animate-pulse">
              در حال بارگذاری...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// بقیه اسکلتون‌ها بدون تغییر...
export const HomePageSkeleton = () => {
  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 py-4 md:py-6">
      <div className="flex gap-6 mb-8 overflow-hidden justify-center">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-3">
            <div className="w-[72px] h-[72px] rounded-full bg-muted animate-pulse" />
            <div className="h-3 w-16 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
      <div className="h-44 w-full bg-muted animate-pulse rounded-2xl mb-8" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[4/3] w-full bg-muted animate-pulse rounded-2xl" />
            <div className="h-4 w-5/6 bg-muted animate-pulse rounded" />
            <div className="h-5 w-2/3 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const SearchPageSkeleton = () => {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="hidden lg:block w-72 shrink-0">
        <div className="h-[500px] w-full bg-muted animate-pulse rounded-2xl" />
      </div>
      <div className="flex-1 space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-8 w-40 bg-muted animate-pulse rounded-lg" />
          <div className="h-10 w-28 bg-muted animate-pulse rounded-xl" />
        </div>
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-9 w-20 bg-muted animate-pulse rounded-full"
            />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-square w-full bg-muted animate-pulse rounded-xl" />
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-5 w-1/2 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const PanelSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      <div className="md:col-span-4 lg:col-span-3">
        <div className="h-[300px] w-full bg-muted animate-pulse rounded-2xl" />
      </div>
      <div className="md:col-span-8 lg:col-span-9 space-y-4">
        <div className="h-32 w-full bg-muted animate-pulse rounded-2xl" />
        <div className="h-64 w-full bg-muted animate-pulse rounded-2xl" />
      </div>
    </div>
  );
};

export const AdDetailSkeleton = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div className="aspect-square w-full bg-muted animate-pulse rounded-2xl" />
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 w-20 bg-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-8 w-3/4 bg-muted animate-pulse rounded-lg" />
        <div className="h-6 w-1/2 bg-muted animate-pulse rounded-lg" />
        <div className="h-32 w-full bg-muted animate-pulse rounded-xl" />
        <div className="flex gap-3">
          <div className="h-11 flex-1 bg-muted animate-pulse rounded-xl" />
          <div className="h-11 flex-1 bg-muted animate-pulse rounded-xl" />
        </div>
        <div className="h-24 w-full bg-muted animate-pulse rounded-xl" />
      </div>
    </div>
  );
};

export const AdCardSkeleton = () => {
  return (
    <div className="space-y-3">
      <div className="aspect-[4/3] w-full bg-muted animate-pulse rounded-2xl" />
      <div className="h-4 w-5/6 bg-muted animate-pulse rounded" />
      <div className="h-5 w-2/3 bg-muted animate-pulse rounded" />
    </div>
  );
};