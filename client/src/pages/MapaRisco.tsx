/**
 * MapaRisco.tsx — Visualização do raster de risco ACEU e desmatamento evitado
 * Mapa interativo com tiles de probabilidade de desmatamento e desmatamento evitado
 * O usuário pode dar zoom, alternar camadas e ver o raster pixel a pixel
 */
import Layout from "@/components/Layout";
import RasterMap from "@/components/RasterMap";
import { useState } from "react";
import { Layers, Info, ZoomIn, ShieldCheck, TreePine } from "lucide-react";

export default function MapaRisco() {
  const [selectedMunicipio, setSelectedMunicipio] = useState<{
    codigo: string;
    nome: string;
  } | null>(null);

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
            camadas usando o controle no canto superior direito do mapa.
          </p>
        </div>
      </section>

      {/* Instruções */}
      <section className="bg-amber-50 border-b border-amber-200 py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3 text-amber-800 text-sm">
          <Info className="w-4 h-4 flex-shrink-0" />
          <p>
            Use o scroll para dar zoom. Alterne entre as camadas "Risco de Desmatamento"
            e "Desmatamento Evitado" no controle superior direito. Clique em um município
            para ver detalhes.
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
              {/* Info do município selecionado */}
              {selectedMunicipio && (
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <h3 className="font-medium text-gray-800 mb-2">
                    {selectedMunicipio.nome}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Código IBGE: {selectedMunicipio.codigo}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Os dados detalhados de risco e desmatamento evitado por classe
                    serão exibidos aqui após a execução do pipeline ACEU.
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
                    Probabilidade de desmatamento em 20 anos, calculada pela
                    combinação dos fatores ACEU:
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
                    Mostra onde a floresta foi preservada apesar do alto risco.
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
