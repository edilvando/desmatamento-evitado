"""
Script auxiliar: Download do MapBiomas via Google Earth Engine

Pré-requisitos:
    pip install earthengine-api
    earthengine authenticate

Este script baixa o raster de cobertura e uso do solo do MapBiomas
(Coleção 9, ano 2022) recortado para o Mato Grosso.

Uso:
    python download_mapbiomas_gee.py

O arquivo será salvo como: dados_brutos/mapbiomas_mt.tif
"""
import os
import sys

try:
    import ee
except ImportError:
    print("ERRO: pacote 'earthengine-api' não instalado.")
    print("Instale com: pip install earthengine-api")
    print("Depois autentique: earthengine authenticate")
    sys.exit(1)

from config import DADOS_BRUTOS_DIR


def main():
    print("=" * 60)
    print("DOWNLOAD MAPBIOMAS VIA GOOGLE EARTH ENGINE")
    print("=" * 60)

    destino = os.path.join(DADOS_BRUTOS_DIR, "mapbiomas_mt.tif")
    if os.path.exists(destino):
        print(f"Arquivo já existe: {destino}")
        print("Delete-o se quiser baixar novamente.")
        return

    # Inicializar Earth Engine
    print("\n[1] Inicializando Earth Engine...")
    try:
        ee.Initialize()
        print("  OK - autenticado")
    except Exception as e:
        print(f"  ERRO: {e}")
        print("  Execute: earthengine authenticate")
        sys.exit(1)

    # Carregar imagem MapBiomas
    print("\n[2] Carregando MapBiomas Collection 9...")
    mapbiomas = ee.Image(
        "projects/mapbiomas-workspace/public/collection9/"
        "mapbiomas_collection90_integration_v1"
    )

    # Selecionar ano 2022
    ano = "classification_2022"
    img = mapbiomas.select(ano)
    print(f"  Banda selecionada: {ano}")

    # Definir bounding box do Mato Grosso
    # Coordenadas: lon_min, lat_min, lon_max, lat_max
    mt_bbox = ee.Geometry.Rectangle([-61.63, -18.05, -50.22, -7.35])
    print("  Bounding box MT: [-61.63, -18.05, -50.22, -7.35]")

    # Recortar
    img_mt = img.clip(mt_bbox)

    # Gerar URL de download
    print("\n[3] Gerando URL de download (pode levar 1-2 min)...")
    try:
        url = img_mt.getDownloadURL({
            "scale": 30,
            "crs": "EPSG:4326",
            "region": mt_bbox,
            "format": "GEO_TIFF",
            "maxPixels": 1e10,
        })
        print(f"  URL gerada com sucesso")
    except Exception as e:
        print(f"  ERRO ao gerar URL: {e}")
        print("  O arquivo pode ser muito grande para download direto.")
        print("  Alternativa: use o Earth Engine Code Editor para exportar para o Drive.")
        print("  Código para o Code Editor:")
        print("")
        print("  var mapbiomas = ee.Image('projects/mapbiomas-workspace/public/collection9/mapbiomas_collection90_integration_v1');")
        print("  var mt = ee.Geometry.Rectangle([-61.63, -18.05, -50.22, -7.35]);")
        print("  Export.image.toDrive({")
        print("    image: mapbiomas.select('classification_2022').clip(mt),")
        print("    description: 'mapbiomas_mt_2022',")
        print("    scale: 30,")
        print("    region: mt,")
        print("    maxPixels: 1e10,")
        print("    fileFormat: 'GeoTIFF'")
        print("  });")
        sys.exit(1)

    # Download
    print("\n[4] Baixando raster (~300-500 MB)...")
    print("  Isso pode levar 5-15 minutos dependendo da conexão.")
    import urllib.request
    urllib.request.urlretrieve(url, destino)

    tamanho_mb = os.path.getsize(destino) / 1024 / 1024
    print(f"\n  Download concluído: {destino}")
    print(f"  Tamanho: {tamanho_mb:.1f} MB")
    print("\n  Próximo passo: python run_all.py --from 2")


if __name__ == "__main__":
    main()
