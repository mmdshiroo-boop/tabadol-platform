"use client";
import L from "leaflet";
import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Navigation } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface LocationPickerMapProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number) => void;
}

export default function LocationPickerMap({
  initialLat = 35.6892,
  initialLng = 51.389,
  onLocationSelect,
}: LocationPickerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const customIconRef = useRef<any>(null);

  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(
    initialLat !== 35.6892 || initialLng !== 51.389
      ? [initialLat, initialLng]
      : null,
  );

  // ذخیره callback در ref تا داخل useEffect مشکل closure نداشته باشیم
  const onLocationSelectRef = useRef(onLocationSelect);
  onLocationSelectRef.current = onLocationSelect;

  // ── ساخت نقشه فقط یک بار ──
  useEffect(() => {
    if (initializedRef.current) return;
    if (!mapRef.current) return;

    initializedRef.current = true;

    const initMap = async () => {
      try {
        const L = (await import("leaflet")).default;

        if (mapRef.current && (mapRef.current as any)._leaflet_id) return;

        // آیکون سفارشی نارنجی
        const customIcon = L.divIcon({
          html: `
            <div style="position:relative;width:36px;height:46px;">
              <div style="
                width:32px;height:32px;
                background:linear-gradient(135deg,#f97316,#ea580c);
                border:3px solid white;
                border-radius:50% 50% 50% 0;
                transform:rotate(-45deg);
                box-shadow:0 4px 14px rgba(249,115,22,0.5);
                position:absolute;top:0;left:2px;
              ">
                <div style="
                  width:10px;height:10px;
                  background:white;border-radius:50%;
                  position:absolute;top:50%;left:50%;
                  transform:translate(-50%,-50%);
                "></div>
              </div>
              <div style="
                width:8px;height:8px;
                background:rgba(249,115,22,0.3);
                border-radius:50%;
                position:absolute;bottom:0;left:14px;
                animation:ping 1.5s ease-in-out infinite;
              "></div>
            </div>
          `,
          className: "",
          iconSize: [36, 46],
          iconAnchor: [18, 46],
          popupAnchor: [0, -46],
        });

        customIconRef.current = customIcon;

        const map = L.map(mapRef.current!, {
          center: [initialLat, initialLng],
          zoom: 13,
          zoomControl: true,
          attributionControl: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
          maxZoom: 19,
        }).addTo(map);

        // اگر مختصات اولیه معتبر داده شد
        if (initialLat !== 35.6892 || initialLng !== 51.389) {
          markerRef.current = L.marker([initialLat, initialLng], {
            icon: customIcon,
          }).addTo(map);
        }

        map.on("click", (e: any) => {
          const { lat, lng } = e.latlng;

          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            markerRef.current = L.marker([lat, lng], {
              icon: customIcon,
            }).addTo(map);
          }

          setSelectedCoords([lat, lng]);
          onLocationSelectRef.current(lat, lng);
        });

        mapInstanceRef.current = map;
      } catch (error) {
        console.error("Map init error:", error);
        initializedRef.current = false;
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
        markerRef.current = null;
        initializedRef.current = false;
      }
    };
  }, []);

  // ── همگام‌سازی مختصات اولیه با مارکر هنگام تغییر props ──
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // اگر مختصات جدید با پیش‌فرض متفاوت است و مارکر وجود ندارد، بساز
    if (initialLat !== 35.6892 || initialLng !== 51.389) {
      if (markerRef.current) {
        markerRef.current.setLatLng([initialLat, initialLng]);
      } else if (customIconRef.current) {
        markerRef.current = L.marker([initialLat, initialLng], {
          icon: customIconRef.current,
        }).addTo(map);
      }
      setSelectedCoords([initialLat, initialLng]);
    }
  }, [initialLat, initialLng]);

  // ── flyTo نرم وقتی مختصات تغییر می‌کنه ──
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // فقط اگر مختصات واقعاً تغییر کرده باشد
    const currentCenter = map.getCenter();
    const isSame =
      Math.abs(currentCenter.lat - initialLat) < 0.001 &&
      Math.abs(currentCenter.lng - initialLng) < 0.001;

    if (isSame) return;

    // پرواز نرم به مختصات جدید
    map.flyTo([initialLat, initialLng], 13, {
      duration: 1.8,        // مدت انیمیشن (ثانیه)
      easeLinearity: 0.25,  // نرمی حرکت
    });
  }, [initialLat, initialLng]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Navigation className="w-4 h-4 text-primary shrink-0" />
        <span>روی نقشه کلیک کنید تا موقعیت دقیق مشخص شود</span>
      </div>

      <div
        ref={mapRef}
        className="w-full h-72 sm:h-80 rounded-2xl border border-border/60 overflow-hidden shadow-sm"
      />

      {selectedCoords ? (
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl w-fit">
          <MapPin className="w-3.5 h-3.5" />
          {selectedCoords[0].toFixed(5)}° ، {selectedCoords[1].toFixed(5)}°
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground/60 px-1">
          <MapPin className="w-3.5 h-3.5" />
          هنوز موقعیتی انتخاب نشده
        </div>
      )}
    </div>
  );
}