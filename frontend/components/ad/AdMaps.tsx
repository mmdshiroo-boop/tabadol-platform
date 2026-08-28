"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Maximize2, X, Satellite, Map } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

function MapView({ lat, lng }: { lat?: number; lng?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const [mode, setMode] = useState<"satellite" | "street">("satellite");

  const satelliteUrl =
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
  const streetUrl = "https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png";

  const updateTileLayer = (map: any, selectedMode: "satellite" | "street") => {
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    const url = selectedMode === "satellite" ? satelliteUrl : streetUrl;
    const options: any = { maxZoom: 19 };
    if (selectedMode === "street") {
      options.attribution =
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
    } else {
      options.attribution =
        "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";
    }

    const L = window.L;
    const layer = L.tileLayer(url, options).addTo(map);
    tileLayerRef.current = layer;
  };

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    let cancelled = false;

    const bootstrap = async () => {
      try {
        await import("leaflet/dist/leaflet.css");
        const L = (await import("leaflet")).default;
        (window as any).L = L;

        if (cancelled || !containerRef.current) return;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const center: [number, number] =
          lat && lng ? [lat, lng] : [35.6892, 51.389];
        const zoom = lat && lng ? 17 : 12;

        const map = L.map(containerRef.current, {
          center,
          zoom,
          zoomControl: true,
          attributionControl: false,
        });

        updateTileLayer(map, mode);

        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        });

        const markerIcon = L.divIcon({
          className: "",
          html: `
            <div style="position:relative;width:36px;height:46px;">
              <div style="
                width:36px;height:36px;
                border-radius:50% 50% 50% 0;
                background:linear-gradient(135deg,#F97316,#EA580C);
                transform:rotate(-45deg);
                display:flex;align-items:center;justify-content:center;
                box-shadow:0 4px 14px rgba(249,115,22,0.6);
                border:2.5px solid #fff;
              ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     style="transform:rotate(45deg);">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                        fill="white" fill-opacity="0.95"/>
                  <circle cx="12" cy="10" r="3" fill="#F97316"/>
                </svg>
              </div>
              <div style="
                position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);
                width:20px;height:6px;background:rgba(0,0,0,0.25);
                border-radius:50%;filter:blur(2px);
              "></div>
            </div>`,
          iconSize: [36, 46],
          iconAnchor: [18, 46],
          popupAnchor: [0, -46],
        });

        if (lat && lng) {
          L.marker(center, { icon: markerIcon })
            .addTo(map)
            .bindPopup("موقعیت آگهی");
        }

        mapInstanceRef.current = map;

        requestAnimationFrame(() =>
          setTimeout(() => {
            if (!cancelled && mapInstanceRef.current)
              mapInstanceRef.current.invalidateSize();
          }, 200),
        );
      } catch (error) {
        console.error("نقشه لود نشد:", error);
      }
    };

    const timer = setTimeout(bootstrap, 80);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng]);

  useEffect(() => {
    if (mapInstanceRef.current && tileLayerRef.current) {
      updateTileLayer(mapInstanceRef.current, mode);
    }
  }, [mode]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} className="w-full h-full" />
      <button
        onClick={() =>
          setMode((prev) => (prev === "satellite" ? "street" : "satellite"))
        }
        className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card/90 backdrop-blur-sm border border-border shadow-md text-[11px] font-bold text-foreground hover:bg-card transition-colors"
        dir="rtl"
      >
        {mode === "satellite" ? (
          <>
            <Map className="w-3.5 h-3.5" />
            نقشه خیابانی
          </>
        ) : (
          <>
            <Satellite className="w-3.5 h-3.5" />
            ماهواره‌ای
          </>
        )}
      </button>
    </div>
  );
}

export function AdMaps({
  city,
  district,
  address,
  latitude,
  longitude,
}: {
  city: string;
  district?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full space-y-3" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-black text-sm text-card-foreground">
            موقعیت مکانی روی نقشه
          </h3>
        </div>
        <span className="text-xs font-bold text-muted-foreground truncate max-w-[40%]">
          {city} {district ? `• ${district}` : ""}
        </span>
      </div>

      <div className="relative w-full h-48 sm:h-56 rounded-xl sm:rounded-2xl overflow-hidden border border-border bg-muted/20 shadow-sm group">
        <div className="w-full h-full">
          <MapView lat={latitude} lng={longitude} />
        </div>

        <Button
          size="sm"
          variant="secondary"
          className="absolute bottom-3 left-3 z-20 font-bold text-[11px] gap-1.5 rounded-xl shadow-lg border border-border text-foreground bg-card/90 backdrop-blur-sm hover:bg-card"
          onClick={() => setOpen(true)}
        >
          <Maximize2 className="w-3.5 h-3.5" />
          بزرگ‌نمایی نقشه
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl h-[85vh] rounded-2xl p-0 overflow-hidden flex flex-col gap-0 border-border bg-card shadow-2xl">
          <DialogTitle className="sr-only">موقعیت دقیق روی نقشه</DialogTitle>
          <div className="w-full px-4 py-3 border-b border-border flex items-center justify-between bg-muted/5 shrink-0 mt-safe">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-black text-sm text-card-foreground">
                  موقعیت جغرافیایی آگهی
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[60vw] md:max-w-none">
                  {[city, district, address].filter(Boolean).join(" • ")}
                </p>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="rounded-xl"
              onClick={() => setOpen(false)}
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
          <div className="flex-1 w-full bg-muted/10 relative min-h-0 pb-safe">
            <MapView lat={latitude} lng={longitude} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
