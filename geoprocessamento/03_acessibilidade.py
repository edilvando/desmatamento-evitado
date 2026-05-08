"""
Etapa 03 - Componente A: Acessibilidade (distância às rodovias)

Processo:
1. Carrega shapefile de rodovias (SNV/DNIT ou OpenStreetMap)
2. Recorta para o Mato Grosso
3. Reprojeta para EPSG:31981
4. Rasteriza rodovias na grade de referência
5. Calcula distância euclidiana de cada pixel à rodovia mais próxima
6. Reclassifica em 5 classes conforme limiares do Hectares Indicator

Saída: rasters/componente_a.tif (uint8, valores 1 a 5)

Referência:
ECOMETRICA. The Hectares Indicator Methods and Guidance. Version 2.0. Edinburgh, 2019.
"""
import os
import numpy as np
import geopandas as gpd
import rasterio
from rasterio.features import rasterize
from scipy.ndimage import distance_transform_edt
from config import (
    DADOS_BRUTOS_DIR, RASTERS_DIR,
    CRS_PROJETO, RESOLUCAO, LIMIARES_A
)


def carregar_grade_referencia():
    """Carrega metadados e máscara da grade de referência."""
    caminho_grade = os.path.join(RASTERS_DIR, "grade_mt.tif")
    caminho_mascara = os.path.join(RASTERS_DIR, "mascara_mt.tif")

    if not os.path.exists(caminho_grade):
        raise FileNotFoundError("Grade não encontrada. Execute 02_grade_mt.py primeiro.")

    with rasterio.open(caminho_grade) as src:
        meta = src.meta.copy()
        transform = src.transform
        shape = (src.height, src.width)

    with rasterio.open(caminho_mascara) as src:
        mascara = src.read(1)

    return meta, transform, shape, mascara


def carregar_rodovias():
    """
    Carrega shapefile de rodovias. Tenta múltiplas fontes:
    1. SNV/DNIT (dados_brutos/rodovias/)
    2. OpenStreetMap/Geofabrik (dados_brutos/rodovias_osm/)
    3. Qualquer .shp na pasta dados_brutos/ com 'rodovia' no nome
    """
    # Tentar SNV/DNIT
    pasta_dnit = os.path.join(DADOS_BRUTOS_DIR, "rodovias")
    if os.path.exists(pasta_dnit):
        shps = [f for f in os.listdir(pasta_dnit) if f.endswith(".shp")]
        if shps:
            caminho = os.path.join(pasta_dnit, shps[0])
            print(f"  Fonte: SNV/DNIT ({shps[0]})")
            return gpd.read_file(caminho)

    # Tentar OSM/Geofabrik
    pasta_osm = os.path.join(DADOS_BRUTOS_DIR, "rodovias_osm")
    if os.path.exists(pasta_osm):
        shps = [f for f in os.listdir(pasta_osm) if f.endswith(".shp")]
        # Procurar o arquivo de roads
        roads = [f for f in shps if "road" in f.lower() or "rodovia" in f.lower()]
        if roads:
            caminho = os.path.join(pasta_osm, roads[0])
            print(f"  Fonte: OpenStreetMap/Geofabrik ({roads[0]})")
            return gpd.read_file(caminho)
        elif shps:
            caminho = os.path.join(pasta_osm, shps[0])
            print(f"  Fonte: OpenStreetMap/Geofabrik ({shps[0]})")
            return gpd.read_file(caminho)

    # Busca genérica
    for f in os.listdir(DADOS_BRUTOS_DIR):
        if f.endswith(".shp") and "rodovia" in f.lower():
            caminho = os.path.join(DADOS_BRUTOS_DIR, f)
            print(f"  Fonte: {f}")
            return gpd.read_file(caminho)

    raise FileNotFoundError(
        "Shapefile de rodovias não encontrado.\n"
        "Coloque o shapefile em dados_brutos/rodovias/ ou dados_brutos/rodovias_osm/\n"
        "Fontes:\n"
        "  - DNIT: https://www.gov.br/dnit/pt-br/assuntos/atlas-e-mapas/shapefiles\n"
        "  - Geofabrik (OSM): https://download.geofabrik.de/south-america/brazil/centro-oeste-latest-free.shp.zip"
    )


def recortar_para_mt(gdf_rodovias, mascara_bounds):
    """Recorta rodovias para a extensão do MT (bounding box)."""
    gdf_rodovias = gdf_rodovias.to_crs(CRS_PROJETO)
    # Clip pelo bounding box para performance
    from shapely.geometry import box
    bbox = box(*mascara_bounds)
    gdf_clip = gdf_rodovias.clip(bbox)
    print(f"  Rodovias após recorte: {len(gdf_clip)} feições")
    return gdf_clip


def rasterizar_rodovias(gdf_rodovias, shape, transform):
    """
    Rasteriza as linhas de rodovias: pixels com rodovia = 1, resto = 0.
    """
    geometrias = [(geom, 1) for geom in gdf_rodovias.geometry if geom is not None]
    raster_rodovias = rasterize(
        geometrias,
        out_shape=shape,
        transform=transform,
        fill=0,
        dtype=np.uint8,
    )
    n_pixels = np.sum(raster_rodovias == 1)
    print(f"  Pixels com rodovia: {n_pixels:,}")
    return raster_rodovias


def calcular_distancia(raster_rodovias, resolucao):
    """
    Calcula distância euclidiana de cada pixel à rodovia mais próxima.
    Usa scipy.ndimage.distance_transform_edt que é otimizado e rápido.
    O resultado é em metros (multiplicado pela resolução).
    """
    # distance_transform_edt calcula distância dos pixels 0 ao pixel 1 mais próximo
    # Precisamos inverter: queremos distância dos pixels SEM rodovia à rodovia mais próxima
    # Pixels com rodovia = 1, sem rodovia = 0
    # EDT calcula distância de cada pixel 0 ao 1 mais próximo... na verdade é o contrário:
    # EDT calcula distância de cada pixel != 0 ao pixel 0 mais próximo
    # Então: invertemos para que rodovia = 0 e o resto = 1
    binario = (raster_rodovias == 0).astype(np.uint8)  # 1 onde NÃO tem rodovia

    print("  Calculando distância euclidiana (pode levar 30-60s)...")
    distancia = distance_transform_edt(binario, sampling=[resolucao, resolucao])

    print(f"  Distância mínima: {distancia.min():.0f} m")
    print(f"  Distância máxima: {distancia.max():.0f} m")
    print(f"  Distância média: {distancia.mean():.0f} m")
    print(f"  Distância mediana: {np.median(distancia):.0f} m")

    return distancia.astype(np.float32)


def reclassificar_acessibilidade(distancia, mascara):
    """
    Reclassifica o raster de distância em 5 classes de acessibilidade.
    Classe 5 = muito acessível (perto de rodovia) = maior pressão
    Classe 1 = pouco acessível (longe de rodovia) = menor pressão
    """
    componente_a = np.zeros_like(mascara, dtype=np.uint8)

    for classe, (dist_min, dist_max) in LIMIARES_A.items():
        if dist_max == float("inf"):
            condicao = (distancia >= dist_min) & (mascara == 1)
        else:
            condicao = (distancia >= dist_min) & (distancia < dist_max) & (mascara == 1)
        componente_a[condicao] = classe

    # Estatísticas por classe
    print("  Distribuição de classes (dentro do MT):")
    for classe in range(1, 6):
        n = np.sum(componente_a == classe)
        pct = n / np.sum(mascara == 1) * 100
        print(f"    Classe {classe}: {n:>12,} pixels ({pct:5.1f}%)")

    return componente_a


def salvar_raster(dados, meta, nome_arquivo):
    """Salva um array como GeoTIFF."""
    caminho = os.path.join(RASTERS_DIR, nome_arquivo)
    meta_out = meta.copy()
    meta_out["dtype"] = dados.dtype.name
    meta_out["compress"] = "lzw"

    with rasterio.open(caminho, "w", **meta_out) as dst:
        dst.write(dados, 1)

    tamanho_mb = os.path.getsize(caminho) / 1024 / 1024
    print(f"  Salvo: {caminho} ({tamanho_mb:.1f} MB)")
    return caminho


def main():
    print("=" * 70)
    print("PIPELINE ACEU - ETAPA 03: COMPONENTE A (ACESSIBILIDADE)")
    print("=" * 70)

    print("\n[1] Carregando grade de referência...")
    meta, transform, shape, mascara = carregar_grade_referencia()
    print(f"  Grade: {shape[1]} x {shape[0]} pixels")

    # Calcular bounds para recorte
    minx = transform.c
    maxy = transform.f
    maxx = minx + shape[1] * RESOLUCAO
    miny = maxy - shape[0] * RESOLUCAO
    bounds = (minx, miny, maxx, maxy)

    print("\n[2] Carregando rodovias...")
    gdf_rodovias = carregar_rodovias()
    print(f"  Total de feições: {len(gdf_rodovias)}")

    print("\n[3] Recortando para o MT...")
    gdf_rodovias = recortar_para_mt(gdf_rodovias, bounds)

    print("\n[4] Rasterizando rodovias...")
    raster_rodovias = rasterizar_rodovias(gdf_rodovias, shape, transform)

    print("\n[5] Calculando distância euclidiana...")
    distancia = calcular_distancia(raster_rodovias, RESOLUCAO)

    # Salvar raster de distância (útil para inspeção)
    salvar_raster(distancia, meta, "distancia_rodovias_mt.tif")

    print("\n[6] Reclassificando em classes de acessibilidade...")
    componente_a = reclassificar_acessibilidade(distancia, mascara)

    print("\n[7] Salvando componente A...")
    salvar_raster(componente_a, meta, "componente_a.tif")

    print("\n[OK] Etapa 03 concluída.")
    print("  Próximo passo: python 04_protecao.py")


if __name__ == "__main__":
    main()
