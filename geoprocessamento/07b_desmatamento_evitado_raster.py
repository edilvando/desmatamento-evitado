"""
Etapa 07b - Raster de Desmatamento Evitado

Cruza o raster de risco ACEU com dados de desmatamento observado (PRODES/MapBiomas)
para gerar um mapa pixel a pixel de desmatamento evitado.

Lógica:
- Pixel com risco alto (classes 4-5) que PERMANECE floresta = desmatamento evitado
- Pixel com risco alto que FOI desmatado = perda confirmada (modelo acertou)
- Pixel com risco baixo (classes 1-2) que permanece floresta = esperado (não é "evitado")
- Pixel com risco baixo que foi desmatado = perda inesperada (modelo errou)

Classes do raster de saída:
  0 = fora do MT / sem dados
  1 = floresta mantida, risco baixo (esperado - não é desmatamento evitado)
  2 = floresta mantida, risco médio (parcialmente evitado)
  3 = floresta mantida, risco alto (desmatamento evitado)
  4 = floresta mantida, risco muito alto (desmatamento fortemente evitado)
  5 = desmatado, risco alto (perda confirmada - modelo acertou)
  6 = desmatado, risco baixo (perda inesperada)

Para a análise temporal, usa-se:
- Floresta de referência: MapBiomas ano T0 (ex: 2008)
- Floresta atual: MapBiomas ano T1 (ex: 2022)
- Diferença: pixels que eram floresta em T0 e não são mais em T1 = desmatados

Saída:
- rasters/desmatamento_evitado.tif (uint8, classes 0-6)
- rasters/desmatamento_evitado_anual/ (um raster por ano, se dados disponíveis)

Referência:
VENDRUSCULO et al. Aplicação da metodologia do Hectare Indicator para estimativa
de desmatamento evitado no bioma Amazônia. Embrapa, 2019.
"""
import os
import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling
from config import (
    DADOS_BRUTOS_DIR, RASTERS_DIR, CRS_PROJETO
)


# Classes MapBiomas que representam floresta
CLASSES_FLORESTA = {3, 4, 5, 6, 49}

# Mapeamento de risco para categoria de desmatamento evitado
# Pixel florestal que permanece floresta:
#   risco 1-2 = esperado (classe 1)
#   risco 3 = parcialmente evitado (classe 2)
#   risco 4 = desmatamento evitado (classe 3)
#   risco 5 = fortemente evitado (classe 4)
# Pixel florestal que foi desmatado:
#   risco 4-5 = perda confirmada (classe 5)
#   risco 1-3 = perda inesperada (classe 6)


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
    Tenta múltiplas fontes e formatos.
    """
    # Procurar arquivo específico do ano
    possiveis = [
        os.path.join(DADOS_BRUTOS_DIR, f"mapbiomas_mt_{ano}.tif"),
        os.path.join(DADOS_BRUTOS_DIR, f"mapbiomas_{ano}.tif"),
        os.path.join(DADOS_BRUTOS_DIR, "mapbiomas_mt.tif"),  # multi-banda ou ano único
    ]

    for caminho in possiveis:
        if os.path.exists(caminho):
            with rasterio.open(caminho) as src:
                # Verificar se tem múltiplas bandas (uma por ano)
                if src.count > 1:
                    # Tentar encontrar a banda do ano
                    # MapBiomas geralmente nomeia as bandas como classification_YYYY
                    banda_idx = None
                    if src.descriptions:
                        for i, desc in enumerate(src.descriptions):
                            if desc and str(ano) in desc:
                                banda_idx = i + 1
                                break
                    if banda_idx is None:
                        # Assumir ordem cronológica a partir de 1985
                        banda_idx = ano - 1985 + 1
                        if banda_idx < 1 or banda_idx > src.count:
                            banda_idx = src.count  # usar última banda

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

    return None


def gerar_mascara_floresta_prodes(transform, shape):
    """
    Alternativa ao MapBiomas: usar dados do PRODES para identificar
    áreas desmatadas. O PRODES fornece incrementos anuais de desmatamento.
    """
    # Procurar shapefile/raster do PRODES
    pasta_prodes = os.path.join(DADOS_BRUTOS_DIR, "prodes")
    if not os.path.exists(pasta_prodes):
        return None

    import geopandas as gpd
    from rasterio.features import rasterize

    shps = [f for f in os.listdir(pasta_prodes) if f.endswith(".shp")]
    if not shps:
        return None

    gdf = gpd.read_file(os.path.join(pasta_prodes, shps[0]))
    gdf = gdf.to_crs(CRS_PROJETO)

    # Rasterizar áreas desmatadas
    geometrias = [(geom, 1) for geom in gdf.geometry if geom is not None]
    desmatado = rasterize(
        geometrias,
        out_shape=shape,
        transform=transform,
        fill=0,
        dtype=np.uint8,
    )
    return desmatado


def calcular_desmatamento_evitado(risco_aceu, floresta_ref, floresta_atual, mascara):
    """
    Calcula o raster de desmatamento evitado.
    
    Parâmetros:
    - risco_aceu: raster de classes de risco (1-5)
    - floresta_ref: máscara de floresta no ano de referência (T0)
    - floresta_atual: máscara de floresta no ano atual (T1)
    - mascara: máscara do estado
    
    Retorna raster com classes:
    0 = fora / sem dados
    1 = floresta mantida, risco baixo (esperado)
    2 = floresta mantida, risco médio (parcialmente evitado)
    3 = floresta mantida, risco alto (desmatamento evitado)
    4 = floresta mantida, risco muito alto (fortemente evitado)
    5 = desmatado, risco alto (perda confirmada)
    6 = desmatado, risco baixo (perda inesperada)
    """
    resultado = np.zeros_like(mascara, dtype=np.uint8)

    # Pixels que eram floresta em T0
    era_floresta = floresta_ref & (mascara == 1)

    # Pixels que continuam floresta em T1
    continua_floresta = floresta_atual & era_floresta

    # Pixels que foram desmatados (era floresta, não é mais)
    foi_desmatado = era_floresta & (~floresta_atual)

    # Classificar pixels que continuam floresta
    # Risco baixo (1-2): esperado, não é desmatamento evitado
    resultado[continua_floresta & (risco_aceu <= 2)] = 1

    # Risco médio (3): parcialmente evitado
    resultado[continua_floresta & (risco_aceu == 3)] = 2

    # Risco alto (4): desmatamento evitado
    resultado[continua_floresta & (risco_aceu == 4)] = 3

    # Risco muito alto (5): fortemente evitado
    resultado[continua_floresta & (risco_aceu == 5)] = 4

    # Classificar pixels desmatados
    # Risco alto (4-5): perda confirmada (modelo previu corretamente)
    resultado[foi_desmatado & (risco_aceu >= 4)] = 5

    # Risco baixo-médio (1-3): perda inesperada
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

    # Resumo
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

    print("\n[3] Carregando cobertura florestal de referência (T0)...")
    # Tentar MapBiomas ano de referência (2008)
    uso_solo_t0 = carregar_mapbiomas_ano(2008, transform, shape)
    if uso_solo_t0 is not None:
        floresta_ref = np.isin(uso_solo_t0, list(CLASSES_FLORESTA))
        print(f"  Floresta em 2008: {np.sum(floresta_ref):,} pixels")
    else:
        # Fallback: usar máscara de floresta gerada na etapa 07
        caminho_floresta = os.path.join(RASTERS_DIR, "mascara_floresta.tif")
        if os.path.exists(caminho_floresta):
            with rasterio.open(caminho_floresta) as src:
                floresta_ref = src.read(1).astype(bool)
            print(f"  Usando máscara de floresta da etapa 07: {np.sum(floresta_ref):,} pixels")
        else:
            # Último fallback: considerar todos os pixels com risco > 0 como floresta de referência
            floresta_ref = (risco_aceu > 0)
            print(f"  [FALLBACK] Usando pixels com risco > 0 como floresta de referência: {np.sum(floresta_ref):,} pixels")

    print("\n[4] Carregando cobertura florestal atual (T1)...")
    # Tentar MapBiomas ano atual (2022)
    uso_solo_t1 = carregar_mapbiomas_ano(2022, transform, shape)
    if uso_solo_t1 is not None:
        floresta_atual = np.isin(uso_solo_t1, list(CLASSES_FLORESTA))
        print(f"  Floresta em 2022: {np.sum(floresta_atual):,} pixels")
        desmatado = floresta_ref & (~floresta_atual)
        print(f"  Desmatado entre T0 e T1: {np.sum(desmatado):,} pixels ({np.sum(desmatado) * 900 / 1e6:,.0f} km²)")
    else:
        # Tentar PRODES
        print("  MapBiomas T1 não disponível. Tentando PRODES...")
        raster_desmatado = gerar_mascara_floresta_prodes(transform, shape)
        if raster_desmatado is not None:
            floresta_atual = floresta_ref & (raster_desmatado == 0)
            print(f"  Floresta atual (via PRODES): {np.sum(floresta_atual):,} pixels")
        else:
            # Fallback: simular ~15% de perda nas áreas de alto risco
            # Isso permite que o pipeline funcione para demonstração
            print("  [FALLBACK] Sem dados de desmatamento observado.")
            print("  Simulando perda proporcional ao risco para demonstração.")
            print("  Para resultado correto, forneça MapBiomas de dois anos ou PRODES.")
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
            print(f"  Desmatado (simulado): {np.sum(foi_desmatado):,} pixels")

    print("\n[5] Calculando raster de desmatamento evitado...")
    resultado = calcular_desmatamento_evitado(risco_aceu, floresta_ref, floresta_atual, mascara)

    print("\n[6] Salvando raster de desmatamento evitado...")
    caminho = os.path.join(RASTERS_DIR, "desmatamento_evitado.tif")
    meta_out = meta.copy()
    meta_out["dtype"] = "uint8"
    meta_out["compress"] = "lzw"
    meta_out["nodata"] = 0
    with rasterio.open(caminho, "w", **meta_out) as dst:
        dst.write(resultado, 1)
        # Adicionar descrições das classes
        dst.update_tags(
            classes="0=nodata; 1=floresta_risco_baixo; 2=floresta_risco_medio; "
                    "3=desmatamento_evitado; 4=fortemente_evitado; "
                    "5=perda_confirmada; 6=perda_inesperada"
        )
    tamanho_mb = os.path.getsize(caminho) / 1024 / 1024
    print(f"  Salvo: {caminho} ({tamanho_mb:.1f} MB)")

    print("\n[OK] Etapa 07b concluída.")
    print("  Raster de desmatamento evitado gerado.")
    print("  Próximo passo: python 09_gerar_tiles.py (gera tiles para ambas as camadas)")


if __name__ == "__main__":
    main()
