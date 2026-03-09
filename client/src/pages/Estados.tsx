/*
 * Estados.tsx — Visão macro por estados do Brasil
 * Gráficos reativos: mudam conforme bioma e estado selecionado
 * Seletor de ano na tabela controla a coluna e a ordenação
 */
import Layout from "@/components/Layout";
import BrazilMap from "@/components/BrazilMap";
import { useState, useMemo, useRef, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area, Cell
} from "recharts";
import { Search, ArrowUpDown, Filter, X, TrendingDown, TrendingUp, TreePine, Calendar } from "lucide-react";
import desmatamentoData from "@/data/desmatamento.json";

const CERRADO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028375704/duTvPYuJ7tMWZ778dehMaL/cerrado-landscape-KwYgs7SrYFjYGrh5EpFANX.webp";

const biomas = ["Todos", "Amazônia", "Cerrado", "Mata Atlântica", "Caatinga", "Pantanal", "Pampa"];
const ANOS = ["2008","2009","2010","2011","2012","2013","2014","2015","2016","2017","2018","2019","2020","2021","2022","2023","2024"];

export default function Estados() {
  const [selectedBioma, setSelectedBioma] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"nome" | "ano" | "acumulado">("ano");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedEstado, setSelectedEstado] = useState<string | null>(null);
  const [tableYear, setTableYear] = useState("2024");
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedEstado && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedEstado]);

  // Filtragem e ordenação da tabela
  const filteredEstados = useMemo(() => {
    let filtered = desmatamentoData.estados;
    if (selectedBioma !== "Todos") {
      filtered = filtered.filter((e) => e.bioma_principal.includes(selectedBioma));
    }
    if (searchTerm) {
      filtered = filtered.filter((e) =>
        e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.sigla.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === "nome") return sortDir === "asc" ? a.nome.localeCompare(b.nome) : b.nome.localeCompare(a.nome);
      if (sortBy === "ano") {
        const va = a.desmatamento_anual[tableYear as keyof typeof a.desmatamento_anual] || 0;
        const vb = b.desmatamento_anual[tableYear as keyof typeof b.desmatamento_anual] || 0;
        return sortDir === "asc" ? va - vb : vb - va;
      }
      return sortDir === "asc" ? a.desmatamento_acumulado_km2 - b.desmatamento_acumulado_km2 : b.desmatamento_acumulado_km2 - a.desmatamento_acumulado_km2;
    });
    return filtered;
  }, [selectedBioma, searchTerm, sortBy, sortDir, tableYear]);

  // Gráfico de evolução — reativo ao bioma selecionado
  const serieEvolucao = useMemo(() => {
    const estadosFiltrados = selectedBioma === "Todos"
      ? desmatamentoData.estados
      : desmatamentoData.estados.filter(e => e.bioma_principal.includes(selectedBioma));

    return ANOS.map((ano) => {
      const total = estadosFiltrados.reduce((sum, e) => sum + (e.desmatamento_anual[ano as keyof typeof e.desmatamento_anual] || 0), 0);
      return { ano, total };
    });
  }, [selectedBioma]);

  // Ranking top 10 — reativo ao bioma e ano da tabela
  const rankingData = useMemo(() => {
    const estadosFiltrados = selectedBioma === "Todos"
      ? desmatamentoData.estados
      : desmatamentoData.estados.filter(e => e.bioma_principal.includes(selectedBioma));

    return [...estadosFiltrados]
      .sort((a, b) => (b.desmatamento_anual[tableYear as keyof typeof b.desmatamento_anual] || 0) - (a.desmatamento_anual[tableYear as keyof typeof a.desmatamento_anual] || 0))
      .slice(0, 10)
      .map((e) => ({
        nome: e.sigla,
        nomeCompleto: e.nome,
        desmatamento: e.desmatamento_anual[tableYear as keyof typeof e.desmatamento_anual] || 0,
      }));
  }, [selectedBioma, tableYear]);

  // Detalhe do estado selecionado
  const estadoDetail = selectedEstado
    ? desmatamentoData.estados.find((e) => e.sigla === selectedEstado)
    : null;

  const estadoSerie = useMemo(() => {
    if (!estadoDetail) return [];
    return Object.entries(estadoDetail.desmatamento_anual)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ano, val]) => ({ ano, desmatamento: val }));
  }, [estadoDetail]);

  const estadoEvitado = useMemo(() => {
    if (!estadoDetail?.desmatamento_evitado) return [];
    return Object.entries(estadoDetail.desmatamento_evitado)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ano, val]: [string, any]) => ({
        ano, esperado: val.esperado, observado: val.observado, evitado: val.evitado,
      }));
  }, [estadoDetail]);

  const estadoStats = useMemo(() => {
    if (!estadoDetail) return null;
    const vAno = estadoDetail.desmatamento_anual[tableYear as keyof typeof estadoDetail.desmatamento_anual] || 0;
    const prevYear = String(Number(tableYear) - 1);
    const vPrev = estadoDetail.desmatamento_anual[prevYear as keyof typeof estadoDetail.desmatamento_anual] || 0;
    const change = vPrev > 0 ? ((vAno - vPrev) / vPrev * 100) : 0;
    const totalEvitado = Object.values(estadoDetail.desmatamento_evitado || {})
      .reduce((s: number, v: any) => s + (v.evitado > 0 ? v.evitado : 0), 0);
    return { vAno, change, totalEvitado, prevYear };
  }, [estadoDetail, tableYear]);

  const toggleSort = (col: "nome" | "ano" | "acumulado") => {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const handleSelectEstado = (sigla: string) => {
    setSelectedEstado(selectedEstado === sigla ? null : sigla);
  };

  const biomaLabel = selectedBioma === "Todos" ? "Nacional" : selectedBioma;

  return (
    <Layout>
      {/* Banner */}
      <section className="relative overflow-hidden" style={{ height: "280px" }}>
        <img src={CERRADO_IMG} alt="Cerrado" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.6))" }} />
        <div className="relative container flex flex-col justify-end h-full pb-10">
          <p className="text-sm font-semibold tracking-widest uppercase mb-2" style={{ color: "#a8d5a2" }}>Visão Macro</p>
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: "#fff", fontFamily: "'Merriweather', serif" }}>
            Desmatamento por Estado
          </h1>
          <p className="text-base mt-2" style={{ color: "rgba(255,255,255,0.8)", maxWidth: "600px" }}>
            Série histórica de 2008 a 2024 para todos os estados brasileiros, com cálculo de desmatamento evitado.
          </p>
        </div>
      </section>

      {/* Filtros de bioma — acima do mapa */}
      <section className="pt-10 pb-2">
        <div className="container">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter size={16} style={{ color: "#9a958e" }} />
            <span className="text-sm font-medium" style={{ color: "#5a5448" }}>Filtrar por bioma:</span>
            {biomas.map((b) => (
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
          </div>
        </div>
      </section>

      {/* Mapa + Gráfico de Evolução */}
      <section className="py-6">
        <div className="container">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <BrazilMap
              estados={desmatamentoData.estados as any}
              onSelectEstado={handleSelectEstado}
              selectedEstado={selectedEstado}
              selectedBioma={selectedBioma}
              selectedYear={tableYear}
              onYearChange={setTableYear}
            />

            {/* Gráfico de evolução — reativo ao bioma */}
            <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
              <div className="px-5 pt-5 pb-3">
                <h3 className="text-lg font-bold" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
                  Evolução do Desmatamento — {biomaLabel}
                </h3>
                <p className="text-sm" style={{ color: "#7a7568" }}>
                  Soma dos estados {selectedBioma !== "Todos" ? `do bioma ${selectedBioma}` : "do Brasil"}, 2008 a 2024
                </p>
              </div>
              <div className="px-3 pb-2">
                <ResponsiveContainer width="100%" height={340}>
                  <AreaChart data={serieEvolucao}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2E7D32" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dd" />
                    <XAxis dataKey="ano" tick={{ fontSize: 11, fill: "#7a7568" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#7a7568" }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                    <Tooltip
                      contentStyle={{ background: "#fff", border: "1px solid #e8e5dd", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(value: number) => [`${value.toLocaleString("pt-BR")} km²`, "Desmatamento"]}
                    />
                    <Area type="monotone" dataKey="total" stroke="#2E7D32" strokeWidth={2.5} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ranking Top 10 — reativo ao bioma e ano */}
      <section className="py-6">
        <div className="container">
          <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
            <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-lg font-bold" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
                  Top 10 Estados — {biomaLabel} — {tableYear}
                </h3>
                <p className="text-sm" style={{ color: "#7a7568" }}>Maiores desmatadores no ano selecionado</p>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} style={{ color: "#7a7568" }} />
                <select
                  value={tableYear}
                  onChange={(e) => setTableYear(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-sm"
                  style={{ background: "#f4f3ee", border: "1px solid #e8e5dd", color: "#2c2417" }}
                >
                  {ANOS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div className="px-3 pb-4">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={rankingData} layout="vertical" margin={{ left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dd" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#7a7568" }} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: "#5a5448" }} width={40} />
                  <Tooltip
                    contentStyle={{ background: "#fff", border: "1px solid #e8e5dd", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(value: number, _: any, props: any) => [`${value.toLocaleString("pt-BR")} km²`, props.payload.nomeCompleto]}
                  />
                  <Bar dataKey="desmatamento" radius={[0, 4, 4, 0]}>
                    {rankingData.map((_, i) => (
                      <Cell key={i} fill={i < 3 ? "#BF360C" : i < 6 ? "#C8A951" : "#2E7D32"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Detalhe do estado selecionado */}
      {estadoDetail && estadoStats && (
        <section className="py-8" ref={detailRef} style={{ background: "#f9f8f5" }}>
          <div className="container">
            <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
              <div className="px-6 py-5 flex items-center justify-between flex-wrap gap-3" style={{ borderBottom: "1px solid #f0ede7" }}>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
                    {estadoDetail.nome} ({estadoDetail.sigla})
                  </h3>
                  <p className="text-sm mt-1" style={{ color: "#7a7568" }}>
                    Bioma: {estadoDetail.bioma_principal} — Acumulado: {estadoDetail.desmatamento_acumulado_km2.toLocaleString("pt-BR")} km²
                  </p>
                </div>
                <button onClick={() => setSelectedEstado(null)} className="p-2 rounded-lg" style={{ color: "#7a7568", background: "#f4f3ee" }}>
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6 py-5" style={{ borderBottom: "1px solid #f0ede7" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(191,54,12,0.08)" }}>
                    <TreePine size={18} style={{ color: "#BF360C" }} />
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: "#2c2417" }}>{estadoStats.vAno.toLocaleString("pt-BR")} km²</p>
                    <p className="text-xs" style={{ color: "#9a958e" }}>Desmatamento {tableYear}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: estadoStats.change < 0 ? "rgba(46,125,50,0.08)" : "rgba(191,54,12,0.08)" }}>
                    {estadoStats.change < 0 ? <TrendingDown size={18} style={{ color: "#2E7D32" }} /> : <TrendingUp size={18} style={{ color: "#BF360C" }} />}
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: estadoStats.change < 0 ? "#2E7D32" : "#BF360C" }}>
                      {estadoStats.change < 0 ? "↓" : "↑"} {Math.abs(estadoStats.change).toFixed(1)}%
                    </p>
                    <p className="text-xs" style={{ color: "#9a958e" }}>Variação {estadoStats.prevYear}→{tableYear}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(46,125,50,0.08)" }}>
                    <TreePine size={18} style={{ color: "#2E7D32" }} />
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: "#2E7D32" }}>{Math.round(estadoStats.totalEvitado).toLocaleString("pt-BR")} km²</p>
                    <p className="text-xs" style={{ color: "#9a958e" }}>Total evitado (acumulado)</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                <div>
                  <h4 className="text-sm font-semibold mb-4" style={{ color: "#5a5448" }}>Série Histórica de Desmatamento (km²)</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={estadoSerie}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dd" />
                      <XAxis dataKey="ano" tick={{ fontSize: 11, fill: "#7a7568" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#7a7568" }} />
                      <Tooltip
                        contentStyle={{ background: "#fff", border: "1px solid #e8e5dd", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(value: number) => [`${value.toLocaleString("pt-BR")} km²`, "Desmatamento"]}
                      />
                      <Bar dataKey="desmatamento" radius={[4, 4, 0, 0]}>
                        {estadoSerie.map((entry) => (
                          <Cell key={entry.ano} fill={entry.ano === tableYear ? "#BF360C" : "#8D6E63"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-4" style={{ color: "#5a5448" }}>Desmatamento Evitado (Esperado vs Observado)</h4>
                  {estadoEvitado.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={estadoEvitado}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dd" />
                        <XAxis dataKey="ano" tick={{ fontSize: 11, fill: "#7a7568" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#7a7568" }} />
                        <Tooltip
                          contentStyle={{ background: "#fff", border: "1px solid #e8e5dd", borderRadius: "8px", fontSize: "12px" }}
                          formatter={(value: number, name: string) => {
                            const label = name === "esperado" ? "Esperado" : name === "observado" ? "Observado" : "Evitado";
                            return [`${value.toLocaleString("pt-BR")} km²`, label];
                          }}
                        />
                        <Legend formatter={(v) => v === "esperado" ? "Esperado" : v === "observado" ? "Observado" : "Evitado"} />
                        <Line type="monotone" dataKey="esperado" stroke="#C8A951" strokeWidth={2.5} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="observado" stroke="#BF360C" strokeWidth={2.5} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="evitado" stroke="#2E7D32" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px]" style={{ color: "#9a958e" }}>
                      <p className="text-sm">Dados insuficientes para cálculo do desmatamento evitado.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Tabela com seletor de ano */}
      <section className="py-8">
        <div className="container">
          <div className="flex flex-wrap gap-3 mb-6 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9a958e" }} />
              <input
                type="text"
                placeholder="Buscar estado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm"
                style={{ background: "#fff", border: "1px solid #e8e5dd", color: "#2c2417" }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={14} style={{ color: "#7a7568" }} />
              <span className="text-sm" style={{ color: "#7a7568" }}>Ano:</span>
              <select
                value={tableYear}
                onChange={(e) => setTableYear(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-sm"
                style={{ background: "#f4f3ee", border: "1px solid #e8e5dd", color: "#2c2417" }}
              >
                {ANOS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#f9f8f5", borderBottom: "1px solid #e8e5dd" }}>
                    <th className="text-left px-4 py-3 font-semibold cursor-pointer select-none" style={{ color: "#5a5448" }} onClick={() => toggleSort("nome")}>
                      <span className="inline-flex items-center gap-1">Estado <ArrowUpDown size={12} /></span>
                    </th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>UF</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Bioma</th>
                    <th className="text-right px-4 py-3 font-semibold cursor-pointer select-none" style={{ color: "#5a5448" }} onClick={() => toggleSort("ano")}>
                      <span className="inline-flex items-center gap-1 justify-end">{tableYear} (km²) <ArrowUpDown size={12} /></span>
                    </th>
                    <th className="text-right px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Var. vs {Number(tableYear) - 1}</th>
                    <th className="text-right px-4 py-3 font-semibold cursor-pointer select-none" style={{ color: "#5a5448" }} onClick={() => toggleSort("acumulado")}>
                      <span className="inline-flex items-center gap-1 justify-end">Acumulado (km²) <ArrowUpDown size={12} /></span>
                    </th>
                    <th className="text-center px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEstados.map((estado) => {
                    const vAno = estado.desmatamento_anual[tableYear as keyof typeof estado.desmatamento_anual] || 0;
                    const prevYear = String(Number(tableYear) - 1);
                    const vPrev = estado.desmatamento_anual[prevYear as keyof typeof estado.desmatamento_anual] || 0;
                    const change = vPrev > 0 ? ((vAno - vPrev) / vPrev * 100).toFixed(1) : "0.0";
                    const isDown = Number(change) < 0;
                    const isActive = selectedEstado === estado.sigla;
                    return (
                      <tr
                        key={estado.sigla}
                        className="transition-colors"
                        style={{
                          borderBottom: "1px solid #f0ede7",
                          background: isActive ? "rgba(46,125,50,0.04)" : "transparent",
                        }}
                        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#fafaf5"; }}
                        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? "rgba(46,125,50,0.04)" : "transparent"; }}
                      >
                        <td className="px-4 py-3 font-medium" style={{ color: "#2c2417" }}>{estado.nome}</td>
                        <td className="px-4 py-3" style={{ color: "#7a7568" }}>{estado.sigla}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(46,125,50,0.08)", color: "#2E7D32" }}>
                            {estado.bioma_principal}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold" style={{ color: "#2c2417" }}>
                          {vAno.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-medium" style={{ color: isDown ? "#2E7D32" : "#BF360C" }}>
                          {isDown ? "↓" : "↑"} {change}%
                        </td>
                        <td className="px-4 py-3 text-right" style={{ color: "#7a7568" }}>
                          {estado.desmatamento_acumulado_km2.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleSelectEstado(estado.sigla)}
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
          </div>
        </div>
      </section>
    </Layout>
  );
}
