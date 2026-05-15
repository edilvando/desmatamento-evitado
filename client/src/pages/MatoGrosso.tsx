/*
 * MatoGrosso.tsx — Visão detalhada por municípios do MT
 * Dados PRODES (série histórica) + Pipeline ACEU (desmatamento evitado)
 */
import Layout from "@/components/Layout";
import MatoGrossoMap from "@/components/MatoGrossoMap";
import { useState, useMemo, useRef, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell, AreaChart, Area, PieChart, Pie
} from "recharts";
import { Search, ArrowUpDown, TreePine, Shield, Leaf, X, TrendingDown, TrendingUp, Filter, Calendar, MapPin, Download } from "lucide-react";
import desmatamentoData from "@/data/desmatamento.json";
import estatisticasACEU from "@/data/estatisticas_municipios.json";

const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028375704/duTvPYuJ7tMWZ778dehMaL/hero-amazonia-7RADVFFLPdKKonoZx4vaUp.webp";

const biomasMT = ["Todos", "Amazônia", "Cerrado", "Amazônia/Cerrado"];
const ANOS = ["2008","2009","2010","2011","2012","2013","2014","2015","2016","2017","2018","2019","2020","2021","2022","2023","2024"];
const PAGE_SIZE = 20;

// Cores das classes de risco
const RISCO_CORES = ["#228B22", "#90EE90", "#FFFF00", "#FFA500", "#DC1414"];
const RISCO_LABELS = ["Muito baixo", "Baixo", "Médio", "Alto", "Muito alto"];

export default function MatoGrosso() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBioma, setSelectedBioma] = useState("Todos");
  const [sortBy, setSortBy] = useState<"nome" | "ano" | "evitado">("evitado");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedMunicipio, setSelectedMunicipio] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState("2022");
  const [page, setPage] = useState(0);
  const detailRef = useRef<HTMLDivElement>(null);

  const municipios = desmatamentoData.municipios_mt;

  // Criar lookup nome -> dados ACEU
  const aceuByNome = useMemo(() => {
    const map: Record<string, typeof estatisticasACEU[0]> = {};
    for (const s of estatisticasACEU) {
      map[s.nome_municipio] = s;
    }
    return map;
  }, []);

  // Totais do pipeline ACEU
  const totaisACEU = useMemo(() => {
    const total = estatisticasACEU.reduce((acc, m) => ({
      floresta_ref: acc.floresta_ref + m.floresta_referencia_ha,
      floresta_atual: acc.floresta_atual + m.floresta_atual_ha,
      desmatado: acc.desmatado + m.desmatado_ha,
      perda_esperada: acc.perda_esperada + m.perda_esperada_ha,
      evitado: acc.evitado + m.desmatamento_evitado_ha,
      risco1: acc.risco1 + m.classe_risco_1_ha,
      risco2: acc.risco2 + m.classe_risco_2_ha,
      risco3: acc.risco3 + m.classe_risco_3_ha,
      risco4: acc.risco4 + m.classe_risco_4_ha,
      risco5: acc.risco5 + m.classe_risco_5_ha,
    }), { floresta_ref: 0, floresta_atual: 0, desmatado: 0, perda_esperada: 0, evitado: 0, risco1: 0, risco2: 0, risco3: 0, risco4: 0, risco5: 0 });
    return total;
  }, []);

  useEffect(() => {
    if (selectedMunicipio && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedMunicipio]);

  // Filtragem e ordenação
  const filtered = useMemo(() => {
    let data = [...municipios];
    if (selectedBioma !== "Todos") {
      data = data.filter((m) => m.bioma.includes(selectedBioma) || m.bioma === selectedBioma);
    }
    if (searchTerm) {
      data = data.filter((m) => m.nome.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    data.sort((a, b) => {
      if (sortBy === "nome") return sortDir === "asc" ? a.nome.localeCompare(b.nome) : b.nome.localeCompare(a.nome);
      if (sortBy === "ano") {
        const va = a.desmatamento_anual[selectedYear as keyof typeof a.desmatamento_anual] || 0;
        const vb = b.desmatamento_anual[selectedYear as keyof typeof b.desmatamento_anual] || 0;
        return sortDir === "asc" ? va - vb : vb - va;
      }
      if (sortBy === "evitado") {
        const ea = aceuByNome[a.nome]?.desmatamento_evitado_ha || 0;
        const eb = aceuByNome[b.nome]?.desmatamento_evitado_ha || 0;
        return sortDir === "asc" ? ea - eb : eb - ea;
      }
      return 0;
    });
    return data;
  }, [municipios, searchTerm, sortBy, sortDir, selectedYear, selectedBioma, aceuByNome]);

  // Evolução temporal — reativa ao bioma
  const serieEvolucao = useMemo(() => {
    const munisFiltrados = selectedBioma === "Todos"
      ? municipios
      : municipios.filter(m => m.bioma.includes(selectedBioma) || m.bioma === selectedBioma);

    return ANOS.map((ano) => {
      const total = munisFiltrados.reduce((sum, m) => sum + (m.desmatamento_anual[ano as keyof typeof m.desmatamento_anual] || 0), 0);
      return { ano, total };
    });
  }, [municipios, selectedBioma]);

  // Ranking top 10 por desmatamento evitado (ACEU)
  const rankingEvitado = useMemo(() => {
    return [...estatisticasACEU]
      .sort((a, b) => b.desmatamento_evitado_ha - a.desmatamento_evitado_ha)
      .slice(0, 10)
      .map((m) => ({
        nome: m.nome_municipio.length > 14 ? m.nome_municipio.substring(0, 14) + "…" : m.nome_municipio,
        nomeCompleto: m.nome_municipio,
        evitado: Math.round(m.desmatamento_evitado_ha / 100), // km²
      }));
  }, []);

  const detail = selectedMunicipio ? municipios.find((m) => m.nome === selectedMunicipio) : null;
  const detailACEU = selectedMunicipio ? aceuByNome[selectedMunicipio] : null;

  const detailSerie = useMemo(() => {
    if (!detail) return [];
    return Object.entries(detail.desmatamento_anual)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ano, val]) => ({ ano, desmatamento: val }));
  }, [detail]);

  const detailRisco = useMemo(() => {
    if (!detailACEU) return [];
    return [
      { name: "Muito baixo", value: detailACEU.classe_risco_1_ha, fill: RISCO_CORES[0] },
      { name: "Baixo", value: detailACEU.classe_risco_2_ha, fill: RISCO_CORES[1] },
      { name: "Médio", value: detailACEU.classe_risco_3_ha, fill: RISCO_CORES[2] },
      { name: "Alto", value: detailACEU.classe_risco_4_ha, fill: RISCO_CORES[3] },
      { name: "Muito alto", value: detailACEU.classe_risco_5_ha, fill: RISCO_CORES[4] },
    ].filter(d => d.value > 0);
  }, [detailACEU]);

  const toggleSort = (col: "nome" | "ano" | "evitado") => {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const downloadCSV = () => {
    const sep = ";";
    const header = [
      "Código IBGE", "Município", "Área Total (ha)", "Floresta Referência (ha)",
      "Floresta Atual (ha)", "Desmatado (ha)", "Perda Esperada (ha)",
      "Desmatamento Evitado (ha)", "Taxa Proteção (%)",
      "Risco 1 (ha)", "Risco 2 (ha)", "Risco 3 (ha)", "Risco 4 (ha)", "Risco 5 (ha)"
    ].join(sep);
    const rows = estatisticasACEU.map((m) =>
      [
        m.cod_municipio, m.nome_municipio,
        m.area_total_ha, m.floresta_referencia_ha, m.floresta_atual_ha,
        m.desmatado_ha, m.perda_esperada_ha, m.desmatamento_evitado_ha,
        m.taxa_protecao_pct,
        m.classe_risco_1_ha, m.classe_risco_2_ha, m.classe_risco_3_ha,
        m.classe_risco_4_ha, m.classe_risco_5_ha,
      ]
        .map((v) => typeof v === "number" ? String(v).replace(".", ",") : v)
        .join(sep)
    );
    const bom = "\uFEFF";
    const csv = bom + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "estatisticas_municipios_mt.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSelectMunicipio = (nome: string) => {
    setSelectedMunicipio(selectedMunicipio === nome ? null : nome);
  };

  // Totais reativos ao bioma
  const munisFiltradosBioma = useMemo(() => {
    if (selectedBioma === "Todos") return municipios;
    return municipios.filter(m => m.bioma.includes(selectedBioma) || m.bioma === selectedBioma);
  }, [municipios, selectedBioma]);

  const totalDesmatAno = munisFiltradosBioma.reduce((s, m) => s + (m.desmatamento_anual[selectedYear as keyof typeof m.desmatamento_anual] || 0), 0);
  const avgFlorestal = munisFiltradosBioma.length > 0
    ? (munisFiltradosBioma.reduce((s, m) => s + m.cobertura_florestal_pct, 0) / munisFiltradosBioma.length).toFixed(1)
    : "0";

  const biomaLabel = selectedBioma === "Todos" ? "Todos os biomas" : selectedBioma;

  return (
    <Layout>
      {/* Banner */}
      <section className="relative overflow-hidden" style={{ height: "280px" }}>
        <img src={HERO_IMG} alt="Amazônia" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.65))" }} />
        <div className="relative container flex flex-col justify-end h-full pb-10">
          <p className="text-sm font-semibold tracking-widest uppercase mb-2" style={{ color: "#a8d5a2" }}>Análise Municipal</p>
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: "#fff", fontFamily: "'Merriweather', serif" }}>
            Mato Grosso — Municípios
          </h1>
          <p className="text-base mt-2" style={{ color: "rgba(255,255,255,0.8)", maxWidth: "600px" }}>
            Dados PRODES/INPE (2008-2024) e resultados do modelo ACEU de desmatamento evitado (período 2008-2022).
          </p>
        </div>
      </section>

      {/* Indicadores ACEU — resultados do pipeline */}
      <section className="py-8">
        <div className="container">
          <h2 className="text-xl font-bold mb-2" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
            Resultados do Modelo ACEU — Período 2008–2022
          </h2>
          <p className="text-sm mb-6" style={{ color: "#7a7568" }}>
            Dados calculados pelo pipeline de geoprocessamento usando o Hectares Indicator (Ecometrica, 2018; Vendrusculo et al., 2019).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl p-5 flex items-center gap-4" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "rgba(46,125,50,0.1)" }}>
                <TreePine size={20} style={{ color: "#2E7D32" }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "#2E7D32" }}>{Math.round(totaisACEU.floresta_ref / 100).toLocaleString("pt-BR")} km²</p>
                <p className="text-xs" style={{ color: "#7a7568" }}>Floresta de referência (2008)</p>
              </div>
            </div>
            <div className="rounded-xl p-5 flex items-center gap-4" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "rgba(191,54,12,0.08)" }}>
                <TrendingDown size={20} style={{ color: "#BF360C" }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "#BF360C" }}>{Math.round(totaisACEU.desmatado / 100).toLocaleString("pt-BR")} km²</p>
                <p className="text-xs" style={{ color: "#7a7568" }}>Desmatado observado (2008-2022)</p>
              </div>
            </div>
            <div className="rounded-xl p-5 flex items-center gap-4" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "rgba(200,169,81,0.1)" }}>
                <TrendingUp size={20} style={{ color: "#C8A951" }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "#C8A951" }}>{Math.round(totaisACEU.perda_esperada / 100).toLocaleString("pt-BR")} km²</p>
                <p className="text-xs" style={{ color: "#7a7568" }}>Perda esperada (modelo ACEU)</p>
              </div>
            </div>
            <div className="rounded-xl p-5 flex items-center gap-4" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "rgba(46,125,50,0.1)" }}>
                <Shield size={20} style={{ color: "#2E7D32" }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "#2E7D32" }}>{Math.round(totaisACEU.evitado / 100).toLocaleString("pt-BR")} km²</p>
                <p className="text-xs" style={{ color: "#7a7568" }}>Desmatamento evitado (ACEU)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filtros de bioma + seletor de ano */}
      <section className="pb-2">
        <div className="container">
          <h2 className="text-xl font-bold mb-4" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
            Série Histórica PRODES — Desmatamento Observado
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <Filter size={16} style={{ color: "#9a958e" }} />
            <span className="text-sm font-medium" style={{ color: "#5a5448" }}>Bioma:</span>
            {biomasMT.map((b) => (
              <button
                key={b}
                onClick={() => setSelectedBioma(b)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  background: selectedBioma === b ? "#2E7D32" : "#fff",
                  color: selectedBioma === b ? "#fff" : "#5a5448",
                  border: `1px solid ${selectedBioma === b ? "#2E7D32" : "#e8e5dd"}`,
                }}
              >
                {b}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <Calendar size={14} style={{ color: "#7a7568" }} />
              <span className="text-sm" style={{ color: "#7a7568" }}>Ano:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-sm"
                style={{ background: "#f4f3ee", border: "1px solid #e8e5dd", color: "#2c2417" }}
              >
                {ANOS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Mapa + Ranking lado a lado */}
      <section className="py-6">
        <div className="container">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <MatoGrossoMap
              municipios={municipios as any}
              onSelectMunicipio={handleSelectMunicipio}
              selectedMunicipio={selectedMunicipio}
              selectedBioma={selectedBioma}
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
            />

            <div className="flex flex-col gap-6">
              {/* Ranking por desmatamento evitado (ACEU) */}
              <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
                <div className="px-5 pt-5 pb-3">
                  <h3 className="text-lg font-bold" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
                    Top 10 — Desmatamento Evitado (ACEU)
                  </h3>
                  <p className="text-sm" style={{ color: "#7a7568" }}>Municípios com maior desmatamento evitado no período 2008-2022</p>
                </div>
                <div className="px-3 pb-3">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={rankingEvitado} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dd" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "#7a7568" }} />
                      <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: "#5a5448" }} width={110} />
                      <Tooltip
                        contentStyle={{ background: "#fff", border: "1px solid #e8e5dd", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(value: number, _: any, props: any) => [`${value.toLocaleString("pt-BR")} km²`, props.payload.nomeCompleto]}
                      />
                      <Bar dataKey="evitado" radius={[0, 4, 4, 0]}>
                        {rankingEvitado.map((_, i) => (
                          <Cell key={i} fill={i < 3 ? "#1B5E20" : i < 6 ? "#2E7D32" : "#4CAF50"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Evolução temporal PRODES */}
              <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
                <div className="px-5 pt-5 pb-3">
                  <h3 className="text-base font-bold" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
                    Desmatamento Observado — {biomaLabel}
                  </h3>
                  <p className="text-sm" style={{ color: "#7a7568" }}>Soma dos municípios (PRODES/INPE), 2008 a 2024</p>
                </div>
                <div className="px-3 pb-3">
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={serieEvolucao}>
                      <defs>
                        <linearGradient id="colorTotalMT" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#BF360C" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#BF360C" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dd" />
                      <XAxis dataKey="ano" tick={{ fontSize: 11, fill: "#7a7568" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#7a7568" }} />
                      <Tooltip
                        contentStyle={{ background: "#fff", border: "1px solid #e8e5dd", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(value: number) => [`${value.toLocaleString("pt-BR")} km²`, "Desmatamento"]}
                      />
                      <Area type="monotone" dataKey="total" stroke="#BF360C" strokeWidth={2} fill="url(#colorTotalMT)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Detalhe do município selecionado */}
      {detail && (
        <section className="py-8" ref={detailRef} style={{ background: "#f9f8f5" }}>
          <div className="container">
            <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
              <div className="px-6 py-5 flex items-center justify-between flex-wrap gap-3" style={{ borderBottom: "1px solid #f0ede7" }}>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
                    {detail.nome}
                  </h3>
                  <p className="text-sm mt-1" style={{ color: "#7a7568" }}>
                    {detail.bioma} — Área: {detail.area_km2.toLocaleString("pt-BR")} km² — Cobertura florestal: {detail.cobertura_florestal_pct}%
                  </p>
                </div>
                <button onClick={() => setSelectedMunicipio(null)} className="p-2 rounded-lg" style={{ color: "#7a7568", background: "#f4f3ee" }}>
                  <X size={18} />
                </button>
              </div>

              {/* Indicadores ACEU do município */}
              {detailACEU && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 px-6 py-5" style={{ borderBottom: "1px solid #f0ede7" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(46,125,50,0.08)" }}>
                      <TreePine size={18} style={{ color: "#2E7D32" }} />
                    </div>
                    <div>
                      <p className="text-lg font-bold" style={{ color: "#2E7D32" }}>{Math.round(detailACEU.floresta_referencia_ha / 100).toLocaleString("pt-BR")} km²</p>
                      <p className="text-xs" style={{ color: "#9a958e" }}>Floresta ref. (2008)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(191,54,12,0.08)" }}>
                      <TrendingDown size={18} style={{ color: "#BF360C" }} />
                    </div>
                    <div>
                      <p className="text-lg font-bold" style={{ color: "#BF360C" }}>{Math.round(detailACEU.desmatado_ha / 100).toLocaleString("pt-BR")} km²</p>
                      <p className="text-xs" style={{ color: "#9a958e" }}>Desmatado (2008-2022)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(46,125,50,0.08)" }}>
                      <Shield size={18} style={{ color: "#2E7D32" }} />
                    </div>
                    <div>
                      <p className="text-lg font-bold" style={{ color: "#2E7D32" }}>{Math.round(detailACEU.desmatamento_evitado_ha / 100).toLocaleString("pt-BR")} km²</p>
                      <p className="text-xs" style={{ color: "#9a958e" }}>Evitado (ACEU)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(46,125,50,0.08)" }}>
                      <Leaf size={18} style={{ color: "#2E7D32" }} />
                    </div>
                    <div>
                      <p className="text-lg font-bold" style={{ color: "#2E7D32" }}>{detailACEU.taxa_protecao_pct.toFixed(1)}%</p>
                      <p className="text-xs" style={{ color: "#9a958e" }}>Taxa de proteção</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                <div>
                  <h4 className="text-sm font-semibold mb-4" style={{ color: "#5a5448" }}>Série Histórica — Desmatamento Observado (km²)</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={detailSerie}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dd" />
                      <XAxis dataKey="ano" tick={{ fontSize: 11, fill: "#7a7568" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#7a7568" }} />
                      <Tooltip
                        contentStyle={{ background: "#fff", border: "1px solid #e8e5dd", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(value: number) => [`${value.toLocaleString("pt-BR")} km²`, "Desmatamento"]}
                      />
                      <Bar dataKey="desmatamento" radius={[4, 4, 0, 0]}>
                        {detailSerie.map((entry) => (
                          <Cell key={entry.ano} fill={entry.ano === selectedYear ? "#BF360C" : "#8D6E63"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-4" style={{ color: "#5a5448" }}>Distribuição de Risco ACEU (ha)</h4>
                  {detailRisco.length > 0 ? (
                    <div>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={detailRisco}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            labelLine={false}
                          >
                            {detailRisco.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ background: "#fff", border: "1px solid #e8e5dd", borderRadius: "8px", fontSize: "12px" }}
                            formatter={(value: number) => [`${value.toLocaleString("pt-BR")} ha`, ""]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap gap-3 justify-center mt-2">
                        {RISCO_LABELS.map((label, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm" style={{ background: RISCO_CORES[i] }} />
                            <span className="text-xs" style={{ color: "#5a5448" }}>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[300px]" style={{ color: "#9a958e" }}>
                      <p className="text-sm">Dados ACEU não disponíveis para este município.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Tabela de municípios */}
      <section className="py-8">
        <div className="container">
          <div className="flex flex-wrap gap-3 mb-6 items-center justify-between">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9a958e" }} />
              <input
                type="text"
                placeholder="Buscar município..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm"
                style={{ background: "#fff", border: "1px solid #e8e5dd", color: "#2c2417" }}
              />
            </div>
            <button
              onClick={downloadCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{ background: "#2E7D32", color: "#fff" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#1B5E20")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#2E7D32")}
            >
              <Download size={16} />
              Baixar CSV
            </button>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#f9f8f5", borderBottom: "1px solid #e8e5dd" }}>
                    <th className="text-left px-4 py-3 font-semibold cursor-pointer" style={{ color: "#5a5448" }} onClick={() => toggleSort("nome")}>
                      <span className="inline-flex items-center gap-1">Município <ArrowUpDown size={12} /></span>
                    </th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Bioma</th>
                    <th className="text-right px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Floresta ref. (km²)</th>
                    <th className="text-right px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Desmatado (km²)</th>
                    <th className="text-right px-4 py-3 font-semibold cursor-pointer" style={{ color: "#5a5448" }} onClick={() => toggleSort("evitado")}>
                      <span className="inline-flex items-center gap-1 justify-end">Evitado (km²) <ArrowUpDown size={12} /></span>
                    </th>
                    <th className="text-right px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Proteção (%)</th>
                    <th className="text-center px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((m) => {
                    const aceu = aceuByNome[m.nome];
                    const isActive = selectedMunicipio === m.nome;
                    return (
                      <tr
                        key={m.nome}
                        style={{
                          borderBottom: "1px solid #f0ede7",
                          background: isActive ? "rgba(46,125,50,0.04)" : "transparent",
                        }}
                        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#fafaf5"; }}
                        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? "rgba(46,125,50,0.04)" : "transparent"; }}
                      >
                        <td className="px-4 py-3 font-medium" style={{ color: "#2c2417" }}>{m.nome}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(46,125,50,0.08)", color: "#2E7D32" }}>
                            {m.bioma}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right" style={{ color: "#7a7568" }}>
                          {aceu ? Math.round(aceu.floresta_referencia_ha / 100).toLocaleString("pt-BR") : "—"}
                        </td>
                        <td className="px-4 py-3 text-right" style={{ color: "#BF360C" }}>
                          {aceu ? Math.round(aceu.desmatado_ha / 100).toLocaleString("pt-BR") : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold" style={{ color: "#2E7D32" }}>
                          {aceu ? Math.round(aceu.desmatamento_evitado_ha / 100).toLocaleString("pt-BR") : "—"}
                        </td>
                        <td className="px-4 py-3 text-right" style={{ color: "#5a5448" }}>
                          {aceu ? `${aceu.taxa_protecao_pct.toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleSelectMunicipio(m.nome)}
                            className="text-xs px-3 py-1 rounded-md font-medium transition-all"
                            style={{
                              background: isActive ? "#2E7D32" : "rgba(46,125,50,0.08)",
                              color: isActive ? "#fff" : "#2E7D32",
                            }}
                          >
                            {isActive ? "Fechar" : "Ver"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid #e8e5dd" }}>
                <p className="text-xs" style={{ color: "#7a7568" }}>
                  Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length} municípios
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                    style={{
                      background: page === 0 ? "#f4f3ee" : "#2E7D32",
                      color: page === 0 ? "#9a958e" : "#fff",
                      cursor: page === 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(Math.min(Math.ceil(filtered.length / PAGE_SIZE) - 1, page + 1))}
                    disabled={page >= Math.ceil(filtered.length / PAGE_SIZE) - 1}
                    className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                    style={{
                      background: page >= Math.ceil(filtered.length / PAGE_SIZE) - 1 ? "#f4f3ee" : "#2E7D32",
                      color: page >= Math.ceil(filtered.length / PAGE_SIZE) - 1 ? "#9a958e" : "#fff",
                      cursor: page >= Math.ceil(filtered.length / PAGE_SIZE) - 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}
          </div>
          <p className="text-xs mt-3" style={{ color: "#9a958e" }}>
            Fonte: Desmatamento observado — PRODES/INPE. Desmatamento evitado — Modelo ACEU (Hectares Indicator), período 2008-2022, resolução 30m.
          </p>
        </div>
      </section>
    </Layout>
  );
}
