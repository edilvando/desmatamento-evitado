"""
Etapa 02 - Criação da grade de referência e máscara do Mato Grosso

Gera:
- rasters/grade_mt.tif: raster-base vazio com a extensão e resolução de referência
- rasters/mascara_mt.tif: máscara binária (1 = dentro do MT, 0 = fora)

Parâmetros:
- CRS: EPSG:31981 (SIRGAS 2000 / UTM 21S)
- Resolução: 30 metros
- Extensão: bounding box do limite estadual do MT reprojetado
"""
import os
import numpy as np
import geopandas as gpd
import rasterio
from rasterio.transform import from_bounds
from rasterio.features import rasterize
from config import (
    DADOS_BRUTOS_DIR, RASTERS_DIR,
    CRS_PROJETO, RESOLUCAO
)


def carregar_limite_mt():
    """Carrega o limite estadual do MT e reprojeta para o CRS do projeto."""
    caminho = os.path.join(DADOS_BRUTOS_DIR, "limite_mt.geojson")
    if not os.path.exists(caminho):
        raise FileNotFoundError(
            f"Arquivo não encontrado: {caminho}\n"
            "Execute 01_download_mt.py primeiro."
        )
    gdf = gpd.read_file(caminho)
    gdf = gdf.to_crs(CRS_PROJETO)
    return gdf


def calcular_dimensoes(bounds, resolucao):
    """Calcula largura e altura do raster a partir dos bounds e resolução."""
    minx, miny, maxx, maxy = bounds
    largura = int(np.ceil((maxx - minx) / resolucao))
    altura = int(np.ceil((maxy - miny) / resolucao))
    return largura, altura


def criar_grade(gdf_limite, resolucao):
    """
    Cria o raster-base (grade de referência) para todo o pipeline.
    Todos os rasters subsequentes devem usar exatamente esta mesma
    extensão, resolução e transform.
    """
    bounds = gdf_limite.total_bounds  # (minx, miny, maxx, maxy)
    largura, altura = calcular_dimensoes(bounds, resolucao)

    # Ajustar bounds para alinhar com a resolução
    minx, miny, maxx, maxy = bounds
    maxx = minx + largura * resolucao
    maxy = miny + altura * resolucao

    transform = from_bounds(minx, miny, maxx, maxy, largura, altura)

    # Metadados do raster de referência
    meta = {
        "driver": "GTiff",
        "dtype": "uint8",
        "width": largura,
        "height": altura,
        "count": 1,
        "crs": CRS_PROJETO,
        "transform": transform,
        "nodata": 0,
        "compress": "lzw",
    }

    # Salvar grade vazia (apenas para referência de metadados)
    caminho_grade = os.path.join(RASTERS_DIR, "grade_mt.tif")
    with rasterio.open(caminho_grade, "w", **meta) as dst:
        dst.write(np.zeros((altura, largura), dtype=np.uint8), 1)

    print(f"  Grade criada: {largura} x {altura} pixels")
    print(f"  Resolução: {resolucao}m")
    print(f"  Extensão (m): x=[{minx:.0f}, {maxx:.0f}], y=[{miny:.0f}, {maxy:.0f}]")
    print(f"  CRS: {CRS_PROJETO}")
    print(f"  Tamanho estimado por banda: {largura * altura * 1 / 1024 / 1024:.1f} MB (uint8)")
    print(f"  Salvo em: {caminho_grade}")

    return meta, transform, (altura, largura)


def criar_mascara(gdf_limite, meta, transform, shape):
    """
    Rasteriza o polígono do MT para criar uma máscara binária.
    1 = dentro do estado, 0 = fora.
    """
    altura, largura = shape
    geometrias = [(geom, 1) for geom in gdf_limite.geometry]

    mascara = rasterize(
        geometrias,
        out_shape=(altura, largura),
        transform=transform,
        fill=0,
        dtype=np.uint8,
    )

    caminho_mascara = os.path.join(RASTERS_DIR, "mascara_mt.tif")
    with rasterio.open(caminho_mascara, "w", **meta) as dst:
        dst.write(mascara, 1)

    pixels_dentro = np.sum(mascara == 1)
    area_km2 = pixels_dentro * (RESOLUCAO ** 2) / 1e6
    print(f"  Máscara criada: {pixels_dentro:,} pixels dentro do MT")
    print(f"  Área estimada: {area_km2:,.0f} km² (referência IBGE: 903.357 km²)")
    print(f"  Salvo em: {caminho_mascara}")

    return mascara


def main():
    print("=" * 70)
    print("PIPELINE ACEU - ETAPA 02: GRADE DE REFERÊNCIA")
    print("=" * 70)

    print("\n[1] Carregando limite do MT...")
    gdf_limite = carregar_limite_mt()
    print(f"  Geometria carregada: {len(gdf_limite)} feição(ões)")

    print("\n[2] Criando grade de referência...")
    meta, transform, shape = criar_grade(gdf_limite, RESOLUCAO)

    print("\n[3] Criando máscara do estado...")
    mascara = criar_mascara(gdf_limite, meta, transform, shape)

    print("\n[OK] Etapa 02 concluída.")
    print("  Próximo passo: python 03_acessibilidade.py")


if __name__ == "__main__":
    main()
