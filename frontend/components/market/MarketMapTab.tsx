// MarketMapTab.tsx
"use client";

import { MapView } from "@/components/panel/MapView";
import { LocationHierarchyBrowser } from "@/components/market/LocationHierarchyBrowser";

interface MarketMapTabProps {
  markers: any[];
  loading: boolean;
  mapCenter: [number, number];
  mapZoom: number;
  selectedProvinceId: string;
  selectedCityId: string;
  onSelectProvince: (id: string, name: string) => void;
  onSelectCity: (id: string, name: string) => void;
  onSelectDistrict: (name: string) => void;
  onAnalyze: (level: "province" | "city" | "district", name: string) => void;
  onAdClick?: (ad: any) => void;
}

export default function MarketMapTab({
  markers,
  loading,
  mapCenter,
  mapZoom,
  selectedProvinceId,
  selectedCityId,
  onSelectProvince,
  onSelectCity,
  onSelectDistrict,
  onAnalyze,
  onAdClick,
}: MarketMapTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 h-[600px] rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
        <LocationHierarchyBrowser
          selectedProvinceId={selectedProvinceId}
          selectedCityId={selectedCityId}
          onSelectProvince={onSelectProvince}
          onSelectCity={onSelectCity}
          onSelectDistrict={onSelectDistrict}
          onAnalyze={onAnalyze}
        />
      </div>
      <div className="lg:col-span-2 h-[600px] rounded-2xl overflow-hidden border border-border shadow-md relative bg-card">
        <MapView
          markers={markers}
          loading={loading}
          center={mapCenter}
          zoom={mapZoom}
          onAdClick={onAdClick}
          className="h-full w-full"
        />
        {loading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}
      </div>
    </div>
  );
}