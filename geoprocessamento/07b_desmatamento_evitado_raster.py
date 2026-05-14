"""
Etapa 07b - Raster de Desmatamento Evitado

Cruza o raster de risco ACEU com dados de desmatamento observado (MapBiomas)
para gerar um mapa pixel a pixel de desmatamento evitado.

Classes do raster de saída:
  0 = fora do MT / sem dados
  1 = floresta mantida, risco baixo (esperado)
  2 = floresta mantida, risco médio (parcialmente evitado)
  3 = floresta mantida, risco alto (desmatamento evitado)
  4 = floresta mantida, risco muito alto (fortemente evitado)
  5 = desmatado, risco alto (perda confirmada)
  6 = desmatado, risco baixo (perda inesperada)

Saída: rasters/desmatamento_evitado.tif (uint8, classes 0-6)
"""
import os
import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling
from config import (
    DADOS_BRUTOS_DIR, RASTERS_DIR, CRS_PROJETO,
    obter_mapbiomas, ANO_T0, ANO_T1
)


# Classes MapBiomas que representam floresta
CLASSES_FLORESTA = {3, 4, 5, 6, 49}


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


def carregar_risco_aceu():
    """Carrega o raster de risco classificado."""
    caminho = os.path.join(RASTERS_DIR, "risco_aceu.tif")
    if not os.path.exists(caminho):
        raise FileNotFoundError("Raster de risco não encontrado. Execute 07_composicao_aceu.py primeiro.")
    with rasterio.open(caminho) as src:
        return src.read(1)


def carregar_mapbiomas_ano(ano, transform, shape):
    """
    Carrega o raster do MapBiomas para um ano específico.
    Usa a função obter_mapbiomas() do config para busca inteligente.
    """
    caminho = obter_mapbiomas(ano)

    if caminho is None:
        print(f"  [AVISO] MapBiomas {ano} não encontrado.")
        return None

    print(f"  Carregando MapBiomas {ano}: {os.path.basename(caminho)}")
    with rasterio.open(caminho) as src:
        print(f"  Fonte: {src.width}x{src.height} pixels, CRS={src.crs}")

        if src.count > 1:
            # Multi-banda: tentar encontrar a banda do ano
            banda_idx = None
            if src.descriptions:
                for i, desc in enumerate(src.descriptions):
                    if desc and str(ano) in desc:
                        banda_idx = i + 1
                        break
            if banda_idx is None:
                banda_idx = ano - 1985 + 1
                if banda_idx < 1 or banda_idx > src.count:
                    banda_idx = src.count
            print(f"  Usando banda {banda_idx} de {src.count}")

            uso_solo = np.zeros(shape, dtype=np.uint8)
            reproject(
                source=rasterio.band(src, banda_idx),
                destination=uso_solo,
                src_transform=src.transform,
                src_crs=src.crs,
                dst_transform=transform,
                dst_crs=CRS_PROJETO,
                resampling=Resampling.nearest,
            )
        else:
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

    return uso_solo


def calcular_desmatamento_evitado(risco_aceu, floresta_ref, floresta_atual, mascara):
    """
    Calcula o raster de desmatamento evitado.
    """
    resultado = np.zeros_like(mascara, dtype=np.uint8)

    era_floresta = floresta_ref & (mascara == 1)
    continua_floresta = floresta_atual & era_floresta
    foi_desmatado = era_floresta & (~floresta_atual)

    # Classificar pixels que continuam floresta
    resultado[continua_floresta & (risco_aceu <= 2)] = 1
    resultado[continua_floresta & (risco_aceu == 3)] = 2
    resultado[continua_floresta & (risco_aceu == 4)] = 3
    resultado[continua_floresta & (risco_aceu == 5)] = 4

    # Classificar pixels desmatados
    resultado[foi_desmatado & (risco_aceu >= 4)] = 5
    resultado[foi_desmatado & (risco_aceu <= 3)] = 6

    # Estatísticas
    print("  Resultado do cruzamento ACEU x Cobertura:")
    labels = {
        1: "Floresta mantida, risco baixo (esperado)",
        2: "Floresta mantida, risco médio (parcialmente evitado)",
        3: "Floresta mantida, risco alto (DESMATAMENTO EVITADO)",
        4: "Floresta mantida, risco muito alto (FORTEMENTE EVITADO)",
        5: "Desmatado, risco alto (perda confirmada)",
        6: "Desmatado, risco baixo (perda inesperada)",
    }
    total_floresta_ref = np.sum(era_floresta)
    for classe, label in labels.items():
        n = np.sum(resultado == classe)
        pct = n / total_floresta_ref * 100 if total_floresta_ref > 0 else 0
        area_km2 = n * (30 ** 2) / 1e6
        print(f"    {classe}: {n:>10,} px ({pct:5.1f}%) = {area_km2:>8,.0f} km² — {label}")

    evitado_total = np.sum((resultado == 3) | (resultado == 4))
    area_evitada_km2 = evitado_total * (30 ** 2) / 1e6
    print(f"\n  DESMATAMENTO EVITADO TOTAL: {area_evitada_km2:,.0f} km² ({evitado_total:,} pixels)")

    return resultado


def main():
    print("=" * 70)
    print("PIPELINE ACEU - ETAPA 07b: RASTER DE DESMATAMENTO EVITADO")
    print("=" * 70)

    print("\n[1] Carregando grade de referência...")
    meta, transform, shape, mascara = carregar_grade_referencia()

    print("\n[2] Carregando raster de risco ACEU...")
    risco_aceu = carregar_risco_aceu()
    print(f"  Classes presentes: {np.unique(risco_aceu[risco_aceu > 0])}")

    print(f"\n[3] Carregando cobertura florestal de referência (T0 = {ANO_T0})...")
    uso_solo_t0 = carregar_mapbiomas_ano(ANO_T0, transform, shape)
    if uso_solo_t0 is not None:
        floresta_ref = np.isin(uso_solo_t0, list(CLASSES_FLORESTA))
        print(f"  Floresta em {ANO_T0}: {np.sum(floresta_ref):,} pixels")
    else:
        # Fallback: usar máscara de floresta da etapa 07
        caminho_floresta = os.path.join(RASTERS_DIR, "mascara_floresta.tif")
        if os.path.exists(caminho_floresta):
            with rasterio.open(caminho_floresta) as src:
                floresta_ref = src.read(1).astype(bool)
            print(f"  Usando máscara de floresta da etapa 07: {np.sum(floresta_ref):,} pixels")
        else:
            floresta_ref = (risco_aceu > 0)
            print(f"  [FALLBACK] Usando pixels com risco > 0: {np.sum(floresta_ref):,} pixels")

    print(f"\n[4] Carregando cobertura florestal atual (T1 = {ANO_T1})...")
    uso_solo_t1 = carregar_mapbiomas_ano(ANO_T1, transform, shape)
    if uso_solo_t1 is not None:
        floresta_atual = np.isin(uso_solo_t1, list(CLASSES_FLORESTA))
        print(f"  Floresta em {ANO_T1}: {np.sum(floresta_atual):,} pixels")
        desmatado = floresta_ref & (~floresta_atual)
        print(f"  Desmatado entre {ANO_T0} e {ANO_T1}: {np.sum(desmatado):,} pixels ({np.sum(desmatado) * 900 / 1e6:,.0f} km²)")
    else:
        # Fallback: simular perda proporcional ao risco
        print("  [FALLBACK] Sem dados de T1. Simulando perda proporcional ao risco.")
        np.random.seed(42)
        prob_perda = np.zeros_like(risco_aceu, dtype=np.float32)
        prob_perda[risco_aceu == 1] = 0.02
        prob_perda[risco_aceu == 2] = 0.06
        prob_perda[risco_aceu == 3] = 0.12
        prob_perda[risco_aceu == 4] = 0.20
        prob_perda[risco_aceu == 5] = 0.30
        aleatorio = np.random.random(shape)
        foi_desmatado = floresta_ref & (aleatorio < prob_perda)
        floresta_atual = floresta_ref & (~foi_desmatado)
        print(f"  Floresta atual (simulada): {np.sum(floresta_atual):,} pixels")

    print("\n[5] Calculando raster de desmatamento evitado...")
    resultado = calcular_desmatamento_evitado(risco_aceu, floresta_ref, floresta_atual, mascara)

    print("\n[6] Salvando raster de desmatamento evitado...")
    caminho = os.path.join(RASTERS_DIR, "desmatamento_evitado.tif")
    meta_out = meta.copy()
    meta_out["dtype"] = "uint8"
    meta_out["compress"] = "lzw"
    meta_out["nodata"] = 0
    meta_out["BIGTIFF"] = "YES"
    with rasterio.open(caminho, "w", **meta_out) as dst:
        dst.write(resultado, 1)
        dst.update_tags(
            classes="0=nodata; 1=floresta_risco_baixo; 2=floresta_risco_medio; "
                    "3=desmatamento_evitado; 4=fortemente_evitado; "
                    "5=perda_confirmada; 6=perda_inesperada"
        )
    tamanho_mb = os.path.getsize(caminho) / 1024 / 1024
    print(f"  Salvo: {caminho} ({tamanho_mb:.1f} MB)")

    print("\n[OK] Etapa 07b concluída.")
    print("  Próximo passo: python 08_estatisticas.py")


if __name__ == "__main__":
    main()
