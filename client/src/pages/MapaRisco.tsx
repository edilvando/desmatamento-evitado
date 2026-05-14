/**
 * MapaRisco.tsx — Visualização do raster de risco ACEU e desmatamento evitado
 * Mapa interativo com tiles + painel de estatísticas por município
 */
import Layout from "@/components/Layout";
import RasterMap from "@/components/RasterMap";
import { useState, useEffect, useMemo } from "react";
import { Layers, Info, ZoomIn, ShieldCheck, BarChart3, X } from "lucide-react";

interface MunicipioStats {
  cod_municipio: string;
  nome_municipio: string;
  area_total_ha: number;
  floresta_referencia_ha: number;
  floresta_atual_ha: number;
  desmatado_ha: number;
  perda_esperada_ha: number;
  desmatamento_evitado_ha: number;
  taxa_protecao_pct: number;
  classe_risco_1_ha: number;
  classe_risco_2_ha: number;
  classe_risco_3_ha: number;
  classe_risco_4_ha: number;
  classe_risco_5_ha: number;
}

function MiniBarChart({ dados }: { dados: { label: string; valor: number; cor: string }[] }) {
  const maxValor = Math.max(...dados.map((d) => d.valor), 1);
  return (
    <div className="space-y-1.5">
      {dados.map((d) => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-24 truncate">{d.label}</span>
          <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
            <div
              className="h-full rounded transition-all duration-500"
              style={{
                width: `${(d.valor / maxValor) * 100}%`,
                backgroundColor: d.cor,
              }}
            />
          </div>
          <span className="text-xs text-gray-600 w-16 text-right">
            {d.valor.toLocaleString("pt-BR")} ha
          </span>
        </div>
      ))}
    </div>
  );
}

function PainelEstatisticas({
  stats,
  onClose,
}: {
  stats: MunicipioStats;
  onClose: () => void;
}) {
  const dadosRisco = useMemo(
    () => [
      { label: "Muito baixo", valor: stats.classe_risco_1_ha, cor: "#228B22" },
      { label: "Baixo", valor: stats.classe_risco_2_ha, cor: "#90EE90" },
      { label: "Médio", valor: stats.classe_risco_3_ha, cor: "#CCCC00" },
      { label: "Alto", valor: stats.classe_risco_4_ha, cor: "#FFA500" },
      { label: "Muito alto", valor: stats.classe_risco_5_ha, cor: "#DC1414" },
    ],
    [stats]
  );

  const dadosBalanco = useMemo(
    () => [
      { label: "Floresta atual", valor: stats.floresta_atual_ha, cor: "#228B22" },
      { label: "Desm. evitado", valor: stats.desmatamento_evitado_ha, cor: "#008000" },
      { label: "Desmatado", valor: stats.desmatado_ha, cor: "#DC1414" },
    ],
    [stats]
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-md">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-gray-800">{stats.nome_municipio}</h3>
          <p className="text-xs text-gray-400">IBGE: {stats.cod_municipio}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Indicadores principais */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-green-50 rounded p-2 text-center">
          <p className="text-lg font-semibold text-green-800">
            {stats.desmatamento_evitado_ha.toLocaleString("pt-BR")}
          </p>
          <p className="text-xs text-green-600">ha evitados</p>
        </div>
        <div className="bg-blue-50 rounded p-2 text-center">
          <p className="text-lg font-semibold text-blue-800">
            {stats.taxa_protecao_pct}%
          </p>
          <p className="text-xs text-blue-600">taxa proteção</p>
        </div>
      </div>

      {/* Balanço florestal */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
          <BarChart3 className="w-3 h-3" /> Balanço Florestal
        </p>
        <MiniBarChart dados={dadosBalanco} />
      </div>

      {/* Distribuição por classe de risco */}
      <div>
        <p className="text-xs font-medium text-gray-600 mb-2">
          Distribuição por Classe de Risco
        </p>
        <MiniBarChart dados={dadosRisco} />
      </div>

      {/* Resumo numérico */}
      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-0.5">
        <div className="flex justify-between">
          <span>Área total:</span>
          <span>{stats.area_total_ha.toLocaleString("pt-BR")} ha</span>
        </div>
        <div className="flex justify-between">
          <span>Floresta referência (2008):</span>
          <span>{stats.floresta_referencia_ha.toLocaleString("pt-BR")} ha</span>
        </div>
        <div className="flex justify-between">
          <span>Perda esperada (modelo):</span>
          <span>{stats.perda_esperada_ha.toLocaleString("pt-BR")} ha</span>
        </div>
        <div className="flex justify-between">
          <span>Perda observada:</span>
          <span>{stats.desmatado_ha.toLocaleString("pt-BR")} ha</span>
        </div>
      </div>
    </div>
  );
}

export default function MapaRisco() {
  const [selectedMunicipio, setSelectedMunicipio] = useState<{
    codigo: string;
    nome: string;
  } | null>(null);

  const [allStats, setAllStats] = useState<MunicipioStats[]>([]);
  const [municipioStats, setMunicipioStats] = useState<MunicipioStats | null>(null);

  const basePath = import.meta.env.BASE_URL || "/";

  // Carregar estatísticas do JSON gerado pelo pipeline
  useEffect(() => {
    fetch(`${basePath}tiles/estatisticas_municipios.json`)
      .then((r) => {
        if (r.ok) return r.json();
        return null;
      })
      .then((data) => {
        if (data) setAllStats(data);
      })
      .catch(() => {});
  }, []);

  // Quando um município é selecionado, buscar suas estatísticas
  useEffect(() => {
    if (!selectedMunicipio || allStats.length === 0) {
      setMunicipioStats(null);
      return;
    }
    const found = allStats.find(
      (s) => s.cod_municipio === selectedMunicipio.codigo
    );
    setMunicipioStats(found || null);
  }, [selectedMunicipio, allStats]);

  return (
    <Layout>
      {/* Header */}
      <section className="bg-gradient-to-b from-[#1a3a2a] to-[#2d5a3f] text-white py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Layers className="w-6 h-6 text-green-300" />
            <span className="text-green-200 text-sm tracking-wide uppercase">
              Modelo ACEU — Resolução 30m
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">
            Mapa de Risco e Desmatamento Evitado
          </h1>
          <p className="text-green-100/80 max-w-2xl text-lg">
            Visualização pixel a pixel do risco de desmatamento e das áreas onde o
            desmatamento foi efetivamente evitado no Mato Grosso. Alterne entre as
            camadas e clique nos municípios para ver estatísticas detalhadas.
          </p>
        </div>
      </section>

      {/* Instruções */}
      <section className="bg-amber-50 border-b border-amber-200 py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3 text-amber-800 text-sm">
          <Info className="w-4 h-4 flex-shrink-0" />
          <p>
            Use o scroll para dar zoom. Alterne entre as camadas no controle superior
            direito do mapa. Clique em um município para ver estatísticas de
            desmatamento evitado em hectares.
          </p>
        </div>
      </section>

      {/* Mapa */}
      <section className="py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Mapa principal */}
            <div className="lg:col-span-3">
              <RasterMap
                className="h-[600px] rounded-lg shadow-md border border-gray-200"
                showLegend={true}
                showMunicipios={true}
                camadaInicial="risco"
                onMunicipioClick={(codigo, nome) =>
                  setSelectedMunicipio({ codigo, nome })
                }
              />
            </div>

            {/* Painel lateral */}
            <div className="space-y-4">
              {/* Painel de estatísticas do município */}
              {municipioStats ? (
                <PainelEstatisticas
                  stats={municipioStats}
                  onClose={() => setSelectedMunicipio(null)}
                />
              ) : selectedMunicipio ? (
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-800">
                      {selectedMunicipio.nome}
                    </h3>
                    <button
                      onClick={() => setSelectedMunicipio(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Código IBGE: {selectedMunicipio.codigo}
                  </p>
                  <p className="text-sm text-gray-400 mt-2 italic">
                    Estatísticas disponíveis após execução do pipeline.
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-4 text-center">
                  <BarChart3 className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    Clique em um município no mapa para ver estatísticas detalhadas.
                  </p>
                </div>
              )}

              {/* Card Risco */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <ZoomIn className="w-4 h-4 text-orange-600" />
                  Camada: Risco
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    Probabilidade de desmatamento em 20 anos (ACEU):
                  </p>
                  <ul className="list-none space-y-1 mt-2">
                    <li className="flex items-start gap-2">
                      <span className="text-green-700 font-medium">A</span>
                      <span>Acessibilidade (distância a rodovias)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-700 font-medium">C</span>
                      <span>Cultivabilidade (pressão agropecuária)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-700 font-medium">E</span>
                      <span>Extraibilidade (recursos florestais/minerais)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-700 font-medium">U</span>
                      <span>Proteção (UCs, TIs, Quilombos)</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Card Desmatamento Evitado */}
              <div className="bg-white rounded-lg border border-green-200 p-4 shadow-sm">
                <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-700" />
                  Camada: Desmatamento Evitado
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    Cruzamento do risco ACEU com o desmatamento observado (PRODES/MapBiomas).
                  </p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#008000" }} />
                      <span className="text-xs">Desmatamento evitado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#005000" }} />
                      <span className="text-xs">Fortemente evitado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#DC1414" }} />
                      <span className="text-xs">Perda confirmada</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#800080" }} />
                      <span className="text-xs">Perda inesperada</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fórmula */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <h4 className="font-medium text-gray-700 text-sm mb-2">Fórmula</h4>
                <code className="text-xs text-gray-600 block bg-white p-2 rounded border">
                  R(x) = A(x) + C(x) + E(x) - U(x)
                </code>
                <p className="text-xs text-gray-500 mt-2">
                  Classificado em quintis sobre pixels de floresta de referência.
                  Desmatamento evitado = floresta mantida em pixels de risco alto.
                </p>
              </div>

              {/* Fonte */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <h4 className="font-medium text-gray-700 text-sm mb-2">Referências</h4>
                <p className="text-xs text-gray-500">
                  ECOMETRICA (2019). The Hectares Indicator Methods and Guidance. Version 2.0.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  VENDRUSCULO et al. (2019). Aplicação da metodologia do Hectare Indicator.
                  Embrapa Informática Agropecuária.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
