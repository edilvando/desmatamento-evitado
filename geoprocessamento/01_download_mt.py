"""
Etapa 01 - Download automático dos dados geoespaciais para Mato Grosso

Fontes:
- Limites municipais: IBGE (API de malhas)
- Rodovias: SNV/DNIT (shapefile nacional, recortado para MT)
- Terras Indígenas: FUNAI (geoserver WFS)
- Unidades de Conservação: MMA/CNUC (dados abertos)
- Quilombos: INCRA (dados abertos)
- Processos minerários: ANM/SIGMINE
- Cobertura e uso do solo: MapBiomas (via Google Earth Engine ou download direto)

O MapBiomas pode ser baixado automaticamente se o pacote 'earthengine-api' estiver
instalado e autenticado, ou manualmente via plataforma web.
"""
import os
import sys
import zipfile
import requests
from tqdm import tqdm
from config import DADOS_BRUTOS_DIR, URLS

# Tentar importar earthengine para download automático do MapBiomas
try:
    import ee
    EE_DISPONIVEL = True
except ImportError:
    EE_DISPONIVEL = False


def download_arquivo(url, destino, descricao="", timeout=180):
    """Baixa um arquivo com barra de progresso."""
    if os.path.exists(destino):
        print(f"  [OK] Já existe: {os.path.basename(destino)}")
        return True

    print(f"  Baixando: {descricao or url}")
    try:
        resp = requests.get(url, stream=True, timeout=timeout, verify=True,
                            headers={"User-Agent": "Mozilla/5.0 ACEU-Pipeline/1.0"})
        resp.raise_for_status()
        total = int(resp.headers.get("content-length", 0))

        with open(destino, "wb") as f:
            with tqdm(total=total, unit="B", unit_scale=True, desc=os.path.basename(destino)) as pbar:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)
                    pbar.update(len(chunk))
        return True
    except Exception as e:
        print(f"  [ERRO] Falha no download: {e}")
        if os.path.exists(destino):
            os.remove(destino)
        return False


def extrair_zip(arquivo_zip, destino_dir):
    """Extrai um arquivo ZIP para o diretório indicado."""
    if not os.path.exists(arquivo_zip):
        return False
    print(f"  Extraindo: {os.path.basename(arquivo_zip)}")
    with zipfile.ZipFile(arquivo_zip, "r") as z:
        z.extractall(destino_dir)
    return True


def download_municipios_mt():
    """Baixa malha municipal do MT via API do IBGE (GeoJSON)."""
    print("\n[1/8] Malha municipal do Mato Grosso (IBGE)")
    destino = os.path.join(DADOS_BRUTOS_DIR, "municipios_mt.geojson")
    url = URLS["municipios_mt"]
    return download_arquivo(url, destino, "Malha municipal MT - IBGE")


def download_limite_mt():
    """Baixa limite estadual do MT via API do IBGE (GeoJSON)."""
    print("\n[2/8] Limite estadual do Mato Grosso (IBGE)")
    destino = os.path.join(DADOS_BRUTOS_DIR, "limite_mt.geojson")
    url = URLS["limite_mt"]
    return download_arquivo(url, destino, "Limite estadual MT - IBGE")


def download_rodovias():
    """
    Baixa rodovias do SNV/DNIT.
    Alternativa: OpenStreetMap via Geofabrik (Centro-Oeste).
    """
    print("\n[3/8] Rodovias SNV/DNIT")
    destino_zip = os.path.join(DADOS_BRUTOS_DIR, "rodovias_snv.zip")
    destino_dir = os.path.join(DADOS_BRUTOS_DIR, "rodovias")

    if os.path.exists(destino_dir) and any(f.endswith(".shp") for f in os.listdir(destino_dir)):
        print("  [OK] Já existe: rodovias/")
        return True

    # Tenta download direto do DNIT
    sucesso = download_arquivo(
        URLS["rodovias_dnit"],
        destino_zip,
        "Rodovias SNV/DNIT (shapefile nacional)"
    )

    if not sucesso:
        # Alternativa: Geofabrik (OpenStreetMap)
        print("  Tentando alternativa: OpenStreetMap/Geofabrik...")
        url_geofabrik = "https://download.geofabrik.de/south-america/brazil/centro-oeste-latest-free.shp.zip"
        destino_zip_osm = os.path.join(DADOS_BRUTOS_DIR, "rodovias_osm.zip")
        sucesso = download_arquivo(url_geofabrik, destino_zip_osm, "Rodovias OSM - Geofabrik Centro-Oeste")
        if sucesso:
            destino_zip = destino_zip_osm
            destino_dir = os.path.join(DADOS_BRUTOS_DIR, "rodovias_osm")

    if sucesso:
        os.makedirs(destino_dir, exist_ok=True)
        extrair_zip(destino_zip, destino_dir)
        return True
    else:
        print("  [AVISO] Download automático falhou.")
        print("  Baixe manualmente de: https://www.gov.br/dnit/pt-br/assuntos/atlas-e-mapas/shapefiles")
        print(f"  Salve como: {destino_zip}")
        return False


def download_terras_indigenas():
    """Baixa Terras Indígenas da FUNAI via WFS."""
    print("\n[4/8] Terras Indígenas (FUNAI)")
    destino_zip = os.path.join(DADOS_BRUTOS_DIR, "terras_indigenas.zip")
    destino_dir = os.path.join(DADOS_BRUTOS_DIR, "terras_indigenas")

    if os.path.exists(destino_dir) and any(f.endswith(".shp") for f in os.listdir(destino_dir)):
        print("  [OK] Já existe: terras_indigenas/")
        return True

    sucesso = download_arquivo(
        URLS["terras_indigenas"],
        destino_zip,
        "Terras Indígenas - FUNAI (WFS)"
    )

    if sucesso:
        os.makedirs(destino_dir, exist_ok=True)
        extrair_zip(destino_zip, destino_dir)
        return True
    else:
        print("  [AVISO] Download automático falhou.")
        print("  Baixe manualmente de: https://www.gov.br/funai/pt-br/atuacao/terras-indigenas/geoprocessamento-e-mapas")
        print(f"  Salve como: {destino_zip}")
        return False


def download_ucs():
    """Baixa Unidades de Conservação do MMA/CNUC."""
    print("\n[5/8] Unidades de Conservação (MMA/CNUC)")
    destino_zip = os.path.join(DADOS_BRUTOS_DIR, "ucs_federais.zip")
    destino_dir = os.path.join(DADOS_BRUTOS_DIR, "ucs")

    if os.path.exists(destino_dir) and any(f.endswith(".shp") for f in os.listdir(destino_dir)):
        print("  [OK] Já existe: ucs/")
        return True

    sucesso = download_arquivo(
        URLS["ucs_federais"],
        destino_zip,
        "UCs Federais - MMA/CNUC"
    )

    if sucesso:
        os.makedirs(destino_dir, exist_ok=True)
        extrair_zip(destino_zip, destino_dir)
        return True
    else:
        print("  [AVISO] Download automático falhou.")
        print("  Baixe manualmente de: https://dados.mma.gov.br/dataset/unidadesdeconservacao")
        print(f"  Salve como: {destino_zip}")
        return False


def download_quilombos():
    """Baixa territórios quilombolas do INCRA."""
    print("\n[6/8] Territórios Quilombolas (INCRA)")
    destino_dir = os.path.join(DADOS_BRUTOS_DIR, "quilombos")

    if os.path.exists(destino_dir) and any(
        f.endswith(".shp") or f.endswith(".geojson") for f in os.listdir(destino_dir)
    ):
        print("  [OK] Já existe: quilombos/")
        return True

    os.makedirs(destino_dir, exist_ok=True)

    # Tentar download via dados.gov.br
    url_incra = "https://certificacao.incra.gov.br/csv_shp/export_shp.py"
    destino_zip = os.path.join(DADOS_BRUTOS_DIR, "quilombos.zip")
    sucesso = download_arquivo(url_incra, destino_zip, "Quilombos - INCRA")

    if sucesso:
        extrair_zip(destino_zip, destino_dir)
        return True
    else:
        print("  [AVISO] Download automático falhou.")
        print("  Baixe manualmente de: https://dados.gov.br/dados/conjuntos-dados/sistema-de-certificacao-de-comunidades-quilombolas")
        print(f"  Salve o shapefile em: {destino_dir}/")
        return False


def download_mapbiomas():
    """
    Baixa o raster de uso do solo do MapBiomas.
    
    Estratégia:
    1. Se earthengine-api estiver instalado e autenticado: download via GEE
    2. Se não: tenta links diretos do MapBiomas (storage público)
    3. Fallback: instruções para download manual
    """
    print("\n[7/8] Cobertura e Uso do Solo - MapBiomas")
    destino = os.path.join(DADOS_BRUTOS_DIR, "mapbiomas_mt.tif")

    if os.path.exists(destino):
        print("  [OK] Já existe: mapbiomas_mt.tif")
        return True

    # Estratégia 1: Google Earth Engine
    if EE_DISPONIVEL:
        print("  Tentando download via Google Earth Engine...")
        try:
            ee.Initialize()
            sucesso = _download_mapbiomas_gee(destino)
            if sucesso:
                return True
        except Exception as e:
            print(f"  [AVISO] GEE não autenticado ou falhou: {e}")
            print("  Para autenticar: earthengine authenticate")

    # Estratégia 2: Links diretos do MapBiomas (storage GCS público)
    print("  Tentando download direto do MapBiomas (storage público)...")
    # MapBiomas disponibiliza via Google Cloud Storage
    # Coleção 9, integração, ano 2022, recorte MT
    urls_mapbiomas = [
        # Link direto para o MT (se disponível)
        "https://storage.googleapis.com/mapbiomas-public/initiatives/brasil/collection_9/lclu/coverage/brasil_coverage_2022.tif",
        # Alternativa: recorte estadual
        "https://storage.googleapis.com/mapbiomas-public/initiatives/brasil/collection_8/lclu/coverage/brasil_coverage_2022.tif",
    ]

    for url in urls_mapbiomas:
        sucesso = download_arquivo(url, destino, "MapBiomas - Cobertura 2022 (storage público)", timeout=600)
        if sucesso:
            print("  Download do MapBiomas concluído.")
            print("  Nota: arquivo pode ser grande (Brasil inteiro). O pipeline recorta automaticamente para o MT.")
            return True

    # Estratégia 3: Instruções manuais
    print("")
    print("  ╔══════════════════════════════════════════════════════════════════╗")
    print("  ║  DOWNLOAD MANUAL DO MAPBIOMAS NECESSÁRIO                        ║")
    print("  ╠══════════════════════════════════════════════════════════════════╣")
    print("  ║                                                                  ║")
    print("  ║  Opção A - Via plataforma web:                                   ║")
    print("  ║  1. Acesse: https://brasil.mapbiomas.org/en/downloads/           ║")
    print("  ║  2. Collection 9 > Coverage and Land Use                         ║")
    print("  ║  3. Baixe para o Brasil ou MT (ano 2022 ou 2023)                 ║")
    print(f"  ║  4. Salve como: mapbiomas_mt.tif                                 ║")
    print("  ║                                                                  ║")
    print("  ║  Opção B - Via Google Earth Engine (recomendado):                 ║")
    print("  ║  1. pip install earthengine-api                                  ║")
    print("  ║  2. earthengine authenticate                                     ║")
    print("  ║  3. Execute: python download_mapbiomas_gee.py                    ║")
    print("  ║                                                                  ║")
    print("  ║  Opção C - Via QGIS Plugin MapBiomas:                            ║")
    print("  ║  1. Instale o plugin MapBiomas no QGIS                           ║")
    print("  ║  2. Exporte o raster para o MT                                   ║")
    print("  ║                                                                  ║")
    print("  ╚══════════════════════════════════════════════════════════════════╝")
    print(f"  Destino: {destino}")
    return False


def _download_mapbiomas_gee(destino):
    """Download do MapBiomas via Google Earth Engine."""
    import ee
    import urllib.request

    # Imagem MapBiomas Collection 9
    mapbiomas = ee.Image(
        "projects/mapbiomas-workspace/public/collection9/mapbiomas_collection90_integration_v1"
    )

    # Selecionar banda do ano 2022
    banda = "classification_2022"
    img = mapbiomas.select(banda)

    # Bounding box do Mato Grosso
    mt_bbox = ee.Geometry.Rectangle([-61.63, -18.05, -50.22, -7.35])

    # Recortar para MT
    img_mt = img.clip(mt_bbox)

    # Gerar URL de download
    url = img_mt.getDownloadURL({
        "scale": 30,
        "crs": "EPSG:4326",
        "region": mt_bbox,
        "format": "GEO_TIFF",
        "maxPixels": 1e10,
    })

    print(f"  URL gerada. Baixando (~500MB)...")
    urllib.request.urlretrieve(url, destino)
    print(f"  Salvo: {destino}")
    return True


def download_mineracao():
    """Baixa processos minerários (SIGMINE/ANM)."""
    print("\n[8/8] Processos Minerários (SIGMINE/ANM)")
    destino_dir = os.path.join(DADOS_BRUTOS_DIR, "mineracao")

    if os.path.exists(destino_dir) and any(f.endswith(".shp") for f in os.listdir(destino_dir)):
        print("  [OK] Já existe: mineracao/")
        return True

    os.makedirs(destino_dir, exist_ok=True)

    # Tentar download via dados abertos ANM
    url_anm = "https://app.anm.gov.br/dadosabertos/SIGMINE/PROCESSOS_MINERARIOS/MT.zip"
    destino_zip = os.path.join(DADOS_BRUTOS_DIR, "mineracao_mt.zip")
    sucesso = download_arquivo(url_anm, destino_zip, "Processos Minerários MT - ANM")

    if sucesso:
        extrair_zip(destino_zip, destino_dir)
        return True
    else:
        print("  [AVISO] Download automático falhou.")
        print("  Baixe manualmente de: https://dados.gov.br/dados/conjuntos-dados/sistema-de-informacoes-geograficas-da-mineracao-sigmine")
        print(f"  Salve o shapefile em: {destino_dir}/")
        return False


def main():
    print("=" * 70)
    print("PIPELINE ACEU - ETAPA 01: DOWNLOAD DE DADOS")
    print("Foco: Estado do Mato Grosso")
    print("=" * 70)

    resultados = {}
    resultados["municipios"] = download_municipios_mt()
    resultados["limite"] = download_limite_mt()
    resultados["rodovias"] = download_rodovias()
    resultados["terras_indigenas"] = download_terras_indigenas()
    resultados["ucs"] = download_ucs()
    resultados["quilombos"] = download_quilombos()
    resultados["mapbiomas"] = download_mapbiomas()
    resultados["mineracao"] = download_mineracao()

    print("\n" + "=" * 70)
    print("RESUMO DOS DOWNLOADS")
    print("=" * 70)
    for nome, ok in resultados.items():
        status = "OK" if ok else "PENDENTE (ação manual necessária)"
        print(f"  {nome:20s} : {status}")

    pendentes = [k for k, v in resultados.items() if not v]
    if pendentes:
        print(f"\n  {len(pendentes)} item(ns) pendente(s) de download manual.")
        print("  Complete os downloads indicados acima antes de prosseguir.")
        print("  Após baixar, execute este script novamente para verificar.")
    else:
        print("\n  Todos os dados disponíveis. Prossiga para a etapa 02.")

    print("\n  Próximo passo: python 02_grade_mt.py")
    return len(pendentes) == 0


if __name__ == "__main__":
    sucesso = main()
    sys.exit(0 if sucesso else 1)
