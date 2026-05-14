/**
 * RasterMap.tsx — Mapa interativo com tiles de risco ACEU e desmatamento evitado
 * Usa Leaflet + react-leaflet para exibir rasters sobre mapa base.
 * Carrega metadata.json dinamicamente para centralizar no bounds correto.
 *
 * Os tiles ficam em client/public/tiles/ e são servidos pelo Vite.
 * Para funcionar tanto local (base="/desmatamento-evitado/") quanto
 * em deploy, usamos window.location.origin + import.meta.env.BASE_URL.
 */
import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { FeatureCollection } from "geojson";

// Fallback caso metadata.json não exista
const DEFAULT_META = {
  bounds: { south: -18.05, west: -61.63, north: -7.35, east: -50.22 },
  center: { lat: -12.7, lon: -55.9 },
  zoom_min: 5,
  zoom_max: 12,
};

// Legenda de classes de risco
const CLASSES_RISCO = [
  { classe: 1, nome: "Risco muito baixo", cor: "#228B22", prob: "10%" },
  { classe: 2, nome: "Risco baixo", cor: "#90EE90", prob: "30%" },
  { classe: 3, nome: "Risco médio", cor: "#FFFF00", prob: "50%" },
  { classe: 4, nome: "Risco alto", cor: "#FFA500", prob: "70%" },
  { classe: 5, nome: "Risco muito alto", cor: "#DC1414", prob: "90%" },
];

// Legenda de classes de desmatamento evitado
const CLASSES_EVITADO = [
  { classe: 1, nome: "Floresta mantida (esperado)", cor: "#C8C8C8" },
  { classe: 2, nome: "Parcialmente evitado", cor: "#ADD8E6" },
  { classe: 3, nome: "Desmatamento evitado", cor: "#008000" },
  { classe: 4, nome: "Fortemente evitado", cor: "#005000" },
  { classe: 5, nome: "Perda confirmada", cor: "#DC1414" },
  { classe: 6, nome: "Perda inesperada", cor: "#800080" },
];

type CamadaAtiva = "risco" | "evitado";

interface TilesMetadata {
  bounds: { south: number; west: number; north: number; east: number };
  center: { lat: number; lon: number };
  zoom_min: number;
  zoom_max: number;
}

interface RasterMapProps {
  showLegend?: boolean;
  showMunicipios?: boolean;
  onMunicipioClick?: (codigo: string, nome: string) => void;
  className?: string;
  camadaInicial?: CamadaAtiva;
}

/**
 * Calcula a URL base absoluta para os tiles.
 * Usa window.location.origin + BASE_URL para garantir que funciona
 * independente do base path configurado no Vite.
 */
function getTilesBaseUrl(): string {
  const base = import.meta.env.BASE_URL || "/";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  // Garantir que termina com /
  const normalized = base.endsWith("/") ? base : base + "/";
  return `${origin}${normalized}`;
}

function FitToBounds({ bounds }: { bounds: TilesMetadata["bounds"] }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds([
      [bounds.south, bounds.west],
      [bounds.north, bounds.east],
    ]);
  }, [map, bounds]);
  return null;
}

export default function RasterMap({
  showLegend = true,
  showMunicipios = true,
  onMunicipioClick,
  className = "",
  camadaInicial = "risco",
}: RasterMapProps) {
  const [municipiosGeo, setMunicipiosGeo] = useState<FeatureCollection | null>(null);
  const [camadaAtiva, setCamadaAtiva] = useState<CamadaAtiva>(camadaInicial);
  const [meta, setMeta] = useState<TilesMetadata>(DEFAULT_META);
  const [metaLoaded, setMetaLoaded] = useState(false);

  // URL base absoluta: http://localhost:3000/desmatamento-evitado/
  const tilesBase = useMemo(() => getTilesBaseUrl(), []);

  // Carregar metadata.json dos tiles para obter bounds corretos
  useEffect(() => {
    fetch(`${tilesBase}tiles/metadata.json`)
      .then((r) => {
        if (r.ok) return r.json();
        return null;
      })
      .then((data) => {
        if (data && data.bounds) {
          setMeta({
            bounds: data.bounds,
            center: data.center || DEFAULT_META.center,
            zoom_min: data.zoom_min || DEFAULT_META.zoom_min,
            zoom_max: data.zoom_max || DEFAULT_META.zoom_max,
          });
        }
        setMetaLoaded(true);
      })
      .catch(() => setMetaLoaded(true));
  }, [tilesBase]);

  // Carregar GeoJSON dos municípios para overlay
  useEffect(() => {
    if (showMunicipios) {
      fetch(`${tilesBase}tiles/municipios_mt.geojson`)
        .then((r) => {
          if (r.ok) return r.json();
          return null;
        })
        .then((data) => {
          if (data) setMunicipiosGeo(data);
        })
        .catch(() => {});
    }
  }, [showMunicipios, tilesBase]);

  // URL absoluta para o Leaflet TileLayer
  // Ex: http://localhost:3000/desmatamento-evitado/tiles/risco/{z}/{x}/{y}.png
  const tilesUrl =
    camadaAtiva === "risco"
      ? `${tilesBase}tiles/risco/{z}/{x}/{y}.png`
      : `${tilesBase}tiles/evitado/{z}/{x}/{y}.png`;

  const legendaAtiva = camadaAtiva === "risco" ? CLASSES_RISCO : CLASSES_EVITADO;
  const tituloLegenda =
    camadaAtiva === "risco" ? "Risco de Desmatamento" : "Desmatamento Evitado";

  if (!metaLoaded) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ minHeight: "500px" }}>
        <p className="text-gray-500">Carregando mapa...</p>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`} style={{ minHeight: "500px" }}>
      {/* Seletor de camada */}
      <div className="absolute top-4 right-4 z-[1000] bg-white/95 rounded-lg shadow-md p-2">
        <p className="text-xs text-gray-500 mb-1.5 px-1">Camada</p>
        <button
          onClick={() => setCamadaAtiva("risco")}
          className={`block w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
            camadaAtiva === "risco"
              ? "bg-green-700 text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          Risco de Desmatamento
        </button>
        <button
          onClick={() => setCamadaAtiva("evitado")}
          className={`block w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
            camadaAtiva === "evitado"
              ? "bg-green-700 text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          Desmatamento Evitado
        </button>
      </div>

      <MapContainer
        center={[meta.center.lat, meta.center.lon]}
        zoom={6}
        minZoom={meta.zoom_min}
        maxZoom={meta.zoom_max}
        style={{ height: "100%", width: "100%", minHeight: "500px", borderRadius: "8px" }}
        scrollWheelZoom={true}
      >
        {/* Mapa base OpenStreetMap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          opacity={0.6}
        />

        {/* Tiles da camada ativa (risco ou desmatamento evitado) */}
        <TileLayer
          key={camadaAtiva}
          url={tilesUrl}
          opacity={0.75}
          tms={false}
          maxZoom={meta.zoom_max}
          minZoom={meta.zoom_min}
          errorTileUrl=""
        />

        {/* Limites municipais como overlay */}
        {municipiosGeo && (
          <GeoJSON
            data={municipiosGeo}
            style={{
              color: "#333",
              weight: 0.8,
              fillOpacity: 0,
              opacity: 0.5,
            }}
            onEachFeature={(feature, layer) => {
              const nome = feature.properties?.NM_MUN || feature.properties?.nome || "";
              const codigo = feature.properties?.CD_MUN || feature.properties?.codarea || "";
              layer.bindTooltip(nome, { sticky: true });
              if (onMunicipioClick) {
                layer.on("click", () => onMunicipioClick(codigo, nome));
              }
            }}
          />
        )}

        <FitToBounds bounds={meta.bounds} />
      </MapContainer>

      {/* Legenda dinâmica */}
      {showLegend && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 rounded-lg p-3 shadow-md text-sm max-w-[220px]">
          <p className="font-medium text-gray-700 mb-2">{tituloLegenda}</p>
          {legendaAtiva.map((c) => (
            <div key={c.classe} className="flex items-center gap-2 mb-1">
              <div
                className="w-4 h-4 rounded-sm flex-shrink-0"
                style={{ backgroundColor: c.cor, opacity: 0.85 }}
              />
              <span className="text-gray-600 text-xs">
                {c.nome}
                {"prob" in c ? ` (${(c as any).prob})` : ""}
              </span>
            </div>
          ))}
          <p className="text-gray-400 text-xs mt-2 border-t pt-1">
            Modelo ACEU / Hectares Indicator
          </p>
        </div>
      )}
    </div>
  );
}
