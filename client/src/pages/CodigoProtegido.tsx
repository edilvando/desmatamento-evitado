/*
 * CodigoProtegido.tsx — Documentação Técnica e Código Python
 * Área protegida com:
 *   - Memorial de Cálculo (passo a passo, shapefiles, anos, racional, fontes)
 *   - Código Python completo documentado
 */
import Layout from "@/components/Layout";
import { useState } from "react";
import { Lock, Unlock, FileText, Code, ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const SENHA_CORRETA = "123Troc@r";

type TabId = "memorial" | "codigo";

export default function CodigoProtegido() {
  const [autenticado, setAutenticado] = useState(false);
  const [senha, setSenha] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("memorial");
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleLogin = () => {
    if (senha === SENHA_CORRETA) {
      setAutenticado(true);
    } else {
      toast.error("Senha incorreta");
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Copiado!");
  };

  if (!autenticado) {
    return (
      <Layout>
        <section className="py-20">
          <div className="container max-w-md mx-auto text-center">
            <div className="rounded-xl p-8" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
              <Lock size={40} className="mx-auto mb-4" style={{ color: "#2E7D32" }} />
              <h1 className="text-2xl font-bold mb-2" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
                Documentação Técnica
              </h1>
              <p className="text-sm mb-6" style={{ color: "#7a7568" }}>
                Acesso restrito. Insira a senha para visualizar o memorial de cálculo e o código-fonte do pipeline.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="Senha"
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm"
                  style={{ background: "#f9f8f5", border: "1px solid #e8e5dd", color: "#2c2417" }}
                />
                <button
                  onClick={handleLogin}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: "#2E7D32", color: "#fff" }}
                >
                  Entrar
                </button>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <section className="py-10" style={{ background: "#f9f8f5", borderBottom: "1px solid #e8e5dd" }}>
        <div className="container">
          <div className="flex items-center gap-3 mb-4">
            <Unlock size={20} style={{ color: "#2E7D32" }} />
            <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: "rgba(46,125,50,0.08)", color: "#2E7D32" }}>
              Acesso autorizado
            </span>
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
            Documentação Técnica — Desmatamento Evitado
          </h1>
          <p className="text-base" style={{ color: "#7a7568", maxWidth: "750px" }}>
            Memorial de cálculo e código-fonte do pipeline de geoprocessamento baseado na metodologia Hectares Indicator (ECOMETRICA, 2018; VENDRUSCULO et al., 2019).
          </p>
        </div>
      </section>

      {/* Tabs */}
      <section className="border-b" style={{ borderColor: "#e8e5dd", background: "#fff" }}>
        <div className="container flex gap-0">
          <button
            onClick={() => setActiveTab("memorial")}
            className="px-5 py-3 text-sm font-medium border-b-2 transition-colors"
            style={{
              color: activeTab === "memorial" ? "#2E7D32" : "#7a7568",
              borderColor: activeTab === "memorial" ? "#2E7D32" : "transparent",
            }}
          >
            <FileText size={14} className="inline mr-2" />
            Memorial de Cálculo
          </button>
          <button
            onClick={() => setActiveTab("codigo")}
            className="px-5 py-3 text-sm font-medium border-b-2 transition-colors"
            style={{
              color: activeTab === "codigo" ? "#2E7D32" : "#7a7568",
              borderColor: activeTab === "codigo" ? "#2E7D32" : "transparent",
            }}
          >
            <Code size={14} className="inline mr-2" />
            Código Python
          </button>
        </div>
      </section>

      {/* Content */}
      {activeTab === "memorial" ? <MemorialCalculo expandedSections={expandedSections} toggleSection={toggleSection} /> : <CodigoPython handleCopy={handleCopy} copiedId={copiedId} />}
    </Layout>
  );
}

/* ============================================================
   MEMORIAL DE CÁLCULO
   ============================================================ */
function MemorialCalculo({ expandedSections, toggleSection }: { expandedSections: string[]; toggleSection: (id: string) => void }) {
  return (
    <div className="py-8">
      <div className="container max-w-4xl">

        {/* Introdução */}
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-4" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
            1. Visão Geral da Metodologia
          </h2>
          <div className="text-sm leading-relaxed" style={{ color: "#5a5448" }}>
            <p className="mb-3">
              O cálculo de desmatamento evitado segue a metodologia Hectares Indicator, desenvolvida pela Ecometrica (TIPPER; MOREL, 2016; ECOMETRICA, 2018) e adaptada para o bioma Cerrado brasileiro por Vendrusculo et al. (2019). A abordagem estima a probabilidade de desmatamento de cada pixel florestal com base em quatro componentes de risco, e compara a perda esperada com a perda observada para quantificar o desmatamento evitado.
            </p>
            <p className="mb-3">
              A fórmula central é R(x) = A(x) + C(x) + E(x), onde cada componente varia de 1 a 5. Pixels em áreas protegidas (U=1) são reclassificados para risco mínimo (classe 1) após o cálculo de R, conforme a abordagem adotada no caso de estudo do Cerrado (ECOMETRICA, 2018, Appendix B). O risco bruto R varia de 3 a 15 e é classificado em 5 classes por quintis sobre a distribuição de pixels florestais de referência.
            </p>
            <p>
              Cada classe de risco k recebe uma probabilidade de perda em 20 anos (alpha_k): classe 1 = 10%, classe 2 = 30%, classe 3 = 50%, classe 4 = 70%, classe 5 = 90%. Estas probabilidades são definidas pela metodologia original (ECOMETRICA, 2018, Section S2.2d).
            </p>
          </div>
        </div>

        {/* Dados de entrada */}
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-4" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
            2. Dados de Entrada Utilizados
          </h2>
          <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f9f8f5", borderBottom: "1px solid #e8e5dd" }}>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Dado</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Fonte</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Arquivo</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Ano/Versão</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #f0ede7" }}>
                  <td className="px-4 py-3" style={{ color: "#2c2417" }}>Cobertura do solo (T0)</td>
                  <td className="px-4 py-3" style={{ color: "#5a5448" }}>MapBiomas Coleção 8.0</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "#7a7568" }}>brazil_coverage_2008.tif</td>
                  <td className="px-4 py-3" style={{ color: "#5a5448" }}>2008</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f0ede7" }}>
                  <td className="px-4 py-3" style={{ color: "#2c2417" }}>Cobertura do solo (T1)</td>
                  <td className="px-4 py-3" style={{ color: "#5a5448" }}>MapBiomas Coleção 8.0</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "#7a7568" }}>brazil_coverage_2022.tif</td>
                  <td className="px-4 py-3" style={{ color: "#5a5448" }}>2022</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f0ede7" }}>
                  <td className="px-4 py-3" style={{ color: "#2c2417" }}>Rodovias</td>
                  <td className="px-4 py-3" style={{ color: "#5a5448" }}>SNV/DNIT ou Geofabrik/OSM</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "#7a7568" }}>gis_osm_roads_free_1.shp</td>
                  <td className="px-4 py-3" style={{ color: "#5a5448" }}>2024</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f0ede7" }}>
                  <td className="px-4 py-3" style={{ color: "#2c2417" }}>Terras Indígenas</td>
                  <td className="px-4 py-3" style={{ color: "#5a5448" }}>FUNAI (GeoServer WFS)</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "#7a7568" }}>tis_poligonais.shp</td>
                  <td className="px-4 py-3" style={{ color: "#5a5448" }}>2024</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f0ede7" }}>
                  <td className="px-4 py-3" style={{ color: "#2c2417" }}>Unidades de Conservação</td>
                  <td className="px-4 py-3" style={{ color: "#5a5448" }}>MMA / CNUC</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "#7a7568" }}>cnuc_2025_03.shp</td>
                  <td className="px-4 py-3" style={{ color: "#5a5448" }}>Mar/2025</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f0ede7" }}>
                  <td className="px-4 py-3" style={{ color: "#2c2417" }}>Processos minerários</td>
                  <td className="px-4 py-3" style={{ color: "#5a5448" }}>SIGMINE / ANM</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "#7a7568" }}>MT.shp</td>
                  <td className="px-4 py-3" style={{ color: "#5a5448" }}>2024</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f0ede7" }}>
                  <td className="px-4 py-3" style={{ color: "#2c2417" }}>Limite estadual MT</td>
                  <td className="px-4 py-3" style={{ color: "#5a5448" }}>IBGE (API)</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "#7a7568" }}>limite_mt.geojson</td>
                  <td className="px-4 py-3" style={{ color: "#5a5448" }}>2022</td>
                </tr>
                <tr>
                  <td className="px-4 py-3" style={{ color: "#2c2417" }}>Municípios MT</td>
                  <td className="px-4 py-3" style={{ color: "#5a5448" }}>IBGE (API)</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "#7a7568" }}>municipios_mt.geojson</td>
                  <td className="px-4 py-3" style={{ color: "#5a5448" }}>2022</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Parâmetros */}
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-4" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
            3. Parâmetros do Modelo
          </h2>
          <div className="rounded-xl p-5" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
            <table className="w-full text-sm">
              <tbody>
                <tr style={{ borderBottom: "1px solid #f0ede7" }}>
                  <td className="py-2 font-medium" style={{ color: "#2c2417" }}>Sistema de referência</td>
                  <td className="py-2" style={{ color: "#5a5448" }}>EPSG:31981 (SIRGAS 2000 / UTM 21S)</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f0ede7" }}>
                  <td className="py-2 font-medium" style={{ color: "#2c2417" }}>Resolução espacial</td>
                  <td className="py-2" style={{ color: "#5a5448" }}>30 metros (compatível com Landsat/MapBiomas)</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f0ede7" }}>
                  <td className="py-2 font-medium" style={{ color: "#2c2417" }}>Dimensão da grade</td>
                  <td className="py-2" style={{ color: "#5a5448" }}>41.775 x 39.540 pixels (1,65 bilhão de pixels)</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f0ede7" }}>
                  <td className="py-2 font-medium" style={{ color: "#2c2417" }}>Ano de referência (T0)</td>
                  <td className="py-2" style={{ color: "#5a5448" }}>2008</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f0ede7" }}>
                  <td className="py-2 font-medium" style={{ color: "#2c2417" }}>Ano de avaliação (T1)</td>
                  <td className="py-2" style={{ color: "#5a5448" }}>2022</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f0ede7" }}>
                  <td className="py-2 font-medium" style={{ color: "#2c2417" }}>Horizonte temporal</td>
                  <td className="py-2" style={{ color: "#5a5448" }}>20 anos (conforme Hectares Indicator)</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium" style={{ color: "#2c2417" }}>Classes florestais MapBiomas</td>
                  <td className="py-2" style={{ color: "#5a5448" }}>1 (Floresta), 3 (Formação Florestal)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Passo a passo dos cálculos */}
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-4" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
            4. Passo a Passo dos Cálculos
          </h2>

          {/* Etapa A */}
          <ExpandableSection
            id="calc-a"
            title="4.1. Componente A — Acessibilidade"
            expanded={expandedSections.includes("calc-a")}
            toggle={() => toggleSection("calc-a")}
          >
            <div className="text-sm leading-relaxed" style={{ color: "#5a5448" }}>
              <p className="mb-3">
                O componente A quantifica a pressão de desmatamento associada à proximidade de rodovias. A lógica é que áreas mais acessíveis (próximas a estradas) sofrem maior pressão de conversão, pois facilitam o transporte de madeira, insumos e produtos agropecuários (BARBER et al., 2014; LAURANCE et al., 2009).
              </p>
              <p className="mb-3">Procedimento:</p>
              <ol className="list-decimal pl-5 space-y-2 mb-3">
                <li>Carregar o shapefile de rodovias e reprojetar para EPSG:31981.</li>
                <li>Rasterizar as rodovias sobre a grade de referência (41.775 x 39.540 px, resolução 30m).</li>
                <li>Calcular a distância euclidiana de cada pixel à rodovia mais próxima (em metros).</li>
                <li>Reclassificar em 5 classes conforme limiares fixos:
                  <table className="mt-2 mb-2 w-full text-xs" style={{ border: "1px solid #e8e5dd" }}>
                    <thead><tr style={{ background: "#f9f8f5" }}><th className="px-3 py-1.5 text-left">Classe</th><th className="px-3 py-1.5 text-left">Distância</th><th className="px-3 py-1.5 text-left">Interpretação</th></tr></thead>
                    <tbody>
                      <tr style={{ borderTop: "1px solid #e8e5dd" }}><td className="px-3 py-1.5">5</td><td className="px-3 py-1.5">0 – 4.500 m</td><td className="px-3 py-1.5">Muito alta acessibilidade</td></tr>
                      <tr style={{ borderTop: "1px solid #e8e5dd" }}><td className="px-3 py-1.5">4</td><td className="px-3 py-1.5">4.500 – 9.000 m</td><td className="px-3 py-1.5">Alta acessibilidade</td></tr>
                      <tr style={{ borderTop: "1px solid #e8e5dd" }}><td className="px-3 py-1.5">3</td><td className="px-3 py-1.5">9.000 – 13.500 m</td><td className="px-3 py-1.5">Média acessibilidade</td></tr>
                      <tr style={{ borderTop: "1px solid #e8e5dd" }}><td className="px-3 py-1.5">2</td><td className="px-3 py-1.5">13.500 – 18.000 m</td><td className="px-3 py-1.5">Baixa acessibilidade</td></tr>
                      <tr style={{ borderTop: "1px solid #e8e5dd" }}><td className="px-3 py-1.5">1</td><td className="px-3 py-1.5">&gt; 18.000 m</td><td className="px-3 py-1.5">Muito baixa acessibilidade</td></tr>
                    </tbody>
                  </table>
                </li>
                <li>Aplicar máscara do estado (pixels fora do MT = 0).</li>
              </ol>
              <p className="text-xs italic" style={{ color: "#9a958e" }}>
                Racional: Os limiares de 4,5 km seguem a parametrização do Hectares Indicator para regiões tropicais (ECOMETRICA, 2018, Section S2.2d). A escolha de 18 km como limite superior é conservadora e alinhada com a literatura sobre fronteiras de desmatamento na Amazônia Legal (BARBER et al., 2014).
              </p>
            </div>
          </ExpandableSection>

          {/* Etapa C */}
          <ExpandableSection
            id="calc-c"
            title="4.2. Componente C — Cultivabilidade"
            expanded={expandedSections.includes("calc-c")}
            toggle={() => toggleSection("calc-c")}
          >
            <div className="text-sm leading-relaxed" style={{ color: "#5a5448" }}>
              <p className="mb-3">
                O componente C mede a pressão de conversão agropecuária no entorno de cada pixel florestal. A premissa é que áreas cercadas por uso agropecuário têm maior probabilidade de serem convertidas, dado o efeito de contágio espacial do desmatamento (ARIMA et al., 2011; SOARES-FILHO et al., 2006).
              </p>
              <p className="mb-3">Procedimento:</p>
              <ol className="list-decimal pl-5 space-y-2 mb-3">
                <li>Carregar o raster MapBiomas do ano de referência (brazil_coverage_2008.tif).</li>
                <li>Reprojetar e recortar para a grade de referência do MT (30m, EPSG:31981).</li>
                <li>Classificar pixels como agropecuários se pertencem às classes MapBiomas: 14 (Agropecuária), 15 (Pastagem), 18 (Agricultura), 19 (Lavoura Temporária), 20 (Cana), 21 (Mosaico), 36 (Lavoura Perene), 39 (Soja), 40 (Arroz), 41 (Outras Lavouras), 46 (Café), 47 (Citrus), 48 (Outras Perenes), 62 (Algodão), 63 (Outras Temporárias).</li>
                <li>Calcular a proporção de pixels agropecuários em janelas de 10x10 pixels (300m x 300m) usando convolução uniforme.</li>
                <li>Reclassificar em 5 classes por quintis sobre pixels de floresta de referência:
                  <table className="mt-2 mb-2 w-full text-xs" style={{ border: "1px solid #e8e5dd" }}>
                    <thead><tr style={{ background: "#f9f8f5" }}><th className="px-3 py-1.5 text-left">Classe</th><th className="px-3 py-1.5 text-left">Proporção agropecuária</th><th className="px-3 py-1.5 text-left">Interpretação</th></tr></thead>
                    <tbody>
                      <tr style={{ borderTop: "1px solid #e8e5dd" }}><td className="px-3 py-1.5">5</td><td className="px-3 py-1.5">&gt; 70%</td><td className="px-3 py-1.5">Altíssima pressão de conversão</td></tr>
                      <tr style={{ borderTop: "1px solid #e8e5dd" }}><td className="px-3 py-1.5">4</td><td className="px-3 py-1.5">50 – 70%</td><td className="px-3 py-1.5">Alta pressão</td></tr>
                      <tr style={{ borderTop: "1px solid #e8e5dd" }}><td className="px-3 py-1.5">3</td><td className="px-3 py-1.5">30 – 50%</td><td className="px-3 py-1.5">Média pressão</td></tr>
                      <tr style={{ borderTop: "1px solid #e8e5dd" }}><td className="px-3 py-1.5">2</td><td className="px-3 py-1.5">10 – 30%</td><td className="px-3 py-1.5">Baixa pressão</td></tr>
                      <tr style={{ borderTop: "1px solid #e8e5dd" }}><td className="px-3 py-1.5">1</td><td className="px-3 py-1.5">&lt; 10%</td><td className="px-3 py-1.5">Muito baixa pressão</td></tr>
                    </tbody>
                  </table>
                </li>
              </ol>
              <p className="text-xs italic" style={{ color: "#9a958e" }}>
                Racional: A janela de 300m captura o contexto de vizinhança imediata. As classes MapBiomas selecionadas cobrem todas as formas de uso agropecuário da Coleção 8.0. A classificação por quintis garante distribuição equilibrada entre as classes de risco (ECOMETRICA, 2018).
              </p>
            </div>
          </ExpandableSection>

          {/* Etapa E */}
          <ExpandableSection
            id="calc-e"
            title="4.3. Componente E — Extraibilidade"
            expanded={expandedSections.includes("calc-e")}
            toggle={() => toggleSection("calc-e")}
          >
            <div className="text-sm leading-relaxed" style={{ color: "#5a5448" }}>
              <p className="mb-3">
                O componente E quantifica a pressão de extração de recursos naturais, combinando dois fatores: (1) potencial madeireiro da cobertura florestal e (2) presença de processos minerários ativos. A lógica é que florestas com alto valor madeireiro e áreas com concessões minerárias sofrem pressão adicional de degradação e conversão (ASNER et al., 2005; SONTER et al., 2017).
              </p>
              <p className="mb-3">Procedimento:</p>
              <ol className="list-decimal pl-5 space-y-2 mb-3">
                <li>Carregar MapBiomas 2008 e identificar pixels florestais (classes 1 e 3).</li>
                <li>Calcular proporção de floresta em janelas 10x10 pixels (300m x 300m) — proxy do potencial madeireiro.</li>
                <li>Carregar shapefile de processos minerários (MT.shp do SIGMINE/ANM).</li>
                <li>Reprojetar para EPSG:31981 e aplicar buffer de 1 km ao redor de cada processo.</li>
                <li>Rasterizar a área de influência minerária sobre a grade.</li>
                <li>Combinar: score = proporção_florestal + 0.3 * presença_mineração.</li>
                <li>Reclassificar em 5 classes por quintis sobre pixels de floresta de referência.</li>
              </ol>
              <p className="text-xs italic" style={{ color: "#9a958e" }}>
                Racional: O buffer de 1 km para mineração captura a área de influência direta e indireta dos processos minerários (SONTER et al., 2017). A ponderação de 0.3 para mineração reflete que a extração madeireira é o driver principal de degradação florestal no MT, com mineração como fator secundário.
              </p>
            </div>
          </ExpandableSection>

          {/* Etapa U */}
          <ExpandableSection
            id="calc-u"
            title="4.4. Componente U — Proteção (Áreas Protegidas)"
            expanded={expandedSections.includes("calc-u")}
            toggle={() => toggleSection("calc-u")}
          >
            <div className="text-sm leading-relaxed" style={{ color: "#5a5448" }}>
              <p className="mb-3">
                O componente U identifica pixels dentro de áreas legalmente protegidas. Diferente dos demais componentes, U não é somado na fórmula de risco, mas atua como modificador posterior: pixels protegidos são reclassificados para risco 1 (mínimo) independente do valor de R = A + C + E. Esta abordagem segue o caso de estudo do Cerrado (ECOMETRICA, 2018, Appendix B), onde áreas protegidas recebem tratamento diferenciado por terem mecanismos legais de proteção que reduzem significativamente a probabilidade de conversão.
              </p>
              <p className="mb-3">Procedimento:</p>
              <ol className="list-decimal pl-5 space-y-2 mb-3">
                <li>Carregar shapefile de Terras Indígenas (FUNAI — tis_poligonais.shp).</li>
                <li>Carregar shapefile de Unidades de Conservação (CNUC — cnuc_2025_03.shp).</li>
                <li>Carregar shapefile de Territórios Quilombolas (INCRA), quando disponível.</li>
                <li>Reprojetar todos para EPSG:31981 e recortar ao limite do MT.</li>
                <li>Rasterizar a união de todas as áreas protegidas: pixel = 1 se dentro de qualquer área, 0 caso contrário.</li>
              </ol>
              <p className="text-xs italic" style={{ color: "#9a958e" }}>
                Racional: A reclassificação para risco 1 (ao invés de subtração na fórmula) é mais robusta porque garante que áreas protegidas sempre tenham o menor risco possível, independente da pressão dos outros componentes. Isso reflete a efetividade documentada das TIs e UCs na contenção do desmatamento (NEPSTAD et al., 2006; SOARES-FILHO et al., 2010).
              </p>
            </div>
          </ExpandableSection>

          {/* Composição */}
          <ExpandableSection
            id="calc-composicao"
            title="4.5. Composição ACEU e Classificação de Risco"
            expanded={expandedSections.includes("calc-composicao")}
            toggle={() => toggleSection("calc-composicao")}
          >
            <div className="text-sm leading-relaxed" style={{ color: "#5a5448" }}>
              <p className="mb-3">Procedimento:</p>
              <ol className="list-decimal pl-5 space-y-2 mb-3">
                <li>Somar os componentes: R_bruto(x) = A(x) + C(x) + E(x). Range teórico: 3 a 15.</li>
                <li>Gerar máscara de floresta de referência: pixels com classes 1 ou 3 no MapBiomas 2008.</li>
                <li>Calcular quintis (p20, p40, p60, p80) da distribuição de R_bruto apenas sobre pixels florestais.</li>
                <li>Se quintis colapsam (valores iguais), aplicar jitter de +1 para garantir 5 classes distintas.</li>
                <li>Classificar cada pixel florestal na classe de risco correspondente (1 a 5).</li>
                <li>Reclassificar pixels em áreas protegidas (U=1) para classe 1.</li>
              </ol>
              <p className="mb-3">Probabilidades de perda em 20 anos por classe (alpha_k):</p>
              <table className="w-full text-xs mb-3" style={{ border: "1px solid #e8e5dd" }}>
                <thead><tr style={{ background: "#f9f8f5" }}><th className="px-3 py-1.5 text-left">Classe</th><th className="px-3 py-1.5 text-left">Nome</th><th className="px-3 py-1.5 text-left">alpha_k</th><th className="px-3 py-1.5 text-left">Significado</th></tr></thead>
                <tbody>
                  <tr style={{ borderTop: "1px solid #e8e5dd" }}><td className="px-3 py-1.5">1</td><td className="px-3 py-1.5">Muito baixo</td><td className="px-3 py-1.5">0,10</td><td className="px-3 py-1.5">10% de chance de perda em 20 anos</td></tr>
                  <tr style={{ borderTop: "1px solid #e8e5dd" }}><td className="px-3 py-1.5">2</td><td className="px-3 py-1.5">Baixo</td><td className="px-3 py-1.5">0,30</td><td className="px-3 py-1.5">30% de chance de perda em 20 anos</td></tr>
                  <tr style={{ borderTop: "1px solid #e8e5dd" }}><td className="px-3 py-1.5">3</td><td className="px-3 py-1.5">Médio</td><td className="px-3 py-1.5">0,50</td><td className="px-3 py-1.5">50% de chance de perda em 20 anos</td></tr>
                  <tr style={{ borderTop: "1px solid #e8e5dd" }}><td className="px-3 py-1.5">4</td><td className="px-3 py-1.5">Alto</td><td className="px-3 py-1.5">0,70</td><td className="px-3 py-1.5">70% de chance de perda em 20 anos</td></tr>
                  <tr style={{ borderTop: "1px solid #e8e5dd" }}><td className="px-3 py-1.5">5</td><td className="px-3 py-1.5">Muito alto</td><td className="px-3 py-1.5">0,90</td><td className="px-3 py-1.5">90% de chance de perda em 20 anos</td></tr>
                </tbody>
              </table>
              <p className="text-xs italic" style={{ color: "#9a958e" }}>
                Racional: As probabilidades alpha_k são definidas pela metodologia original (ECOMETRICA, 2018, Table 2). A classificação por quintis garante que cada classe contenha aproximadamente 20% dos pixels florestais, evitando classes vazias ou dominantes. O jitter é aplicado apenas quando a distribuição discreta causa colapso de limiares.
              </p>
            </div>
          </ExpandableSection>

          {/* Desmatamento Evitado */}
          <ExpandableSection
            id="calc-evitado"
            title="4.6. Cálculo do Desmatamento Evitado"
            expanded={expandedSections.includes("calc-evitado")}
            toggle={() => toggleSection("calc-evitado")}
          >
            <div className="text-sm leading-relaxed" style={{ color: "#5a5448" }}>
              <p className="mb-3">
                O desmatamento evitado é calculado comparando a perda esperada (baseada no risco ACEU) com a perda observada (MapBiomas T0 vs T1). Um pixel é considerado "desmatamento evitado" quando tinha alto risco de perda mas permaneceu florestal.
              </p>
              <p className="mb-3">Procedimento:</p>
              <ol className="list-decimal pl-5 space-y-2 mb-3">
                <li>Carregar MapBiomas T0 (2008) e T1 (2022).</li>
                <li>Identificar floresta de referência: pixels com classe 1 ou 3 em T0.</li>
                <li>Identificar floresta atual: pixels com classe 1 ou 3 em T1.</li>
                <li>Pixel desmatado = floresta em T0 mas não-floresta em T1.</li>
                <li>Cruzar com o risco ACEU para classificar cada pixel:
                  <table className="mt-2 mb-2 w-full text-xs" style={{ border: "1px solid #e8e5dd" }}>
                    <thead><tr style={{ background: "#f9f8f5" }}><th className="px-3 py-1.5 text-left">Classe</th><th className="px-3 py-1.5 text-left">Condição</th><th className="px-3 py-1.5 text-left">Interpretação</th></tr></thead>
                    <tbody>
                      <tr style={{ borderTop: "1px solid #e8e5dd" }}><td className="px-3 py-1.5">1 - Floresta mantida</td><td className="px-3 py-1.5">Risco 1-2, manteve floresta</td><td className="px-3 py-1.5">Esperado que mantivesse</td></tr>
                      <tr style={{ borderTop: "1px solid #e8e5dd" }}><td className="px-3 py-1.5">2 - Parcialmente evitado</td><td className="px-3 py-1.5">Risco 3, manteve floresta</td><td className="px-3 py-1.5">50% de chance de perda, evitou</td></tr>
                      <tr style={{ borderTop: "1px solid #e8e5dd" }}><td className="px-3 py-1.5">3 - Desmatamento evitado</td><td className="px-3 py-1.5">Risco 4, manteve floresta</td><td className="px-3 py-1.5">70% de chance de perda, evitou</td></tr>
                      <tr style={{ borderTop: "1px solid #e8e5dd" }}><td className="px-3 py-1.5">4 - Fortemente evitado</td><td className="px-3 py-1.5">Risco 5, manteve floresta</td><td className="px-3 py-1.5">90% de chance de perda, evitou</td></tr>
                      <tr style={{ borderTop: "1px solid #e8e5dd" }}><td className="px-3 py-1.5">5 - Perda confirmada</td><td className="px-3 py-1.5">Risco 4-5, perdeu floresta</td><td className="px-3 py-1.5">Esperado que perdesse</td></tr>
                      <tr style={{ borderTop: "1px solid #e8e5dd" }}><td className="px-3 py-1.5">6 - Perda inesperada</td><td className="px-3 py-1.5">Risco 1-2, perdeu floresta</td><td className="px-3 py-1.5">Não esperado que perdesse</td></tr>
                    </tbody>
                  </table>
                </li>
              </ol>
              <p className="text-xs italic" style={{ color: "#9a958e" }}>
                Racional: O conceito de "desmatamento evitado" segue a lógica contrafactual do Hectares Indicator: se o modelo previa alta probabilidade de perda e a floresta foi mantida, há evidência de que algum mecanismo (proteção legal, fiscalização, mercado) evitou a conversão. A "perda inesperada" indica falhas nos mecanismos de proteção ou drivers não capturados pelo modelo.
              </p>
            </div>
          </ExpandableSection>

          {/* Estatísticas */}
          <ExpandableSection
            id="calc-stats"
            title="4.7. Cálculo da Perda Esperada (L_20)"
            expanded={expandedSections.includes("calc-stats")}
            toggle={() => toggleSection("calc-stats")}
          >
            <div className="text-sm leading-relaxed" style={{ color: "#5a5448" }}>
              <p className="mb-3">
                A perda esperada em 20 anos (L_20) para cada município é calculada pela soma ponderada das áreas florestais por classe de risco:
              </p>
              <div className="rounded-lg p-4 mb-3 font-mono text-center" style={{ background: "#f9f8f5", border: "1px solid #e8e5dd" }}>
                L_20 = Σ (A_k × alpha_k), para k = 1, 2, 3, 4, 5
              </div>
              <p className="mb-3">Onde:</p>
              <ul className="list-disc pl-5 space-y-1 mb-3">
                <li>A_k = área florestal (ha) na classe de risco k</li>
                <li>alpha_k = probabilidade de perda em 20 anos da classe k</li>
              </ul>
              <p className="mb-3">
                O desmatamento evitado por município é calculado como:
              </p>
              <div className="rounded-lg p-4 mb-3 font-mono text-center" style={{ background: "#f9f8f5", border: "1px solid #e8e5dd" }}>
                DE = L_20 × (T1-T0)/20 - Desmatamento_observado
              </div>
              <p>
                Onde o desmatamento observado é a diferença entre floresta em T0 e floresta em T1 para cada município. Valores negativos de DE indicam que o desmatamento observado superou o esperado.
              </p>
            </div>
          </ExpandableSection>
        </div>

        {/* Referências */}
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-4" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
            5. Referências
          </h2>
          <div className="flex flex-col gap-2 text-sm" style={{ color: "#5a5448" }}>
            <p>ARIMA, E. Y. et al. Statistical confirmation of indirect land use change in the Brazilian Amazon. Environmental Research Letters, v. 6, n. 2, 2011.</p>
            <p>ASNER, G. P. et al. Selective logging in the Brazilian Amazon. Science, v. 310, n. 5747, p. 480-482, 2005.</p>
            <p>BARBER, C. P. et al. Roads, deforestation, and the mitigating effect of protected areas in the Amazon. Biological Conservation, v. 177, p. 203-209, 2014.</p>
            <p>ECOMETRICA. Hectares Indicator: Methods and Guidance V2.0. Edinburgh, 2018.</p>
            <p>LAURANCE, W. F. et al. Impacts of roads and hunting on central African rainforest mammals. Conservation Biology, v. 20, n. 4, p. 1251-1261, 2009.</p>
            <p>MAPBIOMAS. Projeto MapBiomas — Coleção 8.0 da Série Anual de Mapas de Cobertura e Uso da Terra do Brasil. 2023.</p>
            <p>NEPSTAD, D. et al. Inhibition of Amazon deforestation and fire by parks and indigenous lands. Conservation Biology, v. 20, n. 1, p. 65-73, 2006.</p>
            <p>SOARES-FILHO, B. et al. Modelling conservation in the Amazon basin. Nature, v. 440, n. 7083, p. 520-523, 2006.</p>
            <p>SOARES-FILHO, B. et al. Role of Brazilian Amazon protected areas in climate change mitigation. PNAS, v. 107, n. 24, p. 10821-10826, 2010.</p>
            <p>SONTER, L. J. et al. Mining drives extensive deforestation in the Brazilian Amazon. Nature Communications, v. 8, n. 1, p. 1013, 2017.</p>
            <p>TIPPER, R.; MOREL, A. Hectares Indicator: a risk-based approach to quantifying avoided deforestation. Ecometrica, 2016.</p>
            <p>VENDRUSCULO, L. G. et al. Indicador de Hectares: uma métrica para certificação de produtos agropecuários livres de desmatamento. Sinop: Embrapa Agrossilvipastoril, 2019. (Comunicado Técnico, 7).</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CÓDIGO PYTHON
   ============================================================ */
function CodigoPython({ handleCopy, copiedId }: { handleCopy: (text: string, id: string) => void; copiedId: string | null }) {
  const scripts = [
    {
      id: "config",
      nome: "config.py",
      descricao: "Configurações centrais — parâmetros, caminhos, limiares e probabilidades",
      codigo: `"""
Configurações centrais do pipeline ACEU - Mato Grosso
"""
import os, glob

# Diretórios
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DADOS_BRUTOS_DIR = os.path.join(BASE_DIR, "dados_brutos")
RASTERS_DIR = os.path.join(BASE_DIR, "rasters")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")

# Sistema de referência: SIRGAS 2000 / UTM 21S
CRS_PROJETO = "EPSG:31981"
RESOLUCAO = 30  # metros

# Período de análise
ANO_T0 = 2008  # Baseline (floresta de referência)
ANO_T1 = 2022  # Avaliação (comparação)

# Limiares do componente A (distância em metros)
LIMIARES_A = {
    5: (0, 4500),        # muito alta acessibilidade
    4: (4500, 9000),
    3: (9000, 13500),
    2: (13500, 18000),
    1: (18000, float("inf")),
}

# Probabilidades de perda em 20 anos (alpha_k)
PROB_PERDA_20 = {
    1: 0.10,  # risco muito baixo
    2: 0.30,  # risco baixo
    3: 0.50,  # risco médio
    4: 0.70,  # risco alto
    5: 0.90,  # risco muito alto
}

HORIZONTE_REF = 20  # anos`,
    },
    {
      id: "03_acessibilidade",
      nome: "03_acessibilidade.py",
      descricao: "Componente A — distância euclidiana a rodovias, reclassificação em 5 classes",
      codigo: `"""
Etapa 03: Componente A (Acessibilidade)
Calcula distância euclidiana a rodovias e reclassifica em 5 classes.
"""
import numpy as np
import rasterio
from rasterio.features import rasterize
from scipy.ndimage import distance_transform_edt
import geopandas as gpd
from config import *

def main():
    # 1. Carregar grade de referência
    with rasterio.open(os.path.join(RASTERS_DIR, "grade_mt.tif")) as src:
        meta = src.meta.copy()
        transform = src.transform
        shape = (src.height, src.width)

    # 2. Carregar e reprojetar rodovias
    rodovias = gpd.read_file(obter_rodovias())
    rodovias = rodovias.to_crs(CRS_PROJETO)

    # 3. Rasterizar rodovias (1 = rodovia, 0 = sem rodovia)
    geometrias = [(geom, 1) for geom in rodovias.geometry if geom is not None]
    raster_rodovias = rasterize(geometrias, out_shape=shape, transform=transform,
                                 fill=0, dtype="uint8")

    # 4. Distância euclidiana (em pixels, depois converter para metros)
    dist_pixels = distance_transform_edt(raster_rodovias == 0)
    dist_metros = dist_pixels * RESOLUCAO  # 30m por pixel

    # 5. Reclassificar em 5 classes
    componente_a = np.zeros(shape, dtype="uint8")
    for classe, (d_min, d_max) in LIMIARES_A.items():
        mask = (dist_metros >= d_min) & (dist_metros < d_max)
        componente_a[mask] = classe

    # 6. Aplicar máscara do estado
    with rasterio.open(os.path.join(RASTERS_DIR, "mascara_mt.tif")) as src:
        mascara = src.read(1)
    componente_a[mascara == 0] = 0

    # 7. Salvar
    meta.update(dtype="uint8", count=1, compress="lzw", BIGTIFF="YES")
    with rasterio.open(os.path.join(RASTERS_DIR, "componente_a.tif"), "w", **meta) as dst:
        dst.write(componente_a, 1)`,
    },
    {
      id: "05_cultivabilidade",
      nome: "05_cultivabilidade.py",
      descricao: "Componente C — proporção de agropecuária em vizinhança 300m, quintis",
      codigo: `"""
Etapa 05: Componente C (Cultivabilidade)
Calcula proporção de uso agropecuário em janela 10x10 pixels (300m).
"""
import numpy as np
import rasterio
from scipy.signal import fftconvolve
from config import *

# Classes MapBiomas de agropecuária
CLASSES_AGRO = [14, 15, 18, 19, 20, 21, 36, 39, 40, 41, 46, 47, 48, 62, 63]

def main():
    # 1. Carregar MapBiomas T0 (já recortado para o MT)
    mapbiomas = carregar_mapbiomas_recortado(ANO_T0)

    # 2. Máscara binária de agropecuária
    agro = np.isin(mapbiomas, CLASSES_AGRO).astype("float32")

    # 3. Proporção em janela 10x10 (convolução uniforme)
    kernel = np.ones((10, 10), dtype="float32") / 100.0
    proporcao = fftconvolve(agro, kernel, mode="same")
    proporcao = np.clip(proporcao, 0, 1)

    # 4. Máscara de floresta de referência
    floresta_ref = np.isin(mapbiomas, [1, 3])

    # 5. Quintis sobre pixels florestais
    valores_floresta = proporcao[floresta_ref & (proporcao > 0)]
    quintis = np.percentile(valores_floresta, [20, 40, 60, 80])

    # 6. Classificar
    componente_c = np.zeros_like(proporcao, dtype="uint8")
    componente_c[proporcao <= quintis[0]] = 1
    componente_c[(proporcao > quintis[0]) & (proporcao <= quintis[1])] = 2
    componente_c[(proporcao > quintis[1]) & (proporcao <= quintis[2])] = 3
    componente_c[(proporcao > quintis[2]) & (proporcao <= quintis[3])] = 4
    componente_c[proporcao > quintis[3]] = 5

    # 7. Aplicar máscara do estado
    componente_c[mascara_mt == 0] = 0

    # 8. Salvar
    salvar_raster(componente_c, "componente_c.tif")`,
    },
    {
      id: "07_composicao",
      nome: "07_composicao_aceu.py",
      descricao: "Composição R = A + C + E, classificação por quintis, reclassificação de áreas protegidas",
      codigo: `"""
Etapa 07: Composição ACEU e Classificação de Risco
R_bruto = A + C + E (range 3-15)
Classificação em quintis sobre floresta de referência.
Áreas protegidas (U=1) → reclassificadas para classe 1.
"""
import numpy as np
import rasterio
from config import *

def main():
    # 1. Carregar componentes
    A = carregar_raster("componente_a.tif")
    C = carregar_raster("componente_c.tif")
    E = carregar_raster("componente_e.tif")
    U = carregar_raster("componente_u.tif")

    # 2. Gerar máscara de floresta de referência (MapBiomas T0)
    mapbiomas_t0 = carregar_mapbiomas_recortado(ANO_T0)
    floresta_ref = np.isin(mapbiomas_t0, [1, 3])

    # 3. Calcular risco bruto (apenas onde todos os componentes > 0)
    valido = (A > 0) & (C > 0) & (E > 0)
    R_bruto = np.zeros_like(A, dtype="float32")
    R_bruto[valido] = A[valido].astype("float32") + C[valido] + E[valido]

    # 4. Quintis sobre pixels florestais
    valores_floresta = R_bruto[floresta_ref & valido]
    p20, p40, p60, p80 = np.percentile(valores_floresta, [20, 40, 60, 80])

    # Jitter se quintis colapsam
    limiares = [p20, p40, p60, p80]
    for i in range(1, len(limiares)):
        if limiares[i] <= limiares[i-1]:
            limiares[i] = limiares[i-1] + 1

    # 5. Classificar em 5 classes
    risco = np.zeros_like(R_bruto, dtype="uint8")
    mask_floresta = floresta_ref & valido
    risco[mask_floresta & (R_bruto <= limiares[0])] = 1
    risco[mask_floresta & (R_bruto > limiares[0]) & (R_bruto <= limiares[1])] = 2
    risco[mask_floresta & (R_bruto > limiares[1]) & (R_bruto <= limiares[2])] = 3
    risco[mask_floresta & (R_bruto > limiares[2]) & (R_bruto <= limiares[3])] = 4
    risco[mask_floresta & (R_bruto > limiares[3])] = 5

    # 6. Reclassificar áreas protegidas para risco 1
    risco[(U == 1) & (risco > 0)] = 1

    # 7. Salvar
    salvar_raster(risco, "risco_aceu.tif")
    salvar_raster(floresta_ref.astype("uint8"), "mascara_floresta.tif")`,
    },
    {
      id: "07b_evitado",
      nome: "07b_desmatamento_evitado_raster.py",
      descricao: "Cruzamento risco ACEU com desmatamento observado (T0 vs T1)",
      codigo: `"""
Etapa 07b: Desmatamento Evitado (Raster)
Cruza risco ACEU com perda observada entre T0 e T1.
"""
import numpy as np
import rasterio
from config import *

def main():
    # 1. Carregar risco ACEU e máscara de floresta
    risco = carregar_raster("risco_aceu.tif")
    floresta_ref = carregar_raster("mascara_floresta.tif")

    # 2. Carregar MapBiomas T1 e identificar floresta atual
    mapbiomas_t1 = carregar_mapbiomas_recortado(ANO_T1)
    floresta_t1 = np.isin(mapbiomas_t1, [1, 3])

    # 3. Identificar desmatamento: floresta em T0, não-floresta em T1
    desmatado = (floresta_ref == 1) & (~floresta_t1)
    manteve = (floresta_ref == 1) & (floresta_t1)

    # 4. Classificar cada pixel
    resultado = np.zeros_like(risco, dtype="uint8")

    # Floresta mantida (esperado) — risco baixo e manteve
    resultado[manteve & (risco <= 2)] = 1

    # Parcialmente evitado — risco médio e manteve
    resultado[manteve & (risco == 3)] = 2

    # Desmatamento evitado — risco alto e manteve
    resultado[manteve & (risco == 4)] = 3

    # Fortemente evitado — risco muito alto e manteve
    resultado[manteve & (risco == 5)] = 4

    # Perda confirmada — risco alto/muito alto e perdeu
    resultado[desmatado & (risco >= 4)] = 5

    # Perda inesperada — risco baixo e perdeu
    resultado[desmatado & (risco <= 2)] = 6

    # 5. Salvar
    salvar_raster(resultado, "desmatamento_evitado.tif")`,
    },
    {
      id: "08_estatisticas",
      nome: "08_estatisticas.py",
      descricao: "Estatísticas zonais por município — perda esperada L_20 e desmatamento evitado",
      codigo: `"""
Etapa 08: Estatísticas por Município
Calcula L_20 = Σ(A_k × alpha_k) para cada município.
"""
import numpy as np
import pandas as pd
import geopandas as gpd
from rasterio.features import rasterize
from config import *

def main():
    # 1. Carregar risco ACEU
    risco = carregar_raster("risco_aceu.tif")

    # 2. Carregar e rasterizar municípios
    municipios = gpd.read_file(os.path.join(DADOS_BRUTOS_DIR, "municipios_mt.geojson"))
    municipios = municipios.to_crs(CRS_PROJETO)

    # Rasterizar com código IBGE como valor
    shapes = [(geom, cod) for geom, cod in zip(municipios.geometry, municipios["codarea"])]
    raster_mun = rasterize(shapes, out_shape=risco.shape, transform=transform)

    # 3. Para cada município, calcular áreas por classe
    resultados = []
    for _, row in municipios.iterrows():
        cod = row["codarea"]
        mask_mun = raster_mun == cod

        for classe in range(1, 6):
            area_pixels = np.sum((risco == classe) & mask_mun)
            area_ha = area_pixels * (RESOLUCAO ** 2) / 10000  # pixels → hectares
            resultados.append({
                "cod_municipio": cod,
                "classe": classe,
                "area_ha": area_ha,
            })

    # 4. Calcular perda esperada L_20
    df = pd.DataFrame(resultados)
    df["perda_esperada_ha"] = df.apply(
        lambda r: r["area_ha"] * PROB_PERDA_20[r["classe"]], axis=1
    )

    # Agregar por município
    resumo = df.groupby("cod_municipio").agg(
        floresta_total_ha=("area_ha", "sum"),
        perda_esperada_20anos_ha=("perda_esperada_ha", "sum"),
    ).reset_index()

    resumo["perda_esperada_20anos_km2"] = resumo["perda_esperada_20anos_ha"] / 100

    # 5. Exportar
    resumo.to_csv(os.path.join(OUTPUT_DIR, "areas_risco_municipios.csv"), index=False)`,
    },
  ];

  return (
    <div className="py-8">
      <div className="container max-w-4xl">
        <p className="text-sm mb-6" style={{ color: "#7a7568" }}>
          Código-fonte simplificado e documentado de cada etapa do pipeline. Os scripts completos estão no repositório, pasta <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: "#f0ede7" }}>geoprocessamento/</code>.
        </p>

        <div className="flex flex-col gap-4">
          {scripts.map((script) => (
            <div key={script.id} className="rounded-xl overflow-hidden" style={{ border: "1px solid #e8e5dd" }}>
              <div className="px-5 py-3 flex items-center justify-between" style={{ background: "#f9f8f5", borderBottom: "1px solid #e8e5dd" }}>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: "#2c2417" }}>{script.nome}</h3>
                  <p className="text-xs" style={{ color: "#7a7568" }}>{script.descricao}</p>
                </div>
                <button
                  onClick={() => handleCopy(script.codigo, script.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs shrink-0"
                  style={{ background: "rgba(46,125,50,0.08)", color: "#2E7D32" }}
                >
                  {copiedId === script.id ? <Check size={12} /> : <Copy size={12} />}
                  {copiedId === script.id ? "Copiado" : "Copiar"}
                </button>
              </div>
              <pre className="px-5 py-4 text-xs overflow-x-auto" style={{ background: "#1a1a2e", color: "#e0e0e0", fontFamily: "'JetBrains Mono', monospace", maxHeight: "400px" }}>
                <code>{script.codigo}</code>
              </pre>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl p-5" style={{ background: "#f9f8f5", border: "1px solid #e8e5dd" }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "#2c2417" }}>Como executar o pipeline completo</h3>
          <pre className="text-xs p-3 rounded-lg overflow-x-auto" style={{ background: "#1a1a2e", color: "#a8d5a2", fontFamily: "'JetBrains Mono', monospace" }}>
{`cd geoprocessamento
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python run_all.py          # Executa todas as etapas (01 a 10)
python run_all.py --from 7 # Executa a partir da etapa 07`}
          </pre>
          <p className="text-xs mt-3" style={{ color: "#9a958e" }}>
            Requisitos: Python 3.10+, GDAL, rasterio, geopandas, shapely, numpy, scipy, pandas. Tempo estimado: 15-25 min (Apple M4).
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   COMPONENTE AUXILIAR: Seção expansível
   ============================================================ */
function ExpandableSection({ id, title, expanded, toggle, children }: {
  id: string; title: string; expanded: boolean; toggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="mb-3 rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
      <button onClick={toggle} className="w-full px-5 py-4 flex items-center gap-3 text-left">
        {expanded ? <ChevronDown size={16} style={{ color: "#2E7D32" }} /> : <ChevronRight size={16} style={{ color: "#7a7568" }} />}
        <h3 className="text-sm font-semibold" style={{ color: "#2c2417" }}>{title}</h3>
      </button>
      {expanded && (
        <div className="px-5 pb-5" style={{ borderTop: "1px solid #f0ede7" }}>
          <div className="mt-4">{children}</div>
        </div>
      )}
    </div>
  );
}
