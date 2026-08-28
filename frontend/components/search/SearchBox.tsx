"use client";

import {
  Suspense,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Search,
  MapPin,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import axios from "axios";
import {
  loadDivisions,
  getProvinces,
  getCounties,
  getById,
  normalizeName,
  IranDivision,
} from "@/lib/iranDivisions";

interface SearchBoxProps {
  placeholder?: string;
  className?: string;
  onSearch?: (filters: {
    q?: string;
    city?: string;
    province?: string;
    propertyType?: string;
    adType?: string;
  }) => void;
}

const SMART_KEYWORDS = {
  propertyTypes: [
    { key: "ویلا", value: "villa" },
    { key: "ویلایی", value: "villa" },
    { key: "آپارتمان", value: "apartment" },
    { key: "خانه", value: "house" },
    { key: "سوئیت", value: "suite" },
    { key: "استودیو", value: "suite" },
    { key: "مغازه", value: "commercial" },
    { key: "تجاری", value: "commercial" },
    { key: "دفتر", value: "office" },
    { key: "اداری", value: "office" },
    { key: "باغ", value: "garden" },
    { key: "زمین", value: "land" },
    { key: "پنت", value: "penthouse" },
    { key: "دوبلکس", value: "duplex" },
  ],
  adTypes: [
    { key: "اجاره", value: "rent" },
    { key: "فروش", value: "sale" },
    { key: "رهن", value: "mortgage" },
    { key: "روزانه", value: "daily_rent" },
    { key: "معاوضه", value: "exchange" },
    { key: "پیش فروش", value: "presale" },
    { key: "پیش‌فروش", value: "presale" },
  ],
};

const getOrCreateGuestId = (): string => {
  if (typeof window === "undefined") return "";
  let guestId = localStorage.getItem("app_guest_id");
  if (!guestId) {
    guestId =
      "guest_" +
      Math.random().toString(36).substring(2, 9) +
      "_" +
      Date.now();
    localStorage.setItem("app_guest_id", guestId);
  }
  return guestId;
};

function SearchBoxInner({
  placeholder = "جستجو در آگهی‌ها، املاک، خودرو و ...",
  className = "",
  onSearch,
}: SearchBoxProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [ready, setReady] = useState(false);
  const [provinces, setProvinces] = useState<IranDivision[]>([]);
  const [cities, setCities] = useState<IranDivision[]>([]);

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"province" | "city">("province");
  const [searchLocationQuery, setSearchLocationQuery] = useState("");

  const [tempProvince, setTempProvince] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [tempCity, setTempCity] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const [selectedProvinceName, setSelectedProvinceName] = useState("");
  const [selectedCityName, setSelectedCityName] = useState(
    searchParams.get("city") || "",
  );

  const [isDetecting, setIsDetecting] = useState(false);

  // بارگذاری داده‌های تقسیمات کشوری
  useEffect(() => {
    loadDivisions().then(() => {
      setProvinces(getProvinces());
      setReady(true);
    });
  }, []);

  // همگام‌سازی با URL
  useEffect(() => {
    const q = searchParams.get("q") || "";
    const city = searchParams.get("city") || "";
    const provinceParam = searchParams.get("province") || "";

    setQuery(q);
    setSelectedCityName(city);

    if (!provinceParam) {
      setSelectedProvinceName("");
      setTempProvince(null);
      return;
    }

    // پیدا کردن استان بر اساس نام
    const foundProv = provinces.find(
      (p) => normalizeName(p.Name) === normalizeName(provinceParam),
    );
    if (foundProv) {
      setSelectedProvinceName(foundProv.Name);
      setTempProvince({ id: foundProv.Id, name: foundProv.Name });
    } else {
      setSelectedProvinceName(provinceParam);
    }
  }, [searchParams, provinces]);

  const executeSearch = useCallback(
    (searchQ?: string, searchCity?: string, searchProvince?: string) => {
      const params = new URLSearchParams();
      const finalQ = searchQ?.trim() || "";

      let smartPropertyType = "";
      let smartAdType = "";

      if (finalQ) {
        SMART_KEYWORDS.propertyTypes.forEach((pt) => {
          if (finalQ.includes(pt.key)) smartPropertyType = pt.value;
        });

        SMART_KEYWORDS.adTypes.forEach((at) => {
          if (finalQ.includes(at.key)) smartAdType = at.value;
        });
      }

      if (finalQ) params.set("q", finalQ);
      if (searchCity) params.set("city", searchCity);
      if (searchProvince) params.set("province", searchProvince);

      if (smartPropertyType) params.set("propertyType", smartPropertyType);
      if (smartAdType) params.set("adType", smartAdType);

      params.set("page", "1");

      if (onSearch) {
        onSearch({
          q: finalQ || undefined,
          city: searchCity || undefined,
          province: searchProvince || undefined,
          propertyType: smartPropertyType || undefined,
          adType: smartAdType || undefined,
        });
      } else {
        router.push(`/search?${params.toString()}`, { scroll: false });
      }
    },
    [onSearch, router],
  );

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeSearch(
      query.trim() || undefined,
      selectedCityName || undefined,
      selectedProvinceName || undefined,
    );
  };

  const handleProvinceSelect = (provId: number, provName: string) => {
    setTempProvince({ id: provId, name: provName });
    setTempCity(null);
    setSearchLocationQuery("");
    setCities(getCounties(provId));
    setStep("city");
  };

  const handleConfirmLocationWithValues = (
    provName: string,
    cityName: string,
  ) => {
    setSelectedProvinceName(provName);
    setSelectedCityName(cityName);
    setIsOpen(false);
    setSearchLocationQuery("");
    executeSearch(
      query.trim() || undefined,
      cityName || undefined,
      provName || undefined,
    );
  };

  const handleConfirmLocation = () => {
    handleConfirmLocationWithValues(
      tempProvince?.name || "",
      tempCity?.name || "",
    );
  };

  const handleClearAll = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();

    setQuery("");
    setTempProvince(null);
    setTempCity(null);
    setSelectedProvinceName("");
    setSelectedCityName("");
    setSearchLocationQuery("");
    setStep("province");

    executeSearch(undefined, undefined, undefined);
  };

  const saveLocationToBackend = async (payload: {
    lat?: number;
    lng?: number;
    province?: string;
    city?: string;
  }) => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const guestId = getOrCreateGuestId();
      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

      await axios.post(
        `${API_BASE_URL}/api/location/save-from-search`,
        {
          ...payload,
          guestId: !token ? guestId : undefined,
        },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "x-guest-id": guestId,
          },
        },
      );
    } catch (err) {
      console.error("خطا در ثبت موقعیت مکانی:", err);
    }
  };

  const handleFallbackIP = async (message: string) => {
    try {
      await saveLocationToBackend({});
      toast.info(message);
      setIsOpen(false);
    } catch {
      toast.error("خطا در ثبت موقعیت شبکه.");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleDetectLocation = () => {
    setIsDetecting(true);

    if (!navigator.geolocation) {
      handleFallbackIP(
        "مرورگر شما از GPS پشتیبانی نمی‌کند. موقعیت بر اساس IP بررسی شد.",
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await fetch(
            `https://api.neshan.org/v5/reverse?lat=${latitude}&lng=${longitude}`,
            {
              headers: {
                "Api-Key": "service.f3da8afc6b384ab5bda01e3375e1f3f5",
              },
            },
          );

          const data = await response.json();
          const cityName = data.city || data.municipality_zone || "";
          const provinceName = data.state || "";

          // پیدا کردن استان با نام نرمال‌شده
          const foundProvince = provinces.find(
            (p) =>
              normalizeName(p.Name) === normalizeName(provinceName) ||
              normalizeName(p.Name).includes(normalizeName(provinceName)) ||
              normalizeName(provinceName).includes(normalizeName(p.Name)),
          );

          if (foundProvince) {
            setTempProvince({
              id: foundProvince.Id,
              name: foundProvince.Name,
            });
            setSelectedProvinceName(foundProvince.Name);
            setCities(getCounties(foundProvince.Id));
            setStep("city");
          }

          if (cityName && foundProvince) {
            const counties = getCounties(foundProvince.Id);
            const foundCity = counties.find(
              (c) =>
                normalizeName(c.Name) === normalizeName(cityName) ||
                normalizeName(c.Name).includes(normalizeName(cityName)) ||
                normalizeName(cityName).includes(normalizeName(c.Name)),
            );
            if (foundCity) {
              setTempCity({ id: foundCity.Id, name: foundCity.Name });
              setSelectedCityName(foundCity.Name);
            } else {
              setTempCity(null);
              setSelectedCityName(cityName);
            }
          }

          setIsOpen(false);
          const finalCity = cityName && cityName !== "نامشخص" ? cityName : undefined;
          executeSearch(
            query.trim() || undefined,
            finalCity,
            foundProvince?.Name || provinceName,
          );

          await saveLocationToBackend({
            lat: latitude,
            lng: longitude,
            province: foundProvince?.Name || provinceName,
            city: finalCity,
          });

          toast.success(
            `موقعیت شما شناسایی شد: ${foundProvince?.Name || provinceName}${cityName ? `، ${cityName}` : ''}`,
          );
        } catch (error) {
          console.error("خطا در سرویس نشان:", error);
          toast.error("خطا در تطبیق موقعیت با پایگاه داده");
        } finally {
          setIsDetecting(false);
        }
      },
      (error) => {
        let msg = "دریافت موقعیت بر اساس IP شبکه انجام شد.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "دسترسی GPS مسدود است. موقعیت بر اساس IP شبکه ثبت شد.";
        }
        handleFallbackIP(msg);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const filteredProvinces = useMemo(() => {
    const safeSearch = searchLocationQuery.trim();
    if (!safeSearch) return provinces;
    return provinces.filter((p) => p.Name.includes(safeSearch));
  }, [provinces, searchLocationQuery]);

  const filteredCities = useMemo(() => {
    const safeSearch = searchLocationQuery.trim();
    if (!safeSearch) return cities;
    return cities.filter((c) => c.Name.includes(safeSearch));
  }, [cities, searchLocationQuery]);

  const hasActiveFilters = Boolean(
    query.trim() || selectedProvinceName || selectedCityName,
  );

  const locationLabel = selectedCityName
    ? selectedProvinceName
      ? `${selectedProvinceName}، ${selectedCityName}`
      : selectedCityName
    : selectedProvinceName || "همهٔ ایران";

  if (!ready) {
    return (
      <div className={cn("w-full", className)}>
        <div className="flex items-center gap-2 h-12 md:h-14 rounded-[22px] border border-orange-200/40 dark:border-orange-800/20 bg-background/80 px-3 animate-pulse">
          <div className="w-9 h-9 rounded-xl bg-muted shrink-0" />
          <div className="flex-1 h-4 rounded-lg bg-muted" />
          <div className="w-px h-6 bg-border" />
          <div className="w-24 md:w-32 h-9 rounded-xl bg-muted shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSearchSubmit} className={cn("w-full", className)} dir="rtl">
      <div
        className={cn(
          "group relative flex items-center gap-2 rounded-[22px] border bg-background/90 dark:bg-background/80 backdrop-blur-xl",
          "border-orange-200/60 dark:border-orange-800/30",
          "shadow-[0_8px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.22)]",
          "h-12 md:h-14 px-2.5 md:px-3",
          "transition-all duration-200",
          "focus-within:border-orange-400/70 dark:focus-within:border-orange-500/40",
          "focus-within:ring-4 focus-within:ring-orange-500/10",
        )}
      >
        {/* دکمه جستجو */}
        <button
          type="submit"
          className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-xl text-orange-500 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-all shrink-0"
          aria-label="جستجو"
        >
          <Search className="h-5 w-5" />
        </button>

        {/* اینپوت */}
        <div className="flex-1 min-w-0 h-full flex items-center">
          <Input
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={cn(
              "w-full h-full border-0 bg-transparent px-0",
              "text-[13px] md:text-[14px] font-bold text-foreground",
              "placeholder:text-muted-foreground/60",
              "focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none",
            )}
          />
        </div>

        {/* جداکننده */}
        <div className="h-6 md:h-7 w-px bg-border/70 shrink-0" />

        {/* انتخاب مکان */}
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            setSearchLocationQuery("");
            if (open) {
              setStep(tempProvince ? "city" : "province");
            }
          }}
        >
          <DialogTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex items-center gap-2 rounded-xl transition-all shrink-0",
                "h-9 md:h-10 px-3 md:px-4",
                "max-w-[120px] sm:max-w-[170px] md:max-w-[230px]",
                "bg-orange-50/80 dark:bg-orange-950/25",
                "border border-orange-100 dark:border-orange-800/25",
                "hover:bg-orange-100/80 dark:hover:bg-orange-900/30",
              )}
            >
              <MapPin className="w-4 h-4 text-orange-500 dark:text-orange-400 shrink-0" />
              <span className="truncate text-[12px] md:text-[13px] font-extrabold text-foreground/85">
                {locationLabel}
              </span>
              <ChevronLeft
                className={cn(
                  "w-4 h-4 shrink-0 text-orange-400 dark:text-orange-500 transition-transform duration-200",
                  isOpen ? "-rotate-90" : "rotate-90",
                )}
              />
            </button>
          </DialogTrigger>

          <DialogContent className="max-w-[520px] w-[95vw] rounded-3xl p-0 overflow-hidden border border-orange-200/40 dark:border-orange-800/30 bg-background/95 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
            <DialogHeader className="p-5 border-b border-border/60 flex flex-row items-center justify-between gap-2 space-y-0">
              <div className="flex items-center gap-2">
                {step === "city" && (
                  <button
                    type="button"
                    onClick={() => {
                      setStep("province");
                      setSearchLocationQuery("");
                    }}
                    className="p-2 rounded-xl text-muted-foreground hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
                <DialogTitle className="text-base md:text-lg font-black text-foreground">
                  {step === "province"
                    ? "انتخاب استان"
                    : `انتخاب شهر ${tempProvince?.name ? `(${tempProvince.name})` : ""}`}
                </DialogTitle>
              </div>
            </DialogHeader>

            {/* تشخیص موقعیت */}
            <div className="p-4 border-b border-border/50 bg-muted/20">
              <Button
                type="button"
                variant="outline"
                onClick={handleDetectLocation}
                disabled={isDetecting}
                className="w-full h-11 rounded-2xl border-dashed border-orange-300 dark:border-orange-700/50 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 font-extrabold text-xs gap-2"
              >
                {isDetecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    در حال بازیابی موقعیت شما...
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4" />
                    شناسایی هوشمند شهر من
                  </>
                )}
              </Button>
            </div>

            {/* جستجوی مکان */}
            <div className="p-4 border-b border-border/50 bg-muted/10">
              <div className="relative flex items-center h-11 rounded-2xl border border-orange-200/50 dark:border-orange-800/30 bg-background px-3 focus-within:border-orange-400/60 focus-within:ring-2 focus-within:ring-orange-500/10 transition-all">
                <Search className="w-4 h-4 text-orange-500 dark:text-orange-400 shrink-0 ml-2" />
                <input
                  type="text"
                  value={searchLocationQuery}
                  onChange={(e) => setSearchLocationQuery(e.target.value)}
                  placeholder={step === "province" ? "جستجوی استان..." : "جستجوی شهر..."}
                  className="w-full bg-transparent outline-none text-sm font-medium placeholder:text-muted-foreground/60"
                />
                {searchLocationQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchLocationQuery("")}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* لیست */}
            <div className="max-h-[300px] overflow-y-auto p-3 space-y-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-orange-400/60">
              {step === "province" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setTempProvince(null);
                      setTempCity(null);
                      handleConfirmLocationWithValues("", "");
                    }}
                    className="flex items-center justify-between w-full px-4 py-3.5 rounded-2xl text-sm font-extrabold bg-orange-50 dark:bg-orange-950/25 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all"
                  >
                    <span>همهٔ ایران</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {filteredProvinces.map((prov) => (
                    <button
                      key={prov.Id}
                      type="button"
                      onClick={() => handleProvinceSelect(prov.Id, prov.Name)}
                      className="flex items-center justify-between w-full px-4 py-3.5 rounded-2xl text-sm font-bold text-right text-foreground hover:bg-muted/50 transition-all"
                    >
                      <span>{prov.Name}</span>
                      <ChevronLeft className="w-4 h-4 text-muted-foreground/60" />
                    </button>
                  ))}
                </>
              )}

              {step === "city" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setTempCity(null);
                      handleConfirmLocationWithValues(
                        tempProvince?.name || "",
                        "",
                      );
                    }}
                    className={cn(
                      "flex items-center justify-between w-full px-4 py-3.5 rounded-2xl text-sm font-bold text-right transition-all",
                      tempCity === null
                        ? "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/25"
                        : "text-foreground hover:bg-muted/50",
                    )}
                  >
                    <span>همه شهرهای {tempProvince?.name}</span>
                    {tempCity === null && <Check className="w-4 h-4" />}
                  </button>

                  {filteredCities.map((city) => (
                    <button
                      key={city.Id}
                      type="button"
                      onClick={() => {
                        setTempCity({ id: city.Id, name: city.Name });
                        handleConfirmLocationWithValues(
                          tempProvince?.name || "",
                          city.Name,
                        );
                      }}
                      className={cn(
                        "flex items-center justify-between w-full px-4 py-3.5 rounded-2xl text-sm font-bold text-right transition-all",
                        tempCity?.id === city.Id
                          ? "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/25"
                          : "text-foreground hover:bg-muted/50",
                      )}
                    >
                      <span>{city.Name}</span>
                      {tempCity?.id === city.Id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* فوتر */}
            <div className="p-4 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="h-11 rounded-2xl px-5 text-xs font-extrabold"
              >
                انصراف
              </Button>

              <Button
                type="button"
                onClick={handleConfirmLocation}
                disabled={step === "province" && !tempProvince}
                className="h-11 rounded-2xl px-6 text-xs font-extrabold bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20"
              >
                تایید مکان
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* دکمه پاک‌سازی واحد */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearAll}
            className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
            aria-label="پاک کردن جستجو و فیلترها"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  );
}

export function SearchBox({
  placeholder,
  className,
  onSearch,
}: SearchBoxProps) {
  return (
    <Suspense
      fallback={
        <div className={cn("w-full", className)}>
          <div className="flex items-center gap-2 h-12 md:h-14 rounded-[22px] border border-orange-200/40 dark:border-orange-800/20 bg-background/80 px-3 animate-pulse">
            <div className="w-9 h-9 rounded-xl bg-muted shrink-0" />
            <div className="flex-1 h-4 rounded-lg bg-muted" />
            <div className="w-px h-6 bg-border" />
            <div className="w-24 md:w-32 h-9 rounded-xl bg-muted shrink-0" />
          </div>
        </div>
      }
    >
      <SearchBoxInner
        placeholder={placeholder}
        className={className}
        onSearch={onSearch}
      />
    </Suspense>
  );
}