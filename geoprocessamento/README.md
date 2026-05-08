# Pipeline ACEU - Desmatamento Evitado no Mato Grosso

Pipeline Python para estimativa de desmatamento evitado no estado do Mato Grosso, baseado na metodologia Hectares Indicator (modelo ACEU).

## Requisitos

- Python 3.10+
- macOS (Apple Silicon M4) ou Linux
- 8GB+ de RAM (recomendado 16GB+)
- ~2GB de espaço em disco para dados brutos e rasters

## Setup

```bash
cd geoprocessamento
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Execução

```bash
# Pipeline completo (do download ao tile)
python run_all.py

# A partir de uma etapa específica
python run_all.py --from 3

# Apenas uma etapa
python run_all.py --only 7

# Pular download (se dados já estão na pasta)
python run_all.py --skip-download
```

## Etapas

| Etapa | Script | Descrição | Saída |
|-------|--------|-----------|-------|
| 01 | 01_download_mt.py | Download dos dados geoespaciais | dados_brutos/ |
| 02 | 02_grade_mt.py | Grade de referência 30m EPSG:31981 | rasters/grade_mt.tif, mascara_mt.tif |
| 03 | 03_acessibilidade.py | Componente A (distância a rodovias) | rasters/componente_a.tif |
| 04 | 04_protecao.py | Componente U (áreas protegidas) | rasters/componente_u.tif |
| 05 | 05_cultivabilidade.py | Componente C (pressão agropecuária) | rasters/componente_c.tif |
| 06 | 06_extraibilidade.py | Componente E (recursos florestais/minerais) | rasters/componente_e.tif |
| 07 | 07_composicao_aceu.py | Risco bruto + classificação em quintis | rasters/risco_aceu.tif |
| 07b | 07b_desmatamento_evitado_raster.py | Raster de desmatamento evitado (ACEU x PRODES) | rasters/desmatamento_evitado.tif |
| 08 | 08_estatisticas.py | Estatísticas zonais por município | output/desmatamento_evitado_mt.csv |
| 09 | 09_gerar_tiles.py | Tiles PNG para visualização web (2 camadas) | tiles/risco/ e tiles/evitado/ |
| 10 | 10_copiar_tiles.py | Copiar tiles para o frontend | client/public/tiles/ |

## Modelo ACEU

```
R_bruto(x) = A(x) + C(x) + E(x) - U(x)
```

- A = Acessibilidade (distância a rodovias, 5 classes)
- C = Cultivabilidade (pressão agropecuária na vizinhança, 5 classes)
- E = Extraibilidade (recurso florestal + mineração, 5 classes)
- U = Proteção (UC, TI, Quilombo - binário 0/1)

O risco bruto é classificado em quintis sobre os pixels de floresta de referência, gerando 5 classes finais de risco (muito baixo a muito alto).

## Desmatamento Evitado

```
L_20(m) = 0.10*A1(m) + 0.30*A2(m) + 0.50*A3(m) + 0.70*A4(m) + 0.90*A5(m)
L_T(m) = (T/20) * L_20(m)
DE_T(m) = L_T(m) - O_T(m)
```

Onde A1..A5 são as áreas florestais do município m em cada classe de risco, e O_T é a perda observada (PRODES).

## Fontes de Dados

| Dado | Fonte | URL |
|------|-------|-----|
| Limites municipais | IBGE | servicodados.ibge.gov.br |
| Rodovias | SNV/DNIT | gov.br/dnit |
| Terras Indígenas | FUNAI | gov.br/funai |
| Unidades de Conservação | MMA/CNUC | dados.mma.gov.br |
| Quilombos | INCRA | certificacao.incra.gov.br |
| Uso do solo | MapBiomas | brasil.mapbiomas.org |
| Mineração | ANM/SIGMINE | geo.anm.gov.br |
| Desmatamento observado | PRODES/INPE | terrabrasilis.dpi.inpe.br |

## Notebook Exploratório

O arquivo `notebook_exploratorio.ipynb` permite validar visualmente cada componente antes de consolidar os resultados. Abra no VS Code (extensão Jupyter) ou no JupyterLab:

```bash
jupyter lab notebook_exploratorio.ipynb
```

O notebook inclui:
- Visualização da máscara e grade de referência
- Mapas de cada componente (A, C, E, U) com legendas
- Painel comparativo dos 4 componentes lado a lado
- Histograma do risco bruto e quintis
- Zoom em regiões de interesse
- Estatísticas por município (top 20)

## Integração com o Frontend

Após gerar os tiles (etapa 09), execute a etapa 10 para copiar automaticamente para o frontend:

```bash
python 10_copiar_tiles.py
```

Ou manualmente:
```bash
cp -r tiles/ ../client/public/tiles/
```

Depois inicie o frontend:
```bash
cd ..
pnpm dev
# Abrir: http://localhost:3000/desmatamento-evitado/mapa-risco
```

## Referências

- ECOMETRICA. The Hectares Indicator Methods and Guidance. Version 2.0. Edinburgh, 2019.
- VENDRUSCULO et al. Aplicação da metodologia do Hectare Indicator para estimativa de desmatamento evitado no bioma Amazônia. Embrapa, 2019.
