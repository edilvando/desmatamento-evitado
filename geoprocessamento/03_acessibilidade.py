"""
Etapa 03 - Componente A: Acessibilidade (distância às rodovias)

Processo:
1. Carrega shapefile de rodovias (SNV/DNIT)
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
    CRS_PROJETO, RESOLUCAO, LIMIARES_A,
    obter_rodovias
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
    Carrega shapefile de rodovias usando a busca inteligente do config.
    Se o arquivo for um ZIP dentro de subpasta, descompacta primeiro.
    """
    caminho = obter_rodovias()
    if caminho is not None:
        print(f"  Fonte: {os.path.basename(caminho)}")
        print(f"  Caminho: {caminho}")
        return gpd.read_file(caminho)

    # Se não encontrou .shp, tentar descompactar o ZIP mais recente
    import zipfile
    rodovias_dir = os.path.join(DADOS_BRUTOS_DIR, "rodovias_mt")
    if not os.path.exists(rodovias_dir):
        rodovias_dir = os.path.join(DADOS_BRUTOS_DIR, "rodovias")

    # Buscar ZIPs recursivamente
    for root, dirs, files in os.walk(rodovias_dir):
        zips = sorted([f for f in files if f.endswith(".zip")], reverse=True)
        if zips:
            # Pegar o mais recente (último na ordem alfabética = mais recente)
            zip_path = os.path.join(root, zips[0])
            extract_dir = os.path.join(root, zips[0].replace(".zip", ""))
            os.makedirs(extract_dir, exist_ok=True)
            print(f"  Descompactando: {zips[0]}")
            with zipfile.ZipFile(zip_path, "r") as z:
                z.extractall(extract_dir)
            # Buscar o .shp extraído
            for f in os.listdir(extract_dir):
                if f.endswith(".shp"):
                    caminho = os.path.join(extract_dir, f)
                    print(f"  Fonte: {f}")
                    return gpd.read_file(caminho)

    raise FileNotFoundError(
        "Shapefile de rodovias não encontrado.\n"
        "Descompacte um dos ZIPs em dados_brutos/rodovias_mt/Repositório/SNV Rotas (2015-Atual) (SHP)/\n"
        "Exemplo: descompacte rota_202210C.zip"
    )


def recortar_para_mt(gdf_rodovias, mascara_bounds):
    """Recorta rodovias para a extensão do MT (bounding box)."""
    gdf_rodovias = gdf_rodovias.to_crs(CRS_PROJETO)
    from shapely.geometry import box
    bbox = box(*mascara_bounds)
    gdf_clip = gdf_rodovias.clip(bbox)
    print(f"  Rodovias após recorte: {len(gdf_clip)} feições")
    return gdf_clip


def rasterizar_rodovias(gdf_rodovias, shape, transform):
    """Rasteriza as linhas de rodovias: pixels com rodovia = 1, resto = 0."""
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
    O resultado é em metros (multiplicado pela resolução).
    """
    binario = (raster_rodovias == 0).astype(np.uint8)
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
    salvar_raster(distancia, meta, "distancia_rodovias_mt.tif")

    print("\n[6] Reclassificando em classes de acessibilidade...")
    componente_a = reclassificar_acessibilidade(distancia, mascara)

    print("\n[7] Salvando componente A...")
    salvar_raster(componente_a, meta, "componente_a.tif")

    print("\n[OK] Etapa 03 concluída.")
    print("  Próximo passo: python 04_protecao.py")


if __name__ == "__main__":
    main()
