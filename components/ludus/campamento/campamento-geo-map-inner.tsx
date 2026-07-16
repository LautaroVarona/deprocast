"use client";

import type { GeoMapSnapshot } from "@/lib/geo/types";
import { Loader2Icon } from "lucide-react";
import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Props = {
  snapshot: GeoMapSnapshot;
  busyId: string | null;
  onComplete: (blockKind: "task" | "event", blockId: string) => void;
};

function FitBounds({
  points,
}: {
  points: Array<{ lat: number; lng: number }>;
}) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) {
      map.setView([39.503, -0.44], 12);
      return;
    }
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
      return;
    }
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    map.fitBounds(
      [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ],
      { padding: [40, 40] },
    );
  }, [map, points]);
  return null;
}

export function CampamentoGeoMapInner({
  snapshot,
  busyId,
  onComplete,
}: Props) {
  const points = useMemo(() => {
    const list: Array<{ lat: number; lng: number }> = [];
    for (const loc of snapshot.permanent) {
      list.push({ lat: loc.latitude, lng: loc.longitude });
    }
    for (const item of snapshot.temporal) {
      list.push({
        lat: item.location.latitude,
        lng: item.location.longitude,
      });
    }
    return list;
  }, [snapshot]);

  return (
    <MapContainer
      center={[39.503, -0.44]}
      zoom={12}
      className="h-full w-full !bg-[#0a0a0c]"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a> · OSM'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <FitBounds points={points} />

      {snapshot.permanent.map((loc) => (
        <CircleMarker
          key={`perm-${loc.id}`}
          center={[loc.latitude, loc.longitude]}
          radius={10}
          pathOptions={{
            color: "rgba(251, 191, 36, 0.9)",
            fillColor: "rgba(251, 191, 36, 0.55)",
            fillOpacity: 0.8,
            weight: 2,
          }}
        >
          <Popup>
            <div className="min-w-[140px] space-y-1 text-sm">
              <p className="font-semibold">{loc.name}</p>
              {loc.address ? (
                <p className="text-xs opacity-70">{loc.address}</p>
              ) : null}
              <p className="text-[10px] uppercase tracking-wider opacity-50">
                Permanente
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {snapshot.temporal.map((item) => {
        const color =
          item.blockKind === "task"
            ? "rgba(52, 211, 153, 0.9)"
            : "rgba(34, 211, 238, 0.9)";
        const fill =
          item.blockKind === "task"
            ? "rgba(52, 211, 153, 0.55)"
            : "rgba(34, 211, 238, 0.55)";
        return (
          <CircleMarker
            key={`tmp-${item.blockKind}-${item.blockId}`}
            center={[item.location.latitude, item.location.longitude]}
            radius={9}
            pathOptions={{
              color,
              fillColor: fill,
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Popup>
              <div className="min-w-[160px] space-y-2 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider opacity-50">
                    {item.blockKind === "task" ? "Tarea" : "Evento"} ·{" "}
                    {item.status}
                  </p>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-xs opacity-70">
                    {new Date(item.start).toLocaleString("es-ES", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                  {("label" in item.location && item.location.label) ||
                  item.location.address ||
                  ("name" in item.location && item.location.name) ? (
                    <p className="text-xs opacity-60">
                      {("label" in item.location && item.location.label) ||
                        ("name" in item.location && item.location.name) ||
                        item.location.address}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={busyId === item.blockId}
                  onClick={() => onComplete(item.blockKind, item.blockId)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {busyId === item.blockId ? (
                    <Loader2Icon className="size-3 animate-spin" />
                  ) : null}
                  {item.blockKind === "task" ? "Completar" : "Confirmar"}
                </button>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
