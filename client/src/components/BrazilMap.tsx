/*
 * BrazilMap.tsx — Mapa interativo do Brasil com timeline animada
 * Dois modos: "desmatamento" (vermelho=pior) e "evitado" (verde=preservou mais)
 * Sincronizado com a página via selectedYear/onYearChange
 * Suporta filtro por bioma
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Play, Pause, SkipBack, SkipForward, TreePine, Flame } from "lucide-react";

const BR_GEOJSON_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028375704/duTvPYuJ7tMWZ778dehMaL/br_states_simple_05fb1a5a.json";

type MapMode = "desmatamento" | "evitado";

interface EstadoData {
  nome: string;
  sigla: string;
  bioma_principal: string;
  desmatamento_acumulado_km2: number;
  desmatamento_anual: Record<string, number>;
  desmatamento_evitado: Record<string, { esperado: number; observado: number; evitado: number }>;
}

interface BrazilMapProps {
  estados: EstadoData[];
  onSelectEstado?: (sigla: string) => void;
  selectedEstado?: string | null;
  selectedBioma?: string;
  selectedYear?: string;
  onYearChange?: (year: string) => void;
}

interface GeoFeature {
  type: string;
  properties: { SIGLA: string; Estado: string };
  geometry: { type: string; coordinates: number[][][] | number[][][][] };
}

interface TooltipData {
  x: number; y: number;
  sigla: string; nome: string;
  valor: number; evitado: number;
  ano: string;
}

function projectPoint(lon: number, lat: number, width: number, height: number): [number, number] {
  const minLon = -74.5, maxLon = -32, minLat = -34, maxLat = 6;
  const x = ((lon - minLon) / (maxLon - minLon)) * width;
  const y = ((maxLat - lat) / (maxLat - minLat)) * height;
  return [x, y];
}

function coordsToPath(coords: number[][], w: number, h: number): string {
  return coords.map((c, i) => {
    const [x, y] = projectPoint(c[0], c[1], w, h);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join("") + "Z";
}

function featureToPath(geometry: GeoFeature["geometry"], w: number, h: number): string {
  if (geometry.type === "Polygon") {
    return (geometry.coordinates as number[][][]).map(ring => coordsToPath(ring, w, h)).join(" ");
  }
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates as number[][][][]).map(poly =>
      poly.map(ring => coordsToPath(ring, w, h)).join(" ")
    ).join(" ");
  }
  return "";
}

// Escala de cores para desmatamento (verde -> amarelo -> vermelho)
function getColorDesmatamento(value: number, max: number): string {
  if (value <= 0) return "#e8e5dd";
  const ratio = Math.min(value / max, 1);
  if (ratio < 0.25) {
    const t = ratio / 0.25;
    return `rgb(${Math.round(46 + t * 122)},${Math.round(125 + t * 40)},${Math.round(50 + t * 31)})`;
  }
  if (ratio < 0.5) {
    const t = (ratio - 0.25) / 0.25;
    return `rgb(${Math.round(168 + t * 32)},${Math.round(165 + t * 4)},${Math.round(81)})`;
  }
  if (ratio < 0.75) {
    const t = (ratio - 0.5) / 0.25;
    return `rgb(${Math.round(200 - t * 9)},${Math.round(169 - t * 115)},${Math.round(81 - t * 69)})`;
  }
  const t = (ratio - 0.75) / 0.25;
  return `rgb(${Math.round(191 - t * 51)},${Math.round(54 - t * 34)},${Math.round(12 - t * 7)})`;
}

// Escala de cores para desmatamento evitado (vermelho=negativo -> cinza=zero -> verde=positivo)
function getColorEvitado(value: number, maxAbs: number): string {
  if (maxAbs === 0) return "#e8e5dd";
  const ratio = value / maxAbs; // -1 a +1
  if (ratio >= 0) {
    // Positivo = preservou (verde)
    const t = Math.min(ratio, 1);
    return `rgb(${Math.round(220 - t * 174)},${Math.round(220 - t * 95)},${Math.round(220 - t * 170)})`;
  } else {
    // Negativo = desmatou mais que esperado (vermelho)
    const t = Math.min(Math.abs(ratio), 1);
    return `rgb(${Math.round(220 - t * 29)},${Math.round(220 - t * 166)},${Math.round(220 - t * 208)})`;
  }
}

const ANOS = ["2008","2009","2010","2011","2012","2013","2014","2015","2016","2017","2018","2019","2020","2021","2022","2023","2024"];

export default function BrazilMap({ estados, onSelectEstado, selectedEstado, selectedBioma = "Todos", selectedYear, onYearChange }: BrazilMapProps) {
  const [geoData, setGeoData] = useState<GeoFeature[] | null>(null);
  const [playing, setPlaying] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapMode, setMapMode] = useState<MapMode>("desmatamento");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const anoIdx = selectedYear ? ANOS.indexOf(selectedYear) : ANOS.length - 1;
  const ano = ANOS[Math.max(0, anoIdx)];
  const W = 600, H = 560;

  useEffect(() => {
    fetch(BR_GEOJSON_URL)
      .then(r => r.json())
      .then(data => { setGeoData(data.features); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const maxDesmatamento = useMemo(() => {
    let max = 0;
    for (const e of estados) {
      for (const a of ANOS) {
        const v = e.desmatamento_anual[a] || 0;
        if (v > max) max = v;
      }
    }
    return max;
  }, [estados]);

  const maxAbsEvitado = useMemo(() => {
    let max = 0;
    for (const e of estados) {
      const ev = e.desmatamento_evitado?.[ano];
      if (ev) {
        const abs = Math.abs(ev.evitado);
        if (abs > max) max = abs;
      }
    }
    return max || 1;
  }, [estados, ano]);

  const estadoMap = useMemo(() => {
    const m: Record<string, EstadoData> = {};
    for (const e of estados) m[e.sigla] = e;
    return m;
  }, [estados]);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        const nextIdx = anoIdx + 1;
        if (nextIdx >= ANOS.length) {
          setPlaying(false);
        } else {
          onYearChange?.(ANOS[nextIdx]);
        }
      }, 800);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, anoIdx, onYearChange]);

  const handlePlay = useCallback(() => {
    if (anoIdx >= ANOS.length - 1) onYearChange?.(ANOS[0]);
    setPlaying(true);
  }, [anoIdx, onYearChange]);

  const handleMouseMove = useCallback((e: React.MouseEvent, sigla: string) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const est = estadoMap[sigla];
    if (!est) return;
    const ev = est.desmatamento_evitado?.[ano];
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 10,
      sigla,
      nome: est.nome,
      valor: est.desmatamento_anual[ano] || 0,
      evitado: ev?.evitado || 0,
      ano,
    });
  }, [estadoMap, ano]);

  const totalAno = useMemo(() => {
    const filtered = selectedBioma === "Todos" ? estados : estados.filter(e => e.bioma_principal.includes(selectedBioma));
    if (mapMode === "desmatamento") {
      return filtered.reduce((s, e) => s + (e.desmatamento_anual[ano] || 0), 0);
    } else {
      return filtered.reduce((s, e) => {
        const ev = e.desmatamento_evitado?.[ano];
        return s + (ev?.evitado || 0);
      }, 0);
    }
  }, [estados, ano, selectedBioma, mapMode]);

  const biomaLabel = selectedBioma === "Todos" ? "Nacional" : selectedBioma;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" style={{ color: "#7a7568" }}>
        <div className="animate-spin w-6 h-6 border-2 rounded-full mr-3" style={{ borderColor: "#2E7D32", borderTopColor: "transparent" }} />
        Carregando mapa...
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
      {/* Header com toggle de modo */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div>
            <h3 className="text-lg font-bold" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
              {mapMode === "desmatamento" ? "Mapa do Desmatamento" : "Mapa do Desmatamento Evitado"} — {ano}
            </h3>
            <p className="text-sm" style={{ color: "#7a7568" }}>
              {mapMode === "desmatamento" ? (
                <>Total {biomaLabel}: <span style={{ color: "#BF360C", fontWeight: 600 }}>{totalAno.toLocaleString("pt-BR")} km²</span></>
              ) : (
                <>Saldo {biomaLabel}: <span style={{ color: totalAno >= 0 ? "#2E7D32" : "#BF360C", fontWeight: 600 }}>{totalAno >= 0 ? "+" : ""}{Math.round(totalAno).toLocaleString("pt-BR")} km²</span></>
              )}
            </p>
          </div>
          <p className="text-xs" style={{ color: "#9a958e" }}>Clique em um estado para ver detalhes</p>
        </div>

        {/* Toggle Desmatamento / Evitado */}
        <div className="flex gap-2">
          <button
            onClick={() => setMapMode("desmatamento")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: mapMode === "desmatamento" ? "#BF360C" : "#f4f3ee",
              color: mapMode === "desmatamento" ? "#fff" : "#7a7568",
              border: `1px solid ${mapMode === "desmatamento" ? "#BF360C" : "#e8e5dd"}`,
            }}
          >
            <Flame size={13} /> Desmatamento
          </button>
          <button
            onClick={() => setMapMode("evitado")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: mapMode === "evitado" ? "#2E7D32" : "#f4f3ee",
              color: mapMode === "evitado" ? "#fff" : "#7a7568",
              border: `1px solid ${mapMode === "evitado" ? "#2E7D32" : "#e8e5dd"}`,
            }}
          >
            <TreePine size={13} /> Desmatamento Evitado
          </button>
        </div>
      </div>

      <div className="relative px-3">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: "480px" }}>
          {geoData?.map((feat) => {
            const sigla = feat.properties.SIGLA;
            const est = estadoMap[sigla];
            const valor = est?.desmatamento_anual[ano] || 0;
            const ev = est?.desmatamento_evitado?.[ano];
            const evitado = ev?.evitado || 0;

            const color = mapMode === "desmatamento"
              ? getColorDesmatamento(valor, maxDesmatamento)
              : getColorEvitado(evitado, maxAbsEvitado);

            const isSelected = selectedEstado === sigla;
            const path = featureToPath(feat.geometry, W, H);
            const inBioma = selectedBioma === "Todos" || (est?.bioma_principal?.includes(selectedBioma) ?? false);
            const opacity = inBioma ? 1 : 0.2;

            return (
              <path
                key={sigla}
                d={path}
                fill={color}
                stroke={isSelected ? "#2c2417" : "#fff"}
                strokeWidth={isSelected ? 2.5 : 0.5}
                opacity={opacity}
                style={{ cursor: "pointer", transition: "fill 0.4s ease, opacity 0.4s ease, stroke-width 0.2s" }}
                onClick={() => onSelectEstado?.(sigla)}
                onMouseMove={(e) => handleMouseMove(e, sigla)}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}
        </svg>

        {tooltip && (
          <div
            className="absolute pointer-events-none rounded-lg px-3 py-2 shadow-lg z-10"
            style={{
              left: tooltip.x, top: tooltip.y,
              transform: "translate(-50%, -100%)",
              background: "rgba(44,36,23,0.92)", color: "#fff",
            }}
          >
            <p className="text-xs font-semibold">{tooltip.nome} ({tooltip.sigla})</p>
            <p className="text-xs">{tooltip.ano}: <span style={{ color: "#ffab91" }}>{tooltip.valor.toLocaleString("pt-BR")} km²</span> desmatado</p>
            <p className="text-xs">Evitado: <span style={{ color: tooltip.evitado >= 0 ? "#a8d5a2" : "#ffab91" }}>
              {tooltip.evitado >= 0 ? "+" : ""}{Math.round(tooltip.evitado).toLocaleString("pt-BR")} km²
            </span></p>
          </div>
        )}

        {/* Legenda */}
        {mapMode === "desmatamento" ? (
          <div className="absolute bottom-3 left-5 flex items-center gap-1">
            <span className="text-xs" style={{ color: "#7a7568" }}>Menor</span>
            <div className="flex h-3 rounded-sm overflow-hidden" style={{ width: "100px" }}>
              {[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1].map((r, i) => (
                <div key={i} className="flex-1" style={{ background: getColorDesmatamento(r * maxDesmatamento, maxDesmatamento) }} />
              ))}
            </div>
            <span className="text-xs" style={{ color: "#7a7568" }}>Maior</span>
          </div>
        ) : (
          <div className="absolute bottom-3 left-5 flex items-center gap-1">
            <span className="text-xs" style={{ color: "#BF360C" }}>Desmatou mais</span>
            <div className="flex h-3 rounded-sm overflow-hidden" style={{ width: "120px" }}>
              {[-1, -0.7, -0.3, 0, 0.3, 0.7, 1].map((r, i) => (
                <div key={i} className="flex-1" style={{ background: getColorEvitado(r * maxAbsEvitado, maxAbsEvitado) }} />
              ))}
            </div>
            <span className="text-xs" style={{ color: "#2E7D32" }}>Preservou mais</span>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="px-5 py-4" style={{ borderTop: "1px solid #f0ede7" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => { setPlaying(false); onYearChange?.(ANOS[0]); }} className="p-1.5 rounded-md" style={{ color: "#7a7568" }} title="Início">
            <SkipBack size={16} />
          </button>
          <button onClick={playing ? () => setPlaying(false) : handlePlay} className="p-2 rounded-full" style={{ background: "#2E7D32", color: "#fff" }} title={playing ? "Pausar" : "Reproduzir"}>
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button onClick={() => { setPlaying(false); onYearChange?.(ANOS[ANOS.length - 1]); }} className="p-1.5 rounded-md" style={{ color: "#7a7568" }} title="Fim">
            <SkipForward size={16} />
          </button>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: "#5a5448", minWidth: "32px" }}>{ANOS[0]}</span>
            <input
              type="range" min={0} max={ANOS.length - 1} value={Math.max(0, anoIdx)}
              onChange={(e) => { setPlaying(false); onYearChange?.(ANOS[Number(e.target.value)]); }}
              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #2E7D32 ${(Math.max(0, anoIdx) / (ANOS.length - 1)) * 100}%, #e8e5dd ${(Math.max(0, anoIdx) / (ANOS.length - 1)) * 100}%)`,
                accentColor: "#2E7D32",
              }}
            />
            <span className="text-xs font-medium" style={{ color: "#5a5448", minWidth: "32px" }}>{ANOS[ANOS.length - 1]}</span>
          </div>
          <span className="text-sm font-bold px-3 py-1 rounded-lg" style={{ background: "#f4f3ee", color: "#2c2417", minWidth: "50px", textAlign: "center" }}>
            {ano}
          </span>
        </div>
      </div>
    </div>
  );
}
