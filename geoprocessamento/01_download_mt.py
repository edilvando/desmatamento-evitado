"""
Etapa 01 - Download automático dos dados geoespaciais para Mato Grosso

Fontes:
- Limites municipais: IBGE (API de malhas)
- Rodovias: SNV/DNIT (shapefile nacional, recortado para MT)
- Terras Indígenas: FUNAI (geoserver WFS)
- Unidades de Conservação: MMA/CNUC (dados abertos)
- Quilombos: INCRA (dados abertos)
- Processos minerários: ANM/SIGMINE
- Cobertura e uso do solo: MapBiomas (coleção mais recente)

Nota: Alguns downloads podem exigir acesso manual (MapBiomas, SIGMINE).
Nestes casos, o script indica onde baixar e onde salvar o arquivo.
"""
import os
import sys
import zipfile
import requests
from tqdm import tqdm
from config import DADOS_BRUTOS_DIR, URLS

def download_arquivo(url, destino, descricao=""):
    """Baixa um arquivo com barra de progresso."""
    if os.path.exists(destino):
        print(f"  [OK] Já existe: {os.path.basename(destino)}")
        return True

    print(f"  Baixando: {descricao or url}")
    try:
        resp = requests.get(url, stream=True, timeout=120, verify=True)
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
    print("\n[1/7] Malha municipal do Mato Grosso (IBGE)")
    destino = os.path.join(DADOS_BRUTOS_DIR, "municipios_mt.geojson")
    url = URLS["municipios_mt"]
    return download_arquivo(url, destino, "Malha municipal MT - IBGE")


def download_limite_mt():
    """Baixa limite estadual do MT via API do IBGE (GeoJSON)."""
    print("\n[2/7] Limite estadual do Mato Grosso (IBGE)")
    destino = os.path.join(DADOS_BRUTOS_DIR, "limite_mt.geojson")
    url = URLS["limite_mt"]
    return download_arquivo(url, destino, "Limite estadual MT - IBGE")


def download_rodovias():
    """
    Baixa rodovias do SNV/DNIT.
    O shapefile nacional é grande (~200MB). Após download, será recortado para MT.
    
    Alternativa: se o download direto falhar, baixar manualmente de:
    https://www.gov.br/dnit/pt-br/assuntos/atlas-e-mapas/shapefiles
    Salvar como: dados_brutos/rodovias_snv.zip
    """
    print("\n[3/7] Rodovias SNV/DNIT")
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

    if sucesso:
        os.makedirs(destino_dir, exist_ok=True)
        extrair_zip(destino_zip, destino_dir)
        return True
    else:
        print("  [AVISO] Download automático falhou.")
        print("  Baixe manualmente de: https://www.gov.br/dnit/pt-br/assuntos/atlas-e-mapas/shapefiles")
        print(f"  Salve como: {destino_zip}")
        print("  Ou use dados do OpenStreetMap (Geofabrik) como alternativa:")
        print("  https://download.geofabrik.de/south-america/brazil/centro-oeste-latest-free.shp.zip")
        return False


def download_terras_indigenas():
    """Baixa Terras Indígenas da FUNAI via WFS."""
    print("\n[4/7] Terras Indígenas (FUNAI)")
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
    print("\n[5/7] Unidades de Conservação (MMA/CNUC)")
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
        print("  Alternativa: https://www.gov.br/icmbio/pt-br/servicos/geoprocessamento/mapa-tematico-e-dados-geoestatisticos-das-unidades-de-conservacao-federais")
        return False


def download_quilombos():
    """
    Baixa territórios quilombolas do INCRA.
    Nota: o INCRA nem sempre mantém download direto estável.
    """
    print("\n[6/7] Territórios Quilombolas (INCRA)")
    destino_dir = os.path.join(DADOS_BRUTOS_DIR, "quilombos")

    if os.path.exists(destino_dir) and any(f.endswith(".shp") or f.endswith(".geojson") for f in os.listdir(destino_dir)):
        print("  [OK] Já existe: quilombos/")
        return True

    os.makedirs(destino_dir, exist_ok=True)
    print("  [AVISO] Download de quilombos requer acesso manual.")
    print("  Fonte: https://certificacao.incra.gov.br/csv_shp/export_shp.py")
    print("  Alternativa: https://dados.gov.br/dados/conjuntos-dados/sistema-de-certificacao-de-comunidades-quilombolas")
    print(f"  Salve o shapefile em: {destino_dir}/")
    return False


def instrucoes_mapbiomas():
    """Instruções para download do MapBiomas (requer acesso à plataforma)."""
    print("\n[7/7] Cobertura e Uso do Solo - MapBiomas")
    destino = os.path.join(DADOS_BRUTOS_DIR, "mapbiomas_mt.tif")

    if os.path.exists(destino):
        print("  [OK] Já existe: mapbiomas_mt.tif")
        return True

    print("  [AÇÃO NECESSÁRIA] O MapBiomas requer download manual via plataforma.")
    print("  ")
    print("  Passos:")
    print("  1. Acesse: https://brasil.mapbiomas.org/en/downloads/")
    print("  2. Selecione: Collection 9 (ou mais recente)")
    print("  3. Selecione: Coverage and Land Use > Brazil")
    print("  4. Baixe o raster para o estado do Mato Grosso (ou Brasil e recorte depois)")
    print("  5. Ano de referência: 2022 ou 2023 (mais recente disponível)")
    print(f"  6. Salve como: {destino}")
    print("  ")
    print("  Alternativa via Google Earth Engine:")
    print("  var mapbiomas = ee.Image('projects/mapbiomas-workspace/public/collection9/mapbiomas_collection90_integration_v1')")
    print("  Selecione a banda do ano desejado e exporte para o MT.")
    print("  ")
    print("  Classes relevantes para o componente C (cultivabilidade):")
    print("  - 15: Pastagem")
    print("  - 39: Soja")
    print("  - 20: Cana-de-açúcar")
    print("  - 40: Arroz")
    print("  - 62: Algodão")
    print("  - 41: Outras lavouras temporárias")
    print("  - 46: Café")
    print("  - 47: Citrus")
    print("  - 48: Outras lavouras perenes")
    print("  - 9: Silvicultura")
    print("  - 21: Mosaico de usos")
    print("  ")
    print("  Classes relevantes para o componente E (extraibilidade - floresta):")
    print("  - 3: Formação Florestal")
    print("  - 4: Formação Savânica")
    print("  - 5: Mangue")
    print("  - 6: Floresta Alagável")
    print("  - 49: Restinga Arborizada")
    return False


def download_mineracao():
    """Instruções para download de processos minerários (SIGMINE/ANM)."""
    print("\n[EXTRA] Processos Minerários (SIGMINE/ANM)")
    destino_dir = os.path.join(DADOS_BRUTOS_DIR, "mineracao")

    if os.path.exists(destino_dir) and any(f.endswith(".shp") for f in os.listdir(destino_dir)):
        print("  [OK] Já existe: mineracao/")
        return True

    os.makedirs(destino_dir, exist_ok=True)
    print("  [AÇÃO NECESSÁRIA] Download via SIGMINE:")
    print("  1. Acesse: https://geo.anm.gov.br/portal/apps/webappviewer/index.html?id=6a8f5ccc4b6a4c2bba79759aa952d908")
    print("  2. Use a ferramenta de download/export para o estado do MT")
    print("  3. Ou acesse via dados abertos: https://dados.gov.br/dados/conjuntos-dados/sistema-de-informacoes-geograficas-da-mineracao-sigmine")
    print(f"  4. Salve o shapefile em: {destino_dir}/")
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
    resultados["mapbiomas"] = instrucoes_mapbiomas()
    download_mineracao()

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

    return len(pendentes) == 0


if __name__ == "__main__":
    sucesso = main()
    sys.exit(0 if sucesso else 1)
