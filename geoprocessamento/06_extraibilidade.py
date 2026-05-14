"""
Etapa 06 - Componente E: Extraibilidade (recursos florestais e minerais)

Processo:
1. Camada de cobertura florestal (MapBiomas): onde há floresta densa,
   existe recurso florestal disponível para extração
2. Camada de mineração (SIGMINE/ANM): processos minerários ativos
3. Combinação: máximo entre as duas camadas (abordagem conservadora)

Saída: rasters/componente_e.tif (uint8, valores 1 a 5)
"""
import os
import numpy as np
import geopandas as gpd
import rasterio
from rasterio.features import rasterize
from rasterio.warp import reproject, Resampling
from config import (
    DADOS_BRUTOS_DIR, RASTERS_DIR, CRS_PROJETO,
    obter_mapbiomas, obter_mineracao, ANO_T0
)


# Classes MapBiomas de vegetação nativa (recurso florestal)
CLASSES_FLORESTA_MAPBIOMAS = {3, 4, 5, 6, 49}


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
    """Calcula o subcomponente de recurso florestal via MapBiomas."""
    caminho_mapbiomas = obter_mapbiomas(ANO_T0)

    if caminho_mapbiomas is None:
        # Fallback: procurar qualquer tif na pasta mapbiomas
        mapbiomas_dir = os.path.join(DADOS_BRUTOS_DIR, "mapbiomas")
        if os.path.exists(mapbiomas_dir):
            for f in sorted(os.listdir(mapbiomas_dir)):
                if f.endswith(".tif") or f.endswith(".tiff"):
                    caminho_mapbiomas = os.path.join(mapbiomas_dir, f)
                    break

    if caminho_mapbiomas is None:
        print("  [AVISO] MapBiomas não encontrado. Usando valor médio uniforme.")
        return np.where(mascara == 1, 3, 0).astype(np.uint8)

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
    recurso = np.ones(shape, dtype=np.uint8)  # base = 1

    # Formação florestal densa = máximo recurso
    recurso[np.isin(uso_solo, [3, 6])] = 5
    # Formação savânica = recurso alto
    recurso[uso_solo == 4] = 4
    # Outras formações nativas = recurso médio
    recurso[np.isin(uso_solo, [11, 12, 13, 32, 49, 50])] = 3
    # Silvicultura = recurso médio-baixo
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
    """Calcula o subcomponente de pressão mineral via SIGMINE/ANM."""
    caminho = obter_mineracao()

    if caminho is None:
        print("  [AVISO] Dados de mineração não encontrados.")
        return np.where(mascara == 1, 1, 0).astype(np.uint8)

    print(f"  Carregando mineração: {os.path.basename(caminho)}")
    # Tentar vários encodings (shapefiles brasileiros usam latin-1)
    gdf = None
    for enc in ["utf-8", "latin-1", "cp1252"]:
        try:
            gdf = gpd.read_file(caminho, encoding=enc)
            break
        except Exception as e:
            if "codec" in str(e).lower() or "decode" in str(e).lower():
                continue
            gdf = gpd.read_file(caminho, encoding=enc)
            break
    if gdf is None:
        print("  [ERRO] Não foi possível ler shapefile de mineração")
        return np.where(mascara == 1, 1, 0).astype(np.uint8)
    # Corrigir geometrias inválidas com make_valid (mais robusto que buffer(0))
    from shapely.validation import make_valid
    n_inv = (~gdf.geometry.is_valid).sum()
    if n_inv > 0:
        print(f"  Corrigindo {n_inv} geometrias inválidas com make_valid...")
        gdf["geometry"] = gdf.geometry.apply(
            lambda g: make_valid(g) if g is not None and not g.is_valid else g
        )
        # Segundo passo: remover geometrias que ainda são inválidas
        still_invalid = ~gdf.geometry.is_valid
        if still_invalid.any():
            print(f"  Removendo {still_invalid.sum()} geometrias irrecuperáveis...")
            gdf = gdf[~still_invalid].copy()
    gdf = gdf.to_crs(CRS_PROJETO)

    # Corrigir novamente após reprojeção
    n_inv2 = (~gdf.geometry.is_valid).sum()
    if n_inv2 > 0:
        gdf["geometry"] = gdf.geometry.apply(
            lambda g: make_valid(g) if g is not None and not g.is_valid else g
        )

    # Recortar para MT (com tratamento de TopologyException)
    from shapely.geometry import box
    minx = transform.c
    maxy = transform.f
    maxx = minx + shape[1] * 30
    miny = maxy - shape[0] * 30
    bbox = box(minx, miny, maxx, maxy)
    try:
        gdf = gdf.clip(bbox)
    except Exception as e:
        print(f"  [AVISO] Clip falhou ({e}). Usando intersects como alternativa...")
        # Fallback: filtrar por bbox sem clip exato
        from shapely.geometry import box as shapely_box
        mask = gdf.geometry.intersects(bbox)
        gdf = gdf[mask].copy()

    if len(gdf) == 0:
        print("  Nenhum processo minerário dentro do MT.")
        return np.where(mascara == 1, 1, 0).astype(np.uint8)

    print(f"  Processos minerários no MT: {len(gdf)}")

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
    """Combina os dois subcomponentes usando o máximo."""
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
    meta_out["BIGTIFF"] = "YES"
    with rasterio.open(caminho, "w", **meta_out) as dst:
        dst.write(componente_e, 1)
    tamanho_mb = os.path.getsize(caminho) / 1024 / 1024
    print(f"  Salvo: {caminho} ({tamanho_mb:.1f} MB)")

    print("\n[OK] Etapa 06 concluída.")
    print("  Próximo passo: python 07_composicao_aceu.py")


if __name__ == "__main__":
    main()
