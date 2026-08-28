"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getProvinces,
  getCounties,
  getDistricts,
  loadDivisions,
  findProvinceByName,
  findCountyByName,
  getById,
  IranDivision,
} from "@/lib/iranDivisions";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type SelectedLocation = {
  provinceId?: number;
  countyId?: number;
  districtId?: number;
};

interface Props {
  value?: SelectedLocation;
  onChange?: (value: SelectedLocation) => void;
  className?: string;
  showOptionalDistrict?: boolean;
}

export function IranLocationSelector({
  value = {},
  onChange,
  className = "",
  showOptionalDistrict = true,
}: Props) {
  const [provinceId, setProvinceId] = useState<number | undefined>(value.provinceId);
  const [countyId, setCountyId] = useState<number | undefined>(value.countyId);
  const [districtId, setDistrictId] = useState<number | undefined>(value.districtId);
  const [ready, setReady] = useState(false);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    loadDivisions().then(() => setReady(true));
  }, []);

  // 🆕 همگام‌سازی با props بیرونی (مثلاً بعد از لود کاربر)
  useEffect(() => {
    setProvinceId(value.provinceId);
    setCountyId(value.countyId);
    setDistrictId(value.districtId);
  }, [value.provinceId, value.countyId, value.districtId]);

  const provinces = useMemo(() => (ready ? getProvinces() : []), [ready]);
  const counties = useMemo(
    () => (ready && provinceId ? getCounties(provinceId) : []),
    [ready, provinceId]
  );
  const districts = useMemo(
    () => (ready && countyId ? getDistricts(countyId) : []),
    [ready, countyId]
  );

  useEffect(() => {
    if (onChange) {
      onChange({ provinceId, countyId, districtId });
    }
  }, [provinceId, countyId, districtId]);

  const selectClass =
    "h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary";

  const handleDetectLocation = () => {
    if (!ready) {
      toast.info("در حال بارگذاری اطلاعات تقسیمات کشوری...");
      return;
    }
    setDetecting(true);
    if (!navigator.geolocation) {
      toast.error("مرورگر شما از GPS پشتیبانی نمی‌کند");
      setDetecting(false);
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
          if (!provinceName && !cityName) {
            toast.error("نتیجه‌ای از سرویس موقعیت دریافت نشد");
            setDetecting(false);
            return;
          }
          const foundProvince = findProvinceByName(provinceName);
          if (!foundProvince) {
            toast.error("استان شما در پایگاه داده یافت نشد");
            setDetecting(false);
            return;
          }
          const foundCounty = cityName
            ? findCountyByName(foundProvince.Id, cityName)
            : undefined;
          setProvinceId(foundProvince.Id);
          setCountyId(foundCounty?.Id);
          setDistrictId(undefined);
          toast.success(
            `موقعیت شما شناسایی شد: ${foundProvince.Name}${foundCounty ? `، ${foundCounty.Name}` : ""}`
          );
        } catch (error) {
          console.error("خطا در سرویس نشان:", error);
          toast.error("خطا در تطبیق موقعیت با پایگاه داده");
        } finally {
          setDetecting(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        let msg = "دریافت موقعیت بر اساس IP شبکه انجام شد.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "دسترسی GPS مسدود است. موقعیت بر اساس IP شبکه ثبت شد.";
        }
        toast.info(msg);
        setDetecting(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <button
        type="button"
        onClick={handleDetectLocation}
        disabled={detecting || !ready}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-dashed border-orange-300 dark:border-orange-700/50 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 font-extrabold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {detecting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            در حال شناسایی موقعیت...
          </>
        ) : (
          <>
            <MapPin className="w-4 h-4" />
            شناسایی هوشمند شهر من
          </>
        )}
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          className={selectClass}
          value={provinceId ?? ""}
          onChange={(e) => {
            const id = e.target.value ? Number(e.target.value) : undefined;
            setProvinceId(id);
            setCountyId(undefined);
            setDistrictId(undefined);
          }}
        >
          <option value="">استان</option>
          {provinces.map((p) => (
            <option key={p.Id} value={p.Id}>{p.Name}</option>
          ))}
        </select>

        <select
          className={selectClass}
          value={countyId ?? ""}
          onChange={(e) => {
            const id = e.target.value ? Number(e.target.value) : undefined;
            setCountyId(id);
            setDistrictId(undefined);
          }}
          disabled={!provinceId}
        >
          <option value="">شهر</option>
          {counties.map((c) => (
            <option key={c.Id} value={c.Id}>{c.Name}</option>
          ))}
        </select>

        {showOptionalDistrict && (
          <select
            className={selectClass}
            value={districtId ?? ""}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : undefined;
              setDistrictId(id);
            }}
            disabled={!countyId}
          >
            <option value="">منطقه (اختیاری)</option>
            {districts.map((d) => (
              <option key={d.Id} value={d.Id}>{d.Name}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}