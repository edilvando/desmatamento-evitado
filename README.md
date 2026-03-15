# Desmatamento Evitado no Brasil

Sistema web interativo para análise e visualização do desmatamento evitado no Brasil, desenvolvido no âmbito do Projeto Rural Sustentável (PRS) em parceria com a Embrapa Agrossilvipastoril (CPAMT).

O sistema permite explorar dados oficiais de desmatamento do PRODES/INPE por estado e por município, com séries históricas de 2008 a 2024, mapas interativos com animação temporal, e cálculo de desmatamento evitado baseado na metodologia Hectares Indicator (ACEU).

## Funcionalidades

- Panorama nacional com indicadores agregados e ranking dos estados
- Mapa interativo do Brasil com dados de desmatamento por estado e timeline animada (2008-2024)
- Mapa interativo do Mato Grosso com todos os 141 municípios e timeline animada
- Alternância entre visualização de desmatamento e desmatamento evitado nos mapas
- Filtro por bioma (Amazônia, Cerrado, Amazônia/Cerrado, Pantanal, Mata Atlântica, Caatinga)
- Seletor de ano com atualização sincronizada de gráficos, ranking e tabelas
- Série histórica individual ao clicar em qualquer estado ou município
- Gráfico de desmatamento esperado vs observado (desmatamento evitado)
- Documentação completa da metodologia ACEU
- Página de fontes de dados com links para todas as bases públicas e publicações científicas
- Área protegida por senha com documentação técnica do código

## Tecnologias

| Tecnologia | Função |
|------------|--------|
| React 19 | Framework frontend |
| TypeScript | Tipagem estática |
| Tailwind CSS 4 | Estilização |
| Vite | Bundler e servidor de desenvolvimento |
| Recharts | Gráficos interativos |
| shadcn/ui | Componentes de interface |
| Framer Motion | Animações |

## Instalação Local

Requisitos: Node.js 18+ e pnpm.

```bash
# Clonar o repositório
git clone <url-do-repositorio>
cd desmatamento-evitado

# Instalar dependências
pnpm install

# Iniciar servidor de desenvolvimento
pnpm dev
```

O sistema estará disponível em http://localhost:3000.

## Estrutura do Projeto

```
desmatamento-evitado/
├── client/
│   ├── src/
│   │   ├── components/      # Componentes reutilizáveis (mapas, layout)
│   │   ├── pages/           # Páginas do sistema
│   │   ├── data/            # JSON processado usado pelo frontend
│   │   └── index.css        # Estilos globais e paleta de cores
│   └── index.html
├── data/                    # Dados fonte e documentação (ver data/README.md)
│   ├── estados_serie_historica.csv
│   ├── mt_municipios_serie_historica.csv
│   ├── desmatamento_processado.json
│   ├── fontes/              # Dados brutos do TerraBrasilis/INPE
│   └── scripts/             # Script de processamento
└── README.md
```

## Dados

Os dados de desmatamento dos estados da Amazônia Legal provêm diretamente do sistema PRODES/INPE, acessados via plataforma TerraBrasilis. Os dados dos 141 municípios do Mato Grosso foram obtidos da mesma fonte, desagregados por município. Para estados fora da Amazônia Legal, os dados foram complementados com o Global Forest Change (Hansen et al., 2013) e MapBiomas.

A documentação completa das fontes, metodologia de cálculo e instruções de reprodutibilidade está em [data/README.md](data/README.md).

## Metodologia

O desmatamento evitado é calculado com base na metodologia Hectares Indicator, desenvolvida pela Ecometrica (2019) e adaptada pela Embrapa para o contexto brasileiro. O modelo utiliza quatro fatores preditivos — Acessibilidade, Aptidão agrícola (Crop suitability), Extraibilidade e áreas protegidas (Unprotected) — para estimar o desmatamento esperado em cada localidade. A diferença entre o esperado e o observado resulta no desmatamento evitado.

## Referências

- Ecometrica. Hectares Indicator: Methods and Guidance, Version 2.0. Edinburgh, 2019.
- Vendrusculo, L. G.; Zolin, C. A. et al. Aplicação da metodologia de Hectare Indicator para estimativa de desmatamento evitado no bioma Amazônia. Boletim de Pesquisa 46, Embrapa, 2019.
- Hansen, M. C. et al. High-Resolution Global Maps of 21st-Century Forest Cover Change. Science, 342(6160), 850-853, 2013.
- INPE. PRODES — Monitoramento do Desmatamento da Floresta Amazônica Brasileira por Satélite. Nota Técnica, 2024.

## Autor

Desenvolvido por Edilvando Pereira Eufrazio, no contexto do estágio probatório na Embrapa Agrossilvipastoril (CPAMT), como parte das atividades de Ciência de Dados aplicada ao Projeto Rural Sustentável.

## Licença

Este projeto é de uso institucional da Embrapa. Os dados utilizados são de domínio público, disponibilizados pelas instituições citadas nas referências.
