# Dados — Desmatamento Evitado no Brasil

Este diretório contém os dados utilizados pelo sistema web de Desmatamento Evitado, organizados em três categorias: dados processados prontos para uso, dados brutos das fontes originais, e o script de processamento.

## Estrutura

```
data/
├── estados_serie_historica.csv          # Série histórica por estado (2008-2024)
├── mt_municipios_serie_historica.csv    # Série histórica por município do MT (2008-2024)
├── desmatamento_processado.json         # JSON final usado pelo sistema web
├── README.md                            # Este arquivo
├── fontes/
│   ├── terrabrasilis_prodes_amazonia_legal.json   # Dados brutos PRODES (Amazônia Legal)
│   └── terrabrasilis_mt_141_municipios.json       # Dados brutos dos 141 municípios do MT
└── scripts/
    └── generate_data.py                 # Script de processamento e geração do JSON
```

## Fontes de Dados

Os dados de desmatamento utilizados neste sistema provêm de fontes oficiais do governo brasileiro e de instituições de pesquisa reconhecidas internacionalmente.

| Fonte | Instituição | Descrição | Acesso |
|-------|-------------|-----------|--------|
| PRODES | INPE | Taxas anuais de desmatamento na Amazônia Legal por estado e município, obtidas via sensoriamento remoto (Landsat) | [TerraBrasilis](http://terrabrasilis.dpi.inpe.br) |
| Global Forest Change | Universidade de Maryland | Perda e ganho de cobertura florestal global com resolução de 30m, baseado em imagens Landsat | [earthenginepartners.appspot.com](https://earthenginepartners.appspot.com/science-2013-global-forest) |
| MapBiomas | Rede colaborativa | Mapeamento anual da cobertura e uso do solo no Brasil desde 1985 | [mapbiomas.org](https://mapbiomas.org) |
| IBGE | Governo Federal | Limites municipais, estaduais e dados censitários | [ibge.gov.br](https://www.ibge.gov.br) |
| ICMBio | Governo Federal | Limites de Unidades de Conservação federais | [icmbio.gov.br](https://www.icmbio.gov.br) |
| SIGMINE/ANM | Agência Nacional de Mineração | Áreas de concessão mineral (fator Extraibilidade do modelo ACEU) | [sigmine.anm.gov.br](https://sigmine.anm.gov.br) |
| DNIT | Governo Federal | Malha rodoviária nacional (fator Acessibilidade do modelo ACEU) | [dnit.gov.br](https://www.gov.br/dnit) |

## Dados por Estado (estados_serie_historica.csv)

Contém a série histórica de desmatamento e desmatamento evitado para os 27 estados brasileiros, de 2008 a 2024.

Os dados dos 9 estados da Amazônia Legal (AC, AM, AP, MA, MT, PA, RO, RR, TO) foram obtidos diretamente do sistema PRODES/INPE, conforme publicado nas notas técnicas anuais do INPE. Os valores correspondem às taxas consolidadas de desmatamento por corte raso.

Para os demais 18 estados (que não fazem parte da Amazônia Legal), os dados foram estimados com base no Global Forest Change (Hansen et al., 2013) e no MapBiomas, uma vez que o PRODES monitora apenas a Amazônia Legal.

Colunas do CSV:
- sigla, nome, bioma_principal, area_km2, cobertura_florestal_pct
- desmatamento_acumulado_km2 (soma 2008-2024)
- desmatamento_evitado_acumulado_km2 (soma 2008-2024)
- desmatamento_YYYY (taxa anual em km² para cada ano)
- evitado_YYYY (desmatamento evitado anual em km² para cada ano)

## Dados por Município do MT (mt_municipios_serie_historica.csv)

Contém a série histórica de desmatamento e desmatamento evitado para todos os 141 municípios do Mato Grosso, de 2008 a 2024.

Os dados foram obtidos diretamente da plataforma TerraBrasilis do INPE, que disponibiliza os incrementos anuais de desmatamento PRODES desagregados por município para a Amazônia Legal. Os municípios do Mato Grosso que estão no bioma Cerrado tiveram seus dados complementados com estimativas baseadas no MapBiomas e Global Forest Change.

Colunas do CSV:
- nome, bioma, area_km2, cobertura_florestal_pct
- desmatamento_acumulado_km2 (soma 2008-2024)
- desmatamento_evitado_acumulado_km2 (soma 2008-2024)
- desmatamento_YYYY (taxa anual em km² para cada ano)
- evitado_YYYY (desmatamento evitado anual em km² para cada ano)

## Cálculo do Desmatamento Evitado

O desmatamento evitado é calculado com base na metodologia Hectares Indicator (Ecometrica, 2019), adaptada pela Embrapa para o contexto brasileiro (Vendrusculo et al., 2019). O modelo utiliza quatro fatores preditivos (ACEU):

- Acessibilidade (A): proximidade a estradas e centros urbanos
- Aptidão agrícola (C): capacidade produtiva do solo
- Extraibilidade (E): presença de recursos minerais e madeireiros
- Áreas protegidas (U): presença de Unidades de Conservação e Terras Indígenas

A fórmula simplificada é:

```
Desmatamento Evitado = Desmatamento Esperado − Desmatamento Observado
```

Valores positivos indicam que o município/estado desmatou menos do que o modelo previa (preservação acima do esperado). Valores negativos indicam desmatamento acima do esperado.

O desmatamento esperado é calculado como a média móvel ponderada dos últimos 5 anos, ajustada pelos fatores ACEU de cada localidade.

## Referências Bibliográficas

1. Ecometrica. Hectares Indicator: Methods and Guidance, Version 2.0. Edinburgh, 2019.

2. Vendrusculo, L. G.; Zolin, C. A.; Magalhães, C. A. S.; Farias Neto, A. L.; Lago, F. P. Aplicação da metodologia de Hectare Indicator para estimativa de desmatamento evitado no bioma Amazônia. Boletim de Pesquisa e Desenvolvimento 46, Embrapa Agrossilvipastoril, 2019.

3. Hansen, M. C. et al. High-Resolution Global Maps of 21st-Century Forest Cover Change. Science, v. 342, n. 6160, p. 850-853, 2013.

4. INPE. Monitoramento do Desmatamento da Floresta Amazônica Brasileira por Satélite — PRODES. Nota Técnica, 2024.

5. MapBiomas. Coleção 8 da Série Anual de Mapas de Cobertura e Uso da Terra do Brasil. 2024.

## Reprodutibilidade

Para regenerar o JSON processado a partir dos dados brutos:

```bash
cd data/scripts
python3 generate_data.py
```

O script lê os dados brutos da pasta fontes/, aplica os cálculos de desmatamento evitado, e gera o arquivo desmatamento_processado.json que alimenta o sistema web.
