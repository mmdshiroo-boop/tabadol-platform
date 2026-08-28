"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  MapPin,
  ChevronLeft,
  Building2,
  Home,
  Navigation,
  BarChart3,
} from "lucide-react";
import {
  loadDivisions,
  getProvinces,
  getCounties,
  getDistricts,
  getById,
  IranDivision,
} from "@/lib/iranDivisions";
import { cn } from "@/lib/utils";

interface Props {
  selectedProvinceId: string;
  selectedCityId: string;
  onSelectProvince: (provinceId: string, provinceName: string) => void;
  onSelectCity: (cityId: string, cityName: string) => void;
  onSelectDistrict?: (districtName: string) => void;
  onAnalyze?: (level: "province" | "city" | "district", name: string) => void;
}

export function LocationHierarchyBrowser({
  selectedProvinceId,
  selectedCityId,
  onSelectProvince,
  onSelectCity,
  onSelectDistrict,
  onAnalyze,
}: Props) {
  const [ready, setReady] = useState(false);
  const [provinces, setProvinces] = useState<IranDivision[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadDivisions().then(() => {
      setProvinces(getProvinces());
      setReady(true);
    });
  }, []);

  const filteredProvinces = useMemo(() => {
    const q = search.trim();
    if (!q) return provinces;
    return provinces.filter((p) => p.Name.includes(q));
  }, [provinces, search]);

  const selectedProvince = useMemo(
    () => (selectedProvinceId ? getById(Number(selectedProvinceId)) : undefined),
    [selectedProvinceId]
  );

  const counties = useMemo(
    () => (selectedProvince?.Id ? getCounties(selectedProvince.Id) : []),
    [selectedProvince]
  );

  const selectedCity = useMemo(
    () => (selectedCityId ? getById(Number(selectedCityId)) : undefined),
    [selectedCityId]
  );

  const districts = useMemo(
    () => (selectedCity?.Id ? getDistricts(selectedCity.Id) : []),
    [selectedCity]
  );

  const filteredCounties = useMemo(() => {
    const q = search.trim();
    if (!q) return counties;
    return counties.filter((c) => c.Name.includes(q));
  }, [counties, search]);

  const filteredDistricts = useMemo(() => {
    const q = search.trim();
    if (!q) return districts;
    return districts.filter((d) => d.Name.includes(q));
  }, [districts, search]);

  if (!ready) {
    return (
      <Card className="rounded-2xl border-border/60 shadow-sm bg-card/80 backdrop-blur-sm h-full flex flex-col">
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm bg-card/80 backdrop-blur-sm h-full flex flex-col">
      <CardHeader className="p-4 pb-2 border-b border-border/40">
        <CardTitle className="text-sm font-black flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          مرورگر موقعیت
        </CardTitle>
        <div className="relative mt-2">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="جستجوی استان، شهر یا منطقه..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs pr-8 pl-2 rounded-xl bg-muted/40 border-border/60"
          />
        </div>
      </CardHeader>
      <CardContent className="p-2 overflow-y-auto flex-1">
        {!selectedProvince ? (
          <div className="space-y-1">
            {filteredProvinces.map((province) => (
              <motion.div
                key={province.Id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectProvince(String(province.Id), province.Name);
                  }
                }}
                onClick={() => onSelectProvince(String(province.Id), province.Name)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all border cursor-pointer",
                  "hover:bg-primary/5 hover:border-primary/30",
                  selectedProvinceId === String(province.Id)
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "border-transparent text-foreground"
                )}
              >
                <Building2 className="w-4 h-4 text-primary/70" />
                <span className="flex-1 text-right">{province.Name}</span>
                {onAnalyze && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-lg hover:bg-primary/10 hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAnalyze("province", province.Name);
                    }}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                )}
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => onSelectProvince("", "")}
              className="flex items-center gap-2 text-xs font-bold text-primary hover:underline mb-2"
            >
              <Navigation className="w-3 h-3 rotate-180" />
              بازگشت به استان‌ها
            </button>

            <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="font-black text-primary">{selectedProvince.Name}</span>
              <Badge variant="outline" className="text-[10px]">استان</Badge>
              {onAnalyze && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mr-auto h-7 px-2 text-[10px] font-bold rounded-lg bg-primary/10 hover:bg-primary/20 text-primary"
                  onClick={() => onAnalyze("province", selectedProvince.Name)}
                >
                  <BarChart3 className="w-3.5 h-3.5 ml-1" />
                  تحلیل استان
                </Button>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground font-bold mt-2">شهرهای استان:</p>
            <div className="space-y-1">
              {filteredCounties.map((city) => (
                <motion.div
                  key={city.Id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectCity(String(city.Id), city.Name);
                    }
                  }}
                  onClick={() => onSelectCity(String(city.Id), city.Name)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all border cursor-pointer",
                    "hover:bg-primary/5 hover:border-primary/30",
                    selectedCityId === String(city.Id)
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "border-transparent text-foreground"
                  )}
                >
                  <Home className="w-4 h-4 text-primary/70" />
                  <span className="flex-1 text-right">{city.Name}</span>
                  {onAnalyze && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 rounded-lg hover:bg-primary/10 hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAnalyze("city", city.Name);
                      }}
                    >
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                  )}
                  {selectedCityId === String(city.Id) && (
                    <Badge variant="outline" className="text-[10px] bg-primary/20">
                      انتخاب‌شده
                    </Badge>
                  )}
                </motion.div>
              ))}
            </div>

            {selectedCity && (
              <div className="mt-3">
                <p className="text-[10px] text-muted-foreground font-bold">
                  مناطق {selectedCity.Name}:
                </p>
                {filteredDistricts.length > 0 ? (
                  <div className="space-y-1 mt-2">
                    {filteredDistricts.map((d) => (
                      <div key={d.Id} className="flex items-center gap-2 group">
                        <button
                          onClick={() => onSelectDistrict?.(d.Name)}
                          className="flex-1 text-right px-3 py-2 rounded-lg text-xs font-medium hover:bg-muted/50 transition-colors"
                        >
                          {d.Name}
                        </button>
                        {onAnalyze && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 rounded-lg hover:bg-primary/10 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAnalyze("district", d.Name);
                            }}
                          >
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">
                    منطقه‌ای برای این شهر ثبت نشده است.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}