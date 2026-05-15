/*
 * CodigoProtegido.tsx — Documentação Técnica do Pipeline de Geoprocessamento
 * Descreve as etapas, parâmetros, fontes de dados e como reproduzir
 */
import Layout from "@/components/Layout";
import { useState } from "react";
import { Lock, Unlock, ChevronDown, ChevronRight, Terminal, Database, Map, Layers, Calculator, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const SENHA_CORRETA = "123Troc@r";

interface PipelineStep {
  id: string;
  titulo: string;
  script: string;
  descricao: string;
  entrada: string[];
  saida: string[];
  parametros?: string;
}

const etapasPipeline: PipelineStep[] = [
  {
    id: "01",
    titulo: "Download de Dados Geoespaciais",
    script: "01_download_mt.py",
    descricao: "Baixa automaticamente os dados geoespaciais necessários: limites estaduais e municipais do IBGE, rodovias do SNV/DNIT (ou Geofabrik como fallback), Terras Indígenas da FUNAI, Unidades de Conservação do MMA/CNUC, e processos minerários do SIGMINE/ANM. Dados do MapBiomas devem ser obtidos manualmente via plataforma.",
    entrada: ["APIs IBGE", "SNV/DNIT", "FUNAI", "MMA/CNUC", "SIGMINE/ANM"],
    saida: ["limite_mt.geojson", "municipios_mt.geojson", "rodovias (shapefile)", "terras_indigenas (shapefile)", "ucs (shapefile)", "mineracao (shapefile)"],
  },
  {
    id: "02",
    titulo: "Geração da Grade de Referência",
    script: "02_grade_mt.py",
    descricao: "Gera a grade raster de referência para o estado do Mato Grosso no CRS EPSG:31981 (SIRGAS 2000 / UTM 21S) com resolução de 30 metros. Produz também a máscara binária do estado (1 = dentro do MT, 0 = fora). Todos os rasters subsequentes herdam esta grade.",
    entrada: ["limite_mt.geojson"],
    saida: ["grade_mt.tif (41775 x 39540 px)", "mascara_mt.tif"],
    parametros: "CRS: EPSG:31981 | Resolução: 30m | Formato: GeoTIFF BIGTIFF",
  },
  {
    id: "03",
    titulo: "Componente A — Acessibilidade",
    script: "03_acessibilidade.py",
    descricao: "Calcula a distância euclidiana de cada pixel à rodovia mais próxima. Reclassifica em 5 classes usando limiares de 4,5 km, 9 km, 13,5 km e 18 km. Quanto mais próximo de rodovias, maior o risco (classe 5 = 0-4,5 km).",
    entrada: ["grade_mt.tif", "mascara_mt.tif", "rodovias (shapefile)"],
    saida: ["componente_a.tif"],
    parametros: "Limiares: 4500, 9000, 13500, 18000 metros | Classes: 1 (>18km) a 5 (0-4,5km)",
  },
  {
    id: "04",
    titulo: "Componente U — Proteção",
    script: "04_protecao.py",
    descricao: "Gera máscara binária de áreas protegidas: Terras Indígenas (FUNAI), Unidades de Conservação (CNUC/MMA) e Territórios Quilombolas (INCRA). Pixels dentro de qualquer área protegida recebem valor 1. Na composição final, estes pixels são reclassificados para risco 1 (mínimo).",
    entrada: ["grade_mt.tif", "mascara_mt.tif", "terras_indigenas", "ucs", "quilombolas"],
    saida: ["componente_u.tif"],
    parametros: "Saída binária: 0 = sem proteção, 1 = área protegida",
  },
  {
    id: "05",
    titulo: "Componente C — Cultivabilidade",
    script: "05_cultivabilidade.py",
    descricao: "Calcula a pressão agropecuária usando dados de uso do solo do MapBiomas. Em janelas de 10x10 pixels (300m x 300m), conta a proporção de pixels de agropecuária (classes 14, 15, 18, 19, 20, 21, 36, 39, 40, 41, 46, 47, 48, 62, 63 do MapBiomas). Reclassifica em 5 classes por quintis.",
    entrada: ["grade_mt.tif", "mascara_mt.tif", "MapBiomas cobertura (GeoTIFF)"],
    saida: ["componente_c.tif"],
    parametros: "Janela: 10x10 pixels (300m) | Classes MapBiomas agropecuárias | Quintis sobre floresta",
  },
  {
    id: "06",
    titulo: "Componente E — Extraibilidade",
    script: "06_extraibilidade.py",
    descricao: "Combina dois fatores: (1) proporção de cobertura florestal com potencial madeireiro (classes 1, 3 do MapBiomas) em janelas 10x10, e (2) presença de processos minerários ativos (SIGMINE/ANM). Reclassifica em 5 classes por quintis.",
    entrada: ["grade_mt.tif", "mascara_mt.tif", "MapBiomas cobertura", "mineracao (shapefile)"],
    saida: ["componente_e.tif"],
    parametros: "Janela: 10x10 pixels | Classes florestais: 1, 3 | Mineração: buffer 1km",
  },
  {
    id: "07",
    titulo: "Composição ACEU e Classificação de Risco",
    script: "07_composicao_aceu.py",
    descricao: "Calcula o risco bruto R = A + C + E (soma dos três componentes, range 3-15). Classifica em 5 classes por quintis sobre pixels de floresta de referência (T0). Após a classificação, pixels em áreas protegidas (componente U = 1) são reclassificados para classe 1 (risco mínimo). Gera também a máscara de floresta de referência usando MapBiomas T0.",
    entrada: ["componente_a.tif", "componente_c.tif", "componente_e.tif", "componente_u.tif", "MapBiomas T0"],
    saida: ["risco_aceu.tif", "mascara_floresta.tif"],
    parametros: "Fórmula: R = A + C + E | Quintis sobre floresta | Áreas protegidas → classe 1",
  },
  {
    id: "07b",
    titulo: "Desmatamento Evitado (Raster)",
    script: "07b_desmatamento_evitado_raster.py",
    descricao: "Cruza o risco ACEU com o desmatamento observado entre T0 e T1 (MapBiomas). Classifica cada pixel de floresta de referência em: (1) floresta mantida esperada, (2) parcialmente evitado, (3) desmatamento evitado, (4) fortemente evitado, (5) perda confirmada, (6) perda inesperada.",
    entrada: ["risco_aceu.tif", "mascara_floresta.tif", "MapBiomas T0", "MapBiomas T1"],
    saida: ["desmatamento_evitado.tif"],
    parametros: "T0: 2008 | T1: 2022 | Classes florestais MapBiomas: 1, 3 | 6 classes de saída",
  },
  {
    id: "08",
    titulo: "Estatísticas por Município",
    script: "08_estatisticas.py",
    descricao: "Calcula estatísticas zonais por município usando o GeoJSON dos municípios do MT. Para cada município: área florestal de referência, floresta atual, desmatamento observado, perda esperada (usando probabilidades alpha_k por classe de risco), desmatamento evitado, e distribuição por classe de risco.",
    entrada: ["risco_aceu.tif", "desmatamento_evitado.tif", "mascara_floresta.tif", "municipios_mt.geojson"],
    saida: ["estatisticas_municipios.json", "resumo_municipios.json", "tabelas LaTeX", "CSVs"],
    parametros: "Probabilidades alpha_k: 0.10, 0.30, 0.50, 0.70, 0.90 | Período: 20 anos",
  },
  {
    id: "09",
    titulo: "Geração de Tiles (Web Map)",
    script: "09_gerar_tiles.py",
    descricao: "Converte os rasters de risco e desmatamento evitado em tiles PNG no esquema XYZ (z/x/y.png) para visualização web com Leaflet. Gera tiles nos zooms 5 a 12, com paleta de cores fixa por classe.",
    entrada: ["risco_aceu.tif", "desmatamento_evitado.tif"],
    saida: ["tiles/risco/{z}/{x}/{y}.png", "tiles/evitado/{z}/{x}/{y}.png", "tiles/metadata.json"],
    parametros: "Zoom: 5-12 | Tile size: 256px | Esquema: XYZ | Total: ~27.900 tiles",
  },
  {
    id: "10",
    titulo: "Copiar para Frontend",
    script: "10_copiar_tiles.py",
    descricao: "Copia os tiles, metadados, GeoJSON dos municípios e estatísticas para a pasta client/public/tiles/ do frontend, onde o Vite os serve como arquivos estáticos.",
    entrada: ["tiles/", "estatisticas_municipios.json", "municipios_mt.geojson"],
    saida: ["client/public/tiles/"],
  },
];

const fonteDados = [
  { nome: "MapBiomas", desc: "Cobertura e uso do solo (Coleção 8.0)", url: "https://mapbiomas.org", arquivos: "brazil_coverage_2008.tif, brazil_coverage_2022.tif" },
  { nome: "PRODES/INPE", desc: "Desmatamento na Amazônia Legal", url: "https://terrabrasilis.dpi.inpe.br", arquivos: "Série histórica por município" },
  { nome: "IBGE", desc: "Limites estaduais e municipais", url: "https://servicodados.ibge.gov.br", arquivos: "limite_mt.geojson, municipios_mt.geojson" },
  { nome: "SNV/DNIT", desc: "Sistema Nacional de Viação — rodovias", url: "https://servicos.dnit.gov.br/dnitcloud/index.php/s/oTpPRmYs5AAdiNr", arquivos: "snv_*.shp" },
  { nome: "FUNAI", desc: "Terras Indígenas homologadas", url: "https://www.gov.br/funai", arquivos: "tis_poligonais.shp" },
  { nome: "MMA/CNUC", desc: "Cadastro Nacional de Unidades de Conservação", url: "https://www.gov.br/icmbio", arquivos: "cnuc_2025_03.shp" },
  { nome: "SIGMINE/ANM", desc: "Processos minerários ativos", url: "https://geo.anm.gov.br/portal/apps/webappviewer/index.html", arquivos: "MT.shp" },
];

export default function CodigoProtegido() {
  const [autenticado, setAutenticado] = useState(false);
  const [senha, setSenha] = useState("");
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleLogin = () => {
    if (senha === SENHA_CORRETA) {
      setAutenticado(true);
    } else {
      toast.error("Senha incorreta");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copiado!");
  };

  const comandoExecucao = `cd geoprocessamento
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
python run_all.py`;

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
                Acesso restrito. Insira a senha para visualizar a documentação do pipeline de geoprocessamento.
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
            Pipeline de Geoprocessamento — Desmatamento Evitado
          </h1>
          <p className="text-base" style={{ color: "#7a7568", maxWidth: "700px" }}>
            Documentação técnica do pipeline de cálculo do risco de desmatamento (modelo ACEU) e desmatamento evitado para o estado do Mato Grosso, baseado na metodologia Hectares Indicator (Ecometrica, 2018; Vendrusculo et al., 2019).
          </p>
        </div>
      </section>

      {/* Como executar */}
      <section className="py-8">
        <div className="container">
          <div className="rounded-xl overflow-hidden" style={{ background: "#1a1a2e", border: "1px solid #2d2d44" }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #2d2d44" }}>
              <div className="flex items-center gap-2">
                <Terminal size={16} style={{ color: "#a8d5a2" }} />
                <span className="text-sm font-medium" style={{ color: "#e0e0e0" }}>Como executar o pipeline</span>
              </div>
              <button
                onClick={() => handleCopy(comandoExecucao)}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                style={{ background: "rgba(255,255,255,0.05)", color: "#a8d5a2" }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
            <pre className="px-5 py-4 text-sm overflow-x-auto" style={{ color: "#e0e0e0", fontFamily: "'JetBrains Mono', monospace" }}>
              <code>{comandoExecucao}</code>
            </pre>
          </div>
          <p className="text-xs mt-3" style={{ color: "#9a958e" }}>
            Requisitos: Python 3.10+, GDAL, rasterio, geopandas, shapely, numpy. Tempo estimado: 15-25 min (Apple M4).
          </p>
        </div>
      </section>

      {/* Etapas do pipeline */}
      <section className="py-8">
        <div className="container">
          <h2 className="text-xl font-bold mb-6" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
            Etapas do Pipeline
          </h2>
          <div className="flex flex-col gap-3">
            {etapasPipeline.map((step) => {
              const isExpanded = expandedStep === step.id;
              return (
                <div key={step.id} className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
                  <button
                    onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                    className="w-full px-5 py-4 flex items-center gap-4 text-left"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(46,125,50,0.08)" }}>
                      <span className="text-xs font-bold" style={{ color: "#2E7D32" }}>{step.id}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold" style={{ color: "#2c2417" }}>{step.titulo}</h3>
                      <p className="text-xs" style={{ color: "#9a958e" }}>{step.script}</p>
                    </div>
                    {isExpanded ? <ChevronDown size={16} style={{ color: "#7a7568" }} /> : <ChevronRight size={16} style={{ color: "#7a7568" }} />}
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-5" style={{ borderTop: "1px solid #f0ede7" }}>
                      <p className="text-sm mt-4 mb-4" style={{ color: "#5a5448" }}>{step.descricao}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: "#7a7568" }}>
                            <Database size={12} /> Entrada
                          </h4>
                          <ul className="text-xs space-y-1" style={{ color: "#5a5448" }}>
                            {step.entrada.map((e, i) => <li key={i} className="pl-3" style={{ borderLeft: "2px solid #e8e5dd" }}>{e}</li>)}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: "#7a7568" }}>
                            <Layers size={12} /> Saída
                          </h4>
                          <ul className="text-xs space-y-1" style={{ color: "#5a5448" }}>
                            {step.saida.map((s, i) => <li key={i} className="pl-3" style={{ borderLeft: "2px solid #2E7D32" }}>{s}</li>)}
                          </ul>
                        </div>
                      </div>
                      {step.parametros && (
                        <div className="mt-4 px-3 py-2 rounded-lg" style={{ background: "#f9f8f5", border: "1px solid #e8e5dd" }}>
                          <h4 className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: "#7a7568" }}>
                            <Calculator size={12} /> Parâmetros
                          </h4>
                          <p className="text-xs" style={{ color: "#5a5448" }}>{step.parametros}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Fontes de dados */}
      <section className="py-8" style={{ background: "#f9f8f5" }}>
        <div className="container">
          <h2 className="text-xl font-bold mb-6" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
            Fontes de Dados
          </h2>
          <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e8e5dd" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#f9f8f5", borderBottom: "1px solid #e8e5dd" }}>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Fonte</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Descrição</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "#5a5448" }}>Arquivos</th>
                  </tr>
                </thead>
                <tbody>
                  {fonteDados.map((f) => (
                    <tr key={f.nome} style={{ borderBottom: "1px solid #f0ede7" }}>
                      <td className="px-4 py-3 font-medium" style={{ color: "#2c2417" }}>
                        <a href={f.url} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: "#2E7D32" }}>
                          {f.nome}
                        </a>
                      </td>
                      <td className="px-4 py-3" style={{ color: "#5a5448" }}>{f.desc}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: "#7a7568" }}>{f.arquivos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Referências */}
      <section className="py-8">
        <div className="container">
          <h2 className="text-xl font-bold mb-4" style={{ color: "#2c2417", fontFamily: "'Merriweather', serif" }}>
            Referências Metodológicas
          </h2>
          <div className="flex flex-col gap-3">
            <div className="rounded-lg p-4" style={{ background: "#f9f8f5", border: "1px solid #e8e5dd" }}>
              <p className="text-sm" style={{ color: "#5a5448" }}>
                ECOMETRICA. Hectares Indicator: Methods and Guidance V2.0. Edinburgh, 2018. Disponível em: ecometrica.com
              </p>
            </div>
            <div className="rounded-lg p-4" style={{ background: "#f9f8f5", border: "1px solid #e8e5dd" }}>
              <p className="text-sm" style={{ color: "#5a5448" }}>
                VENDRUSCULO, L. G. et al. Indicador de Hectares: uma métrica para certificação de produtos agropecuários livres de desmatamento. Sinop: Embrapa Agrossilvipastoril, 2019. (Comunicado Técnico, 7).
              </p>
            </div>
            <div className="rounded-lg p-4" style={{ background: "#f9f8f5", border: "1px solid #e8e5dd" }}>
              <p className="text-sm" style={{ color: "#5a5448" }}>
                TIPPER, R.; MOREL, A. Hectares Indicator: a risk-based approach to quantifying avoided deforestation. Ecometrica, 2016.
              </p>
            </div>
            <div className="rounded-lg p-4" style={{ background: "#f9f8f5", border: "1px solid #e8e5dd" }}>
              <p className="text-sm" style={{ color: "#5a5448" }}>
                MAPBIOMAS. Projeto MapBiomas — Coleção 8.0 da Série Anual de Mapas de Cobertura e Uso da Terra do Brasil. 2023. Disponível em: mapbiomas.org
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
