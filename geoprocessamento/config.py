"""
Configurações centrais do pipeline ACEU - Mato Grosso
Todos os parâmetros de referência ficam aqui para facilitar ajustes.
"""
import os
import glob

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

# ============================================================
# CAMINHOS DOS DADOS REAIS
# O pipeline busca automaticamente os arquivos nas pastas.
# Se os nomes mudarem, ajuste aqui.
# ============================================================

def _buscar_arquivo(pasta, extensao=".shp", padrao=None):
    """Busca um arquivo numa pasta, opcionalmente filtrando por padrão no nome."""
    if not os.path.exists(pasta):
        return None
    for f in sorted(os.listdir(pasta)):
        if f.endswith(extensao):
            if padrao is None or padrao.lower() in f.lower():
                return os.path.join(pasta, f)
    return None


def _buscar_recursivo(pasta, extensao=".shp", padrao=None):
    """Busca recursivamente um arquivo numa pasta e subpastas."""
    if not os.path.exists(pasta):
        return None
    for root, dirs, files in os.walk(pasta):
        for f in sorted(files):
            if f.endswith(extensao):
                if padrao is None or padrao.lower() in f.lower():
                    return os.path.join(root, f)
    return None


# --- MapBiomas ---
# Arquivos: brazil_coverage_YYYY.tif na pasta dados_brutos/mapbiomas/
MAPBIOMAS_DIR = os.path.join(DADOS_BRUTOS_DIR, "mapbiomas")

def obter_mapbiomas(ano):
    """Retorna o caminho do GeoTIFF do MapBiomas para um ano específico."""
    if not os.path.exists(MAPBIOMAS_DIR):
        return None
    # Tentar padrão brazil_coverage_YYYY.tif
    caminho = os.path.join(MAPBIOMAS_DIR, f"brazil_coverage_{ano}.tif")
    if os.path.exists(caminho):
        return caminho
    # Tentar outros padrões
    for f in os.listdir(MAPBIOMAS_DIR):
        if str(ano) in f and (f.endswith(".tif") or f.endswith(".tiff")):
            return os.path.join(MAPBIOMAS_DIR, f)
    return None


# --- Terras Indígenas ---
# Arquivo: tis_poligonais.shp na pasta dados_brutos/terras_indigenas/
TERRAS_INDIGENAS_DIR = os.path.join(DADOS_BRUTOS_DIR, "terras_indigenas")

def obter_terras_indigenas():
    """Retorna o caminho do shapefile de Terras Indígenas."""
    return _buscar_arquivo(TERRAS_INDIGENAS_DIR, ".shp", "tis_poligonais")


# --- Unidades de Conservação ---
# Arquivo: cnuc_2025_08.shp (polígonos) na subpasta shp_cnuc_2025_08/
# A pasta pode ser unidades_conservacao_cnuc ou unidades_conservacao
UCS_DIR = os.path.join(DADOS_BRUTOS_DIR, "unidades_conservacao_cnuc")
if not os.path.exists(UCS_DIR):
    UCS_DIR = os.path.join(DADOS_BRUTOS_DIR, "unidades_conservacao")

def obter_ucs():
    """Retorna o caminho do shapefile de Unidades de Conservação (polígonos)."""
    # Buscar recursivamente o shapefile de polígonos (não o de pontos)
    # Priorizar arquivo sem "pontos" no nome
    if not os.path.exists(UCS_DIR):
        return None
    for root, dirs, files in os.walk(UCS_DIR):
        shps = [f for f in sorted(files) if f.endswith(".shp")]
        # Priorizar o que NÃO tem "pontos" no nome (queremos polígonos)
        poligonos = [f for f in shps if "ponto" not in f.lower()]
        if poligonos:
            return os.path.join(root, poligonos[0])
        if shps:
            return os.path.join(root, shps[0])
    return None


# --- Mineração ---
# Arquivo: MT.shp na pasta dados_brutos/mineracao/
MINERACAO_DIR = os.path.join(DADOS_BRUTOS_DIR, "mineracao")

def obter_mineracao():
    """Retorna o caminho do shapefile de processos minerários."""
    return _buscar_arquivo(MINERACAO_DIR, ".shp")


# --- Rodovias ---
# Os dados do SNV/DNIT estão em subpastas com ZIPs por período.
# Busca recursivamente o shapefile mais recente.
RODOVIAS_DIR = os.path.join(DADOS_BRUTOS_DIR, "rodovias_mt")
if not os.path.exists(RODOVIAS_DIR):
    RODOVIAS_DIR = os.path.join(DADOS_BRUTOS_DIR, "rodovias")

def obter_rodovias():
    """Retorna o caminho do shapefile de rodovias."""
    # Buscar recursivamente qualquer .shp na pasta de rodovias
    resultado = _buscar_recursivo(RODOVIAS_DIR, ".shp", "rota")
    if resultado:
        return resultado
    # Tentar qualquer .shp
    resultado = _buscar_recursivo(RODOVIAS_DIR, ".shp")
    if resultado:
        return resultado
    # Tentar pasta alternativa
    alt = os.path.join(DADOS_BRUTOS_DIR, "rodovias")
    return _buscar_recursivo(alt, ".shp")


# ============================================================
# ANOS DE ANÁLISE
# T0 = ano de referência (baseline de floresta)
# T1 = ano de avaliação (comparação)
# ============================================================
ANO_T0 = 2008  # Baseline
ANO_T1 = 2022  # Avaliação

# Período de análise
ANO_INICIO = 2008
ANO_FIM = 2022

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

# URLs de dados públicos
URLS = {
    "municipios_mt": "https://servicodados.ibge.gov.br/api/v3/malhas/estados/51?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=municipio",
    "limite_mt": "https://servicodados.ibge.gov.br/api/v3/malhas/estados/51?formato=application/vnd.geo+json&qualidade=intermediaria",
    "rodovias_dnit": "https://servicos.dnit.gov.br/dnitcloud/index.php/s/oTpGaLfcFxpifEH/download",
    "terras_indigenas": "https://geoserver.funai.gov.br/geoserver/Funai/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=Funai:tis_poligonais&outputFormat=SHAPE-ZIP",
    "ucs_federais": "https://dados.mma.gov.br/dataset/44b6dc8a-dc82-4a84-8a95-1b1bf7d4e2e3/resource/fedcbc0e-59c4-4e56-b761-a4b44c4a46d0/download/ucsfederal.zip",
    "mineracao_anm": "https://app.anm.gov.br/dadosabertos/SIGMINE/PROCESSOS_MINERARIOS/MT.zip",
}

# Cores para visualização do raster de risco (RGB)
CORES_RISCO = {
    1: (34, 139, 34),     # verde escuro - risco muito baixo
    2: (144, 238, 144),   # verde claro - risco baixo
    3: (255, 255, 0),     # amarelo - risco médio
    4: (255, 165, 0),     # laranja - risco alto
    5: (255, 0, 0),       # vermelho - risco muito alto
}
