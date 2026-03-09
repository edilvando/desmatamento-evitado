/*
 * Estados.tsx — Visão macro por estados do Brasil
 * Gráficos de série temporal, ranking, filtros por bioma
 */
import Layout from "@/components/Layout";
import { useState, useMemo } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";
import { Search, ArrowUpDown, Filter } from "lucide-react";
import desmatamentoData from "@/data/desmatamento.json";

const CERRADO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028375704/duTvPYuJ7tMWZ778dehMaL/cerrado-landscape-KwYgs7SrYFjYGrh5EpFANX.webp";

const biomas = ["Todos", "Amazônia", "Cerrado", "Mata Atlântica", "Caatinga", "Pantanal", "Pampa"];

export default function Estados() {
  const [selectedBioma, setSelectedBioma] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"nome" | "2024" | "acumulado">("2024");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedEstado, setSelectedEstado] = useState<string | null>(null);

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
      let va: number, vb: number;
      if (sortBy === "nome") return sortDir === "asc" ? a.nome.localeCompare(b.nome) : b.nome.localeCompare(a.nome);
      if (sortBy === "2024") { va = a.desmatamento_anual["2024"] || 0; vb = b.desmatamento_anual["2024"] || 0; }
      else { va = a.desmatamento_acumulado_km2; vb = b.desmatamento_acumulado_km2; }
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return filtered;
  }, [selectedBioma, searchTerm, sortBy, sortDir]);

  // Dados agregados para gráfico de série temporal
  const serieNacional = useMemo(() => {
    const anos = ["2008","2009","2010","2011","2012","2013","2014","2015","2016","2017","2018","2019","2020","2021","2022","2023","2024"];
    return anos.map((ano) => {
      const total = desmatamentoData.estados.reduce((sum, e) => sum + (e.desmatamento_anual[ano as keyof typeof e.desmatamento_anual] || 0), 0);
      return { ano, total };
    });
  }, []);

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
        ano,
        esperado: val.esperado,
        observado: val.observado,
        evitado: val.evitado,
      }));
  }, [estadoDetail]);

  const toggleSort = (col: "nome" | "2024" | "acumulado") => {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

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

      {/* Gráfico nacional */}
      <section className="py-12">
        <div className="container">
          <h2 className="text-2xl font-bold mb-6" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
            Evolução Nacional do Desmatamento
          </h2>
          <div className="rounded-xl p-6" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={serieNacional}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2E7D32" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dd" />
                <XAxis dataKey="ano" tick={{ fontSize: 12, fill: "#7a7568" }} />
                <YAxis tick={{ fontSize: 12, fill: "#7a7568" }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid #e8e5dd", borderRadius: "8px", fontSize: "13px" }}
                  formatter={(value: number) => [`${value.toLocaleString("pt-BR")} km²`, "Desmatamento"]}
                />
                <Area type="monotone" dataKey="total" stroke="#2E7D32" strokeWidth={2.5} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Filtros e tabela */}
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
                style={{ background: "#fff", border: "1px solid #e8e5dd", color: "#2c2417", outline: "none" }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} style={{ color: "#9a958e" }} />
              {biomas.map((b) => (
                <button
                  key={b}
                  onClick={() => setSelectedBioma(b)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
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

          {/* Tabela */}
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
                    <th className="text-right px-4 py-3 font-semibold cursor-pointer select-none" style={{ color: "#5a5448" }} onClick={() => toggleSort("2024")}>
                      <span className="inline-flex items-center gap-1 justify-end">2024 (km²) <ArrowUpDown size={12} /></span>
                    </th>
                    <th className="text-right px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Var. vs 2023</th>
                    <th className="text-right px-4 py-3 font-semibold cursor-pointer select-none" style={{ color: "#5a5448" }} onClick={() => toggleSort("acumulado")}>
                      <span className="inline-flex items-center gap-1 justify-end">Acumulado (km²) <ArrowUpDown size={12} /></span>
                    </th>
                    <th className="text-center px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEstados.map((estado) => {
                    const v24 = estado.desmatamento_anual["2024"] || 0;
                    const v23 = estado.desmatamento_anual["2023"] || 0;
                    const change = v23 > 0 ? ((v24 - v23) / v23 * 100).toFixed(1) : "0.0";
                    const isDown = Number(change) < 0;
                    return (
                      <tr key={estado.sigla} className="transition-colors" style={{ borderBottom: "1px solid #f0ede7" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#fafaf5")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td className="px-4 py-3 font-medium" style={{ color: "#2c2417" }}>{estado.nome}</td>
                        <td className="px-4 py-3" style={{ color: "#7a7568" }}>{estado.sigla}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(46,125,50,0.08)", color: "#2E7D32" }}>
                            {estado.bioma_principal}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold" style={{ color: "#2c2417", fontFamily: "'Source Sans 3', sans-serif" }}>
                          {v24.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-medium" style={{ color: isDown ? "#2E7D32" : "#BF360C" }}>
                          {isDown ? "↓" : "↑"} {change}%
                        </td>
                        <td className="px-4 py-3 text-right" style={{ color: "#7a7568" }}>
                          {estado.desmatamento_acumulado_km2.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setSelectedEstado(selectedEstado === estado.sigla ? null : estado.sigla)}
                            className="text-xs px-3 py-1 rounded-md font-medium transition-all"
                            style={{
                              background: selectedEstado === estado.sigla ? "#2E7D32" : "rgba(46,125,50,0.08)",
                              color: selectedEstado === estado.sigla ? "#fff" : "#2E7D32",
                            }}
                          >
                            {selectedEstado === estado.sigla ? "Fechar" : "Ver"}
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

      {/* Detalhe do estado selecionado */}
      {estadoDetail && (
        <section className="py-8">
          <div className="container">
            <div className="rounded-xl p-6" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
              <h3 className="text-xl font-bold mb-6" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
                {estadoDetail.nome} ({estadoDetail.sigla}) — Análise Detalhada
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-sm font-semibold mb-4" style={{ color: "#5a5448" }}>Série Histórica de Desmatamento</h4>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={estadoSerie}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dd" />
                      <XAxis dataKey="ano" tick={{ fontSize: 11, fill: "#7a7568" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#7a7568" }} />
                      <Tooltip
                        contentStyle={{ background: "#fff", border: "1px solid #e8e5dd", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(value: number) => [`${value.toLocaleString("pt-BR")} km²`, "Desmatamento"]}
                      />
                      <Bar dataKey="desmatamento" fill="#2E7D32" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-4" style={{ color: "#5a5448" }}>Desmatamento Evitado (Esperado vs Observado)</h4>
                  {estadoEvitado.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
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
                        <Legend formatter={(value) => value === "esperado" ? "Esperado" : value === "observado" ? "Observado" : "Evitado"} />
                        <Line type="monotone" dataKey="esperado" stroke="#C8A951" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="observado" stroke="#BF360C" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="evitado" stroke="#2E7D32" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm" style={{ color: "#9a958e" }}>Dados insuficientes para cálculo.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}
