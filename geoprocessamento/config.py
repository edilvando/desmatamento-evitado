"""
Configurações centrais do pipeline ACEU - Mato Grosso
Todos os parâmetros de referência ficam aqui para facilitar ajustes.
"""
import os

# Diretórios
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DADOS_BRUTOS_DIR = os.path.join(BASE_DIR, "dados_brutos")
RASTERS_DIR = os.path.join(BASE_DIR, "rasters")
TILES_DIR = os.path.join(BASE_DIR, "tiles")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")

# Criar diretórios se não existirem
for d in [DADOS_BRUTOS_DIR, RASTERS_DIR, TILES_DIR, OUTPUT_DIR]:
    os.makedirs(d, exist_ok=True)

# Sistema de referência de coordenadas
# EPSG:31981 - SIRGAS 2000 / UTM zone 21S (cobre a maior parte do MT)
CRS_PROJETO = "EPSG:31981"
CRS_GEO = "EPSG:4326"

# Resolução espacial em metros
RESOLUCAO = 30

# Código IBGE do Mato Grosso
COD_UF_MT = 51

# Limiares do componente A (Acessibilidade) - distância em metros
# Baseado no Hectares Indicator Methods and Guidance v2.0 (ECOMETRICA, 2019)
LIMIARES_A = {
    5: (0, 4500),        # muito alta acessibilidade / maior pressão
    4: (4500, 9000),     # alta
    3: (9000, 13500),    # média
    2: (13500, 18000),   # baixa
    1: (18000, float("inf")),  # muito baixa / parametrização conservadora
}

# Componente U (Proteção) - binário
# U(x) = 1 se pixel pertence a área protegida (UC, TI ou Quilombo)
# U(x) = 0 caso contrário

# Componente C (Cultivabilidade) - escala 1 a 5
# Proxy via MapBiomas: proporção de uso agropecuário num raio de vizinhança
LIMIARES_C = {
    5: (0.7, 1.0),   # >70% agropecuário ao redor = altíssima pressão
    4: (0.5, 0.7),   # 50-70%
    3: (0.3, 0.5),   # 30-50%
    2: (0.1, 0.3),   # 10-30%
    1: (0.0, 0.1),   # <10% = baixa pressão de conversão
}

# Componente E (Extraibilidade) - escala 1 a 5
# Combinação de cobertura florestal + mineração

# Probabilidades de perda em 20 anos por classe de risco
# Conforme Hectares Indicator (VENDRUSCULO et al., 2019)
PROB_PERDA_20 = {
    1: 0.10,  # risco muito baixo
    2: 0.30,  # risco baixo
    3: 0.50,  # risco médio
    4: 0.70,  # risco alto
    5: 0.90,  # risco muito alto
}

# Horizonte temporal de referência (anos)
HORIZONTE_REF = 20

# Período de análise (série PRODES disponível)
ANO_INICIO = 2008
ANO_FIM = 2024

# URLs de dados públicos
URLS = {
    "municipios_mt": "https://servicodados.ibge.gov.br/api/v3/malhas/estados/51?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=municipio",
    "limite_mt": "https://servicodados.ibge.gov.br/api/v3/malhas/estados/51?formato=application/vnd.geo+json&qualidade=intermediaria",
    # Rodovias SNV/DNIT - shapefile nacional (recortar para MT)
    "rodovias_dnit": "https://servicos.dnit.gov.br/dnitcloud/index.php/s/oTpGaLfcFxpifEH/download",
    # Terras Indígenas - FUNAI
    "terras_indigenas": "https://geoserver.funai.gov.br/geoserver/Funai/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=Funai:tis_poligonais&outputFormat=SHAPE-ZIP",
    # Unidades de Conservação - MMA/CNUC
    "ucs_federais": "https://dados.mma.gov.br/dataset/44b6dc8a-dc82-4a84-8a95-1b1bf7d4e2e3/resource/fedcbc0e-59c4-4e56-b761-a4b44c4a46d0/download/ucsfederal.zip",
    # SIGMINE/ANM - processos minerários
    "mineracao_anm": "https://geo.anm.gov.br/portal/apps/webappviewer/index.html",
}

# Cores para visualização do raster de risco (RGB)
CORES_RISCO = {
    1: (34, 139, 34),     # verde escuro - risco muito baixo
    2: (144, 238, 144),   # verde claro - risco baixo
    3: (255, 255, 0),     # amarelo - risco médio
    4: (255, 165, 0),     # laranja - risco alto
    5: (255, 0, 0),       # vermelho - risco muito alto
}
