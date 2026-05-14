"""
Etapa 05 - Componente C: Cultivabilidade (pressão agropecuária)

Processo:
1. Carrega raster de uso do solo do MapBiomas (ano T0 = 2008)
2. Recorta e reprojeta para a grade de referência do MT
3. Identifica pixels de uso agropecuário (pastagem, agricultura, mosaico)
4. Calcula proporção de uso agropecuário numa janela de vizinhança (kernel)
5. Reclassifica em 5 classes de pressão de conversão

Saída: rasters/componente_c.tif (uint8, valores 1 a 5)
"""
import os
import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling
from scipy.ndimage import uniform_filter
from config import (
    DADOS_BRUTOS_DIR, RASTERS_DIR,
    CRS_PROJETO, RESOLUCAO, LIMIARES_C,
    obter_mapbiomas, ANO_T0
)


# Classes MapBiomas que representam uso agropecuário
CLASSES_AGRO_MAPBIOMAS = {
    15, 39, 20, 40, 62, 41, 46, 47, 48, 9, 21,
}

# Tamanho da janela de vizinhança (em pixels)
# 33 pixels x 30m = ~1km de raio
TAMANHO_JANELA = 33


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


def localizar_mapbiomas():
    """Localiza o arquivo do MapBiomas usando a busca inteligente do config."""
    # Primeiro tenta o ano T0 via config
    caminho = obter_mapbiomas(ANO_T0)
    if caminho:
        return caminho

    # Fallback: procurar qualquer tif com mapbiomas no nome
    for f in os.listdir(DADOS_BRUTOS_DIR):
        if "mapbiomas" in f.lower() and (f.endswith(".tif") or f.endswith(".tiff")):
            return os.path.join(DADOS_BRUTOS_DIR, f)

    # Procurar na subpasta mapbiomas
    mapbiomas_dir = os.path.join(DADOS_BRUTOS_DIR, "mapbiomas")
    if os.path.exists(mapbiomas_dir):
        for f in sorted(os.listdir(mapbiomas_dir)):
            if f.endswith(".tif") or f.endswith(".tiff"):
                return os.path.join(mapbiomas_dir, f)

    return None


def reprojetar_mapbiomas(caminho_mapbiomas, meta, transform, shape):
    """Reprojeta e recorta o raster do MapBiomas para a grade de referência."""
    print("  Reprojetando MapBiomas para a grade de referência...")
    print("  (isso pode levar 1-2 minutos dependendo do tamanho do arquivo)")

    with rasterio.open(caminho_mapbiomas) as src:
        print(f"  Fonte: {src.width}x{src.height} pixels, CRS={src.crs}")

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

    print(f"  Reprojetado: {shape[1]}x{shape[0]} pixels")
    return uso_solo


def calcular_proporcao_agro(uso_solo, mascara):
    """Calcula a proporção de uso agropecuário numa janela de vizinhança."""
    agro_binario = np.isin(uso_solo, list(CLASSES_AGRO_MAPBIOMAS)).astype(np.float32)

    pixels_agro = np.sum((agro_binario == 1) & (mascara == 1))
    pixels_total = np.sum(mascara == 1)
    pct_agro = pixels_agro / pixels_total * 100 if pixels_total > 0 else 0
    print(f"  Pixels agropecuários no MT: {pixels_agro:,} ({pct_agro:.1f}%)")

    print(f"  Calculando proporção na vizinhança ({TAMANHO_JANELA}x{TAMANHO_JANELA} pixels = ~{TAMANHO_JANELA*30/1000:.1f}km)...")
    proporcao = uniform_filter(agro_binario, size=TAMANHO_JANELA, mode="constant", cval=0)

    proporcao[mascara == 0] = 0

    print(f"  Proporção média de agro na vizinhança: {proporcao[mascara==1].mean():.3f}")
    print(f"  Proporção máxima: {proporcao[mascara==1].max():.3f}")

    return proporcao


def reclassificar_cultivabilidade(proporcao, mascara):
    """Reclassifica a proporção de uso agropecuário em 5 classes."""
    componente_c = np.zeros_like(mascara, dtype=np.uint8)

    for classe, (prop_min, prop_max) in LIMIARES_C.items():
        condicao = (proporcao >= prop_min) & (proporcao < prop_max) & (mascara == 1)
        componente_c[condicao] = classe

    componente_c[(proporcao >= 1.0) & (mascara == 1)] = 5

    print("  Distribuição de classes (dentro do MT):")
    for classe in range(1, 6):
        n = np.sum(componente_c == classe)
        pct = n / np.sum(mascara == 1) * 100
        print(f"    Classe {classe}: {n:>12,} pixels ({pct:5.1f}%)")

    return componente_c


def gerar_componente_c_sem_mapbiomas(mascara):
    """Fallback se MapBiomas não disponível."""
    print("  [FALLBACK] Gerando componente C uniforme (classe 3).")
    componente_c = np.where(mascara == 1, 3, 0).astype(np.uint8)
    return componente_c


def main():
    print("=" * 70)
    print("PIPELINE ACEU - ETAPA 05: COMPONENTE C (CULTIVABILIDADE)")
    print("=" * 70)

    print("\n[1] Carregando grade de referência...")
    meta, transform, shape, mascara = carregar_grade_referencia()

    print("\n[2] Localizando raster do MapBiomas...")
    caminho_mapbiomas = localizar_mapbiomas()

    if caminho_mapbiomas is None:
        print("  [AVISO] Raster do MapBiomas não encontrado!")
        print("  Gerando componente C com valor uniforme (fallback)...")
        componente_c = gerar_componente_c_sem_mapbiomas(mascara)
    else:
        print(f"  Encontrado: {caminho_mapbiomas}")

        print("\n[3] Reprojetando para grade de referência...")
        uso_solo = reprojetar_mapbiomas(caminho_mapbiomas, meta, transform, shape)

        classes_presentes = np.unique(uso_solo[mascara == 1])
        print(f"  Classes presentes no MT: {len(classes_presentes)}")

        print("\n[4] Calculando proporção agropecuária na vizinhança...")
        proporcao = calcular_proporcao_agro(uso_solo, mascara)

        print("\n[5] Reclassificando em classes de cultivabilidade...")
        componente_c = reclassificar_cultivabilidade(proporcao, mascara)

    print("\n[6] Salvando componente C...")
    caminho = os.path.join(RASTERS_DIR, "componente_c.tif")
    meta_out = meta.copy()
    meta_out["dtype"] = "uint8"
    meta_out["compress"] = "lzw"
    meta_out["BIGTIFF"] = "YES"
    with rasterio.open(caminho, "w", **meta_out) as dst:
        dst.write(componente_c, 1)
    tamanho_mb = os.path.getsize(caminho) / 1024 / 1024
    print(f"  Salvo: {caminho} ({tamanho_mb:.1f} MB)")

    print("\n[OK] Etapa 05 concluída.")
    print("  Próximo passo: python 06_extraibilidade.py")


if __name__ == "__main__":
    main()
