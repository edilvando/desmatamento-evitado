"""
Etapa 06 - Componente E: Extraibilidade (recursos florestais e minerais)

Processo:
1. Camada de cobertura florestal (MapBiomas): onde há floresta densa,
   existe recurso florestal disponível para extração (madeira, PFNM)
2. Camada de mineração (SIGMINE/ANM): processos minerários ativos
   indicam atratividade mineral que pode impulsionar desmatamento
3. Combinação: máximo entre as duas camadas (abordagem conservadora)

Lógica: a extraibilidade representa a atratividade econômica de recursos
naturais que pode motivar o desmatamento. Floresta densa = madeira
disponível. Processos minerários = pressão de conversão para mineração.

Saída: rasters/componente_e.tif (uint8, valores 1 a 5)

Referência:
ECOMETRICA. The Hectares Indicator Methods and Guidance. Version 2.0. Edinburgh, 2019.
"""
import os
import numpy as np
import geopandas as gpd
import rasterio
from rasterio.features import rasterize
from rasterio.warp import reproject, Resampling
from config import (
    DADOS_BRUTOS_DIR, RASTERS_DIR, CRS_PROJETO
)


# Classes MapBiomas de vegetação nativa (recurso florestal)
CLASSES_FLORESTA_MAPBIOMAS = {
    3,    # Formação Florestal
    4,    # Formação Savânica
    5,    # Mangue
    6,    # Floresta Alagável
    49,   # Restinga Arborizada
}

CLASSES_VEGETACAO_NATIVA_MAPBIOMAS = {
    3, 4, 5, 6, 49,  # Florestais
    11,   # Campo Alagado e Área Pantanosa
    12,   # Formação Campestre
    32,   # Apicum
    29,   # Afloramento Rochoso
    50,   # Restinga Herbácea
    13,   # Outras Formações não Florestais
}


def carregar_grade_referencia():
    """Carrega metadados da grade de referência."""
    caminho_grade = os.path.join(RASTERS_DIR, "grade_mt.tif")
    caminho_mascara = os.path.join(RASTERS_DIR, "mascara_mt.tif")

    with rasterio.open(caminho_grade) as src:
        meta = src.meta.copy()
        transform = src.transform
        shape = (src.height, src.width)

    with rasterio.open(caminho_mascara) as src:
        mascara = src.read(1)

    return meta, transform, shape, mascara


def calcular_recurso_florestal(meta, transform, shape, mascara):
    """
    Calcula o subcomponente de recurso florestal.
    Usa o MapBiomas para identificar áreas com cobertura florestal.
    
    Reclassificação:
    - Formação Florestal densa (classe 3): valor 5 (máximo recurso)
    - Formação Savânica (classe 4): valor 3 (recurso médio)
    - Outras formações nativas: valor 2 (recurso baixo)
    - Sem vegetação nativa: valor 1 (sem recurso florestal)
    """
    # Tentar carregar MapBiomas
    caminho_mapbiomas = None
    for f in os.listdir(DADOS_BRUTOS_DIR):
        if "mapbiomas" in f.lower() and (f.endswith(".tif") or f.endswith(".tiff")):
            caminho_mapbiomas = os.path.join(DADOS_BRUTOS_DIR, f)
            break

    if caminho_mapbiomas is None:
        print("  [AVISO] MapBiomas não encontrado. Usando estimativa baseada na máscara.")
        # Fallback: assumir que toda a área dentro do MT com máscara tem recurso médio
        recurso = np.where(mascara == 1, 3, 0).astype(np.uint8)
        return recurso

    print(f"  Carregando MapBiomas: {os.path.basename(caminho_mapbiomas)}")
    with rasterio.open(caminho_mapbiomas) as src:
        uso_solo = np.zeros(shape, dtype=np.uint8)
        reproject(
            source=rasterio.band(src, 1),
            destination=uso_solo,
            src_transform=src.transform,
            src_crs=src.crs,
            dst_transform=transform,
            dst_crs=CRS_PROJETO,
            resampling=Resampling.nearest,
        )

    # Reclassificar por tipo de vegetação
    recurso = np.ones(shape, dtype=np.uint8)  # base = 1 (sem recurso)

    # Formação florestal densa = máximo recurso
    recurso[np.isin(uso_solo, [3, 6])] = 5

    # Formação savânica = recurso alto
    recurso[uso_solo == 4] = 4

    # Outras formações nativas = recurso médio
    outras_nativas = [11, 12, 13, 32, 49, 50]
    recurso[np.isin(uso_solo, outras_nativas)] = 3

    # Silvicultura = recurso médio-baixo (já explorado)
    recurso[uso_solo == 9] = 2

    # Aplicar máscara
    recurso[mascara == 0] = 0

    print("  Distribuição do recurso florestal:")
    for v in range(1, 6):
        n = np.sum(recurso == v)
        pct = n / np.sum(mascara == 1) * 100
        print(f"    Valor {v}: {n:>12,} pixels ({pct:5.1f}%)")

    return recurso


def calcular_pressao_mineral(meta, transform, shape, mascara):
    """
    Calcula o subcomponente de pressão mineral.
    Rasteriza polígonos de processos minerários (SIGMINE/ANM).
    
    Dentro de processo minerário: valor 4 (pressão alta)
    Fora: valor 1 (sem pressão mineral)
    """
    pasta_mineracao = os.path.join(DADOS_BRUTOS_DIR, "mineracao")

    if not os.path.exists(pasta_mineracao):
        print("  [AVISO] Dados de mineração não encontrados.")
        print("  Componente E será baseado apenas no recurso florestal.")
        return np.where(mascara == 1, 1, 0).astype(np.uint8)

    # Procurar shapefile
    shps = [f for f in os.listdir(pasta_mineracao) if f.endswith(".shp")]
    if not shps:
        print("  [AVISO] Nenhum shapefile de mineração encontrado.")
        return np.where(mascara == 1, 1, 0).astype(np.uint8)

    caminho = os.path.join(pasta_mineracao, shps[0])
    print(f"  Carregando mineração: {shps[0]}")
    gdf = gpd.read_file(caminho)
    gdf = gdf.to_crs(CRS_PROJETO)

    # Recortar para MT (usando bounds da grade)
    from shapely.geometry import box
    minx = transform.c
    maxy = transform.f
    maxx = minx + shape[1] * 30
    miny = maxy - shape[0] * 30
    bbox = box(minx, miny, maxx, maxy)
    gdf = gdf.clip(bbox)

    if len(gdf) == 0:
        print("  Nenhum processo minerário dentro do MT.")
        return np.where(mascara == 1, 1, 0).astype(np.uint8)

    print(f"  Processos minerários no MT: {len(gdf)}")

    # Rasterizar: dentro de processo = 4, fora = 1
    geometrias = [(geom, 4) for geom in gdf.geometry if geom is not None]
    mineral = rasterize(
        geometrias,
        out_shape=shape,
        transform=transform,
        fill=1,
        dtype=np.uint8,
    )
    mineral[mascara == 0] = 0

    pixels_mineral = np.sum(mineral == 4)
    pct = pixels_mineral / np.sum(mascara == 1) * 100
    print(f"  Pixels com mineração: {pixels_mineral:,} ({pct:.1f}%)")

    return mineral


def combinar_extraibilidade(recurso_florestal, pressao_mineral, mascara):
    """
    Combina os dois subcomponentes usando o máximo (abordagem conservadora).
    O valor final de E é o maior entre recurso florestal e pressão mineral.
    """
    componente_e = np.maximum(recurso_florestal, pressao_mineral)
    componente_e[mascara == 0] = 0

    print("  Distribuição final do componente E:")
    for v in range(1, 6):
        n = np.sum(componente_e == v)
        pct = n / np.sum(mascara == 1) * 100
        print(f"    Classe {v}: {n:>12,} pixels ({pct:5.1f}%)")

    return componente_e


def main():
    print("=" * 70)
    print("PIPELINE ACEU - ETAPA 06: COMPONENTE E (EXTRAIBILIDADE)")
    print("=" * 70)

    print("\n[1] Carregando grade de referência...")
    meta, transform, shape, mascara = carregar_grade_referencia()

    print("\n[2] Calculando subcomponente: recurso florestal...")
    recurso_florestal = calcular_recurso_florestal(meta, transform, shape, mascara)

    print("\n[3] Calculando subcomponente: pressão mineral...")
    pressao_mineral = calcular_pressao_mineral(meta, transform, shape, mascara)

    print("\n[4] Combinando subcomponentes (máximo)...")
    componente_e = combinar_extraibilidade(recurso_florestal, pressao_mineral, mascara)

    print("\n[5] Salvando componente E...")
    caminho = os.path.join(RASTERS_DIR, "componente_e.tif")
    meta_out = meta.copy()
    meta_out["dtype"] = "uint8"
    meta_out["compress"] = "lzw"
    with rasterio.open(caminho, "w", **meta_out) as dst:
        dst.write(componente_e, 1)
    tamanho_mb = os.path.getsize(caminho) / 1024 / 1024
    print(f"  Salvo: {caminho} ({tamanho_mb:.1f} MB)")

    print("\n[OK] Etapa 06 concluída.")
    print("  Próximo passo: python 07_composicao_aceu.py")


if __name__ == "__main__":
    main()
