"""
Etapa 08 - Estatísticas Zonais e Cálculo do Desmatamento Evitado

Processo:
1. Carrega malha municipal do MT (IBGE)
2. Para cada município, conta pixels em cada classe de risco (1 a 5)
3. Converte pixels em hectares (pixel 30m = 0,09 ha)
4. Calcula perda esperada em 20 anos: L_20(m) = Σ(alpha_k * Area_k)
5. Ajusta para janela temporal T: L_T(m) = (T/20) * L_20(m)
6. Compara com perda observada (PRODES): DE_T(m) = L_T(m) - O_T(m)
7. Exporta CSV final com todos os indicadores por município e ano

Saída:
- output/desmatamento_evitado_mt.csv
- output/areas_risco_municipios.csv (áreas por classe de risco)

Referência:
VENDRUSCULO et al. Aplicação da metodologia do Hectare Indicator para estimativa
de desmatamento evitado no bioma Amazônia. Embrapa, 2019.
"""
import os
import json
import numpy as np
import pandas as pd
import geopandas as gpd
import rasterio
from rasterio.features import rasterize
from config import (
    DADOS_BRUTOS_DIR, RASTERS_DIR, OUTPUT_DIR,
    CRS_PROJETO, RESOLUCAO, PROB_PERDA_20,
    HORIZONTE_REF, ANO_INICIO, ANO_FIM
)

# Área de um pixel em hectares (30m x 30m = 900 m² = 0,09 ha)
AREA_PIXEL_HA = (RESOLUCAO ** 2) / 10000
AREA_PIXEL_KM2 = (RESOLUCAO ** 2) / 1e6


def carregar_grade_referencia():
    """Carrega metadados da grade."""
    caminho_grade = os.path.join(RASTERS_DIR, "grade_mt.tif")
    with rasterio.open(caminho_grade) as src:
        meta = src.meta.copy()
        transform = src.transform
        shape = (src.height, src.width)
    return meta, transform, shape


def carregar_risco_aceu():
    """Carrega o raster de risco classificado."""
    caminho = os.path.join(RASTERS_DIR, "risco_aceu.tif")
    if not os.path.exists(caminho):
        raise FileNotFoundError("Raster de risco não encontrado. Execute 07_composicao_aceu.py primeiro.")
    with rasterio.open(caminho) as src:
        return src.read(1)


def carregar_municipios():
    """Carrega malha municipal do MT e reprojeta."""
    caminho = os.path.join(DADOS_BRUTOS_DIR, "municipios_mt.geojson")
    if not os.path.exists(caminho):
        raise FileNotFoundError("Malha municipal não encontrada. Execute 01_download_mt.py primeiro.")
    gdf = gpd.read_file(caminho)
    gdf = gdf.to_crs(CRS_PROJETO)
    # Extrair código e nome do município
    # A API do IBGE retorna 'codarea' ou 'CD_MUN' dependendo da versão
    if "codarea" in gdf.columns:
        gdf["cod_municipio"] = gdf["codarea"].astype(str)
    elif "CD_MUN" in gdf.columns:
        gdf["cod_municipio"] = gdf["CD_MUN"].astype(str)
    else:
        # Tentar extrair do campo de propriedades
        gdf["cod_municipio"] = gdf.index.astype(str)

    print(f"  {len(gdf)} municípios carregados")
    return gdf


def rasterizar_municipios(gdf_municipios, shape, transform):
    """
    Rasteriza municípios com um ID numérico único por município.
    Retorna o raster e um dicionário de mapeamento ID -> código IBGE.
    """
    # Criar ID numérico sequencial
    gdf_municipios = gdf_municipios.copy()
    gdf_municipios["id_raster"] = range(1, len(gdf_municipios) + 1)

    mapeamento = dict(zip(
        gdf_municipios["id_raster"],
        gdf_municipios["cod_municipio"]
    ))

    geometrias = [
        (geom, id_raster)
        for geom, id_raster in zip(gdf_municipios.geometry, gdf_municipios["id_raster"])
        if geom is not None
    ]

    raster_municipios = rasterize(
        geometrias,
        out_shape=shape,
        transform=transform,
        fill=0,
        dtype=np.int16,
    )

    return raster_municipios, mapeamento


def calcular_areas_por_classe(risco_aceu, raster_municipios, mapeamento):
    """
    Para cada município, conta pixels em cada classe de risco e converte em área.
    Retorna DataFrame com colunas: cod_municipio, area_classe_1, ..., area_classe_5 (em ha).
    """
    resultados = []

    for id_raster, cod_mun in mapeamento.items():
        mascara_mun = raster_municipios == id_raster
        risco_mun = risco_aceu[mascara_mun]

        areas = {}
        for classe in range(1, 6):
            n_pixels = np.sum(risco_mun == classe)
            areas[f"area_classe_{classe}_ha"] = n_pixels * AREA_PIXEL_HA
            areas[f"pixels_classe_{classe}"] = int(n_pixels)

        areas["cod_municipio"] = cod_mun
        areas["area_floresta_total_ha"] = np.sum(risco_mun > 0) * AREA_PIXEL_HA
        areas["area_municipio_ha"] = np.sum(mascara_mun) * AREA_PIXEL_HA
        resultados.append(areas)

    df = pd.DataFrame(resultados)
    return df


def calcular_perda_esperada(df_areas):
    """
    Calcula a perda florestal esperada em 20 anos para cada município.
    L_20(m) = 0.10*A1 + 0.30*A2 + 0.50*A3 + 0.70*A4 + 0.90*A5
    
    Onde A1..A5 são as áreas florestais em cada classe de risco.
    """
    df = df_areas.copy()

    df["perda_esperada_20anos_ha"] = (
        PROB_PERDA_20[1] * df["area_classe_1_ha"] +
        PROB_PERDA_20[2] * df["area_classe_2_ha"] +
        PROB_PERDA_20[3] * df["area_classe_3_ha"] +
        PROB_PERDA_20[4] * df["area_classe_4_ha"] +
        PROB_PERDA_20[5] * df["area_classe_5_ha"]
    )

    # Converter para km²
    df["perda_esperada_20anos_km2"] = df["perda_esperada_20anos_ha"] / 100

    return df


def carregar_perda_observada():
    """
    Carrega dados de perda observada (PRODES/TerraBrasilis) do JSON do sistema web.
    Retorna DataFrame com cod_municipio, ano, desmatamento_km2.
    """
    # Tentar carregar do JSON do sistema web
    caminho_json = os.path.join(
        os.path.dirname(BASE_DIR_FALLBACK),
        "client", "src", "data", "desmatamento_data.json"
    )

    if not os.path.exists(caminho_json):
        # Tentar caminho alternativo
        caminho_json = os.path.join(DADOS_BRUTOS_DIR, "desmatamento_data.json")

    if not os.path.exists(caminho_json):
        print("  [AVISO] Dados de perda observada não encontrados.")
        print("  O CSV será gerado sem a coluna de desmatamento evitado.")
        return None

    with open(caminho_json, "r") as f:
        dados = json.load(f)

    # Extrair dados dos municípios do MT
    registros = []
    if "municipios_mt" in dados:
        for mun in dados["municipios_mt"]:
            cod = str(mun.get("cod_ibge", mun.get("codigo", "")))
            nome = mun.get("nome", "")
            serie = mun.get("serie_historica", [])
            for item in serie:
                registros.append({
                    "cod_municipio": cod,
                    "nome_municipio": nome,
                    "ano": item.get("ano"),
                    "desmatamento_observado_km2": item.get("desmatamento", 0),
                })

    if not registros:
        return None

    return pd.DataFrame(registros)


def calcular_desmatamento_evitado(df_areas, df_perda_obs):
    """
    Calcula o desmatamento evitado por município e ano.
    DE_T(m) = L_T(m) - O_T(m)
    Onde L_T(m) = (T/20) * L_20(m) e T é o número de anos desde o início da série.
    """
    if df_perda_obs is None:
        print("  [AVISO] Sem dados de perda observada. Calculando apenas perda esperada.")
        return df_areas

    resultados = []

    for _, row in df_areas.iterrows():
        cod_mun = row["cod_municipio"]
        perda_20 = row["perda_esperada_20anos_km2"]

        # Filtrar perda observada deste município
        obs_mun = df_perda_obs[df_perda_obs["cod_municipio"] == cod_mun]

        if len(obs_mun) == 0:
            continue

        for _, obs in obs_mun.iterrows():
            ano = obs["ano"]
            T = 1  # Cada ano PRODES representa 1 ano de observação
            perda_esperada_ano = perda_20 / HORIZONTE_REF  # Anualizada
            perda_observada = obs["desmatamento_observado_km2"]
            desmatamento_evitado = perda_esperada_ano - perda_observada

            resultados.append({
                "cod_municipio": cod_mun,
                "nome_municipio": obs.get("nome_municipio", ""),
                "ano": ano,
                "perda_esperada_km2": round(perda_esperada_ano, 4),
                "perda_observada_km2": round(perda_observada, 4),
                "desmatamento_evitado_km2": round(desmatamento_evitado, 4),
                "area_floresta_ha": row["area_floresta_total_ha"],
                "area_classe_1_ha": row["area_classe_1_ha"],
                "area_classe_2_ha": row["area_classe_2_ha"],
                "area_classe_3_ha": row["area_classe_3_ha"],
                "area_classe_4_ha": row["area_classe_4_ha"],
                "area_classe_5_ha": row["area_classe_5_ha"],
            })

    return pd.DataFrame(resultados)


# Fallback para localizar o diretório base
BASE_DIR_FALLBACK = os.path.dirname(os.path.abspath(__file__))


def main():
    print("=" * 70)
    print("PIPELINE ACEU - ETAPA 08: ESTATÍSTICAS ZONAIS")
    print("=" * 70)

    print("\n[1] Carregando grade de referência...")
    meta, transform, shape = carregar_grade_referencia()

    print("\n[2] Carregando raster de risco ACEU...")
    risco_aceu = carregar_risco_aceu()
    print(f"  Classes presentes: {np.unique(risco_aceu[risco_aceu > 0])}")

    print("\n[3] Carregando malha municipal...")
    gdf_municipios = carregar_municipios()

    print("\n[4] Rasterizando municípios...")
    raster_municipios, mapeamento = rasterizar_municipios(gdf_municipios, shape, transform)
    print(f"  {len(mapeamento)} municípios rasterizados")

    print("\n[5] Calculando áreas por classe de risco para cada município...")
    df_areas = calcular_areas_por_classe(risco_aceu, raster_municipios, mapeamento)
    print(f"  {len(df_areas)} municípios processados")

    # Estatísticas gerais
    total_floresta = df_areas["area_floresta_total_ha"].sum()
    print(f"  Área florestal total no MT: {total_floresta:,.0f} ha ({total_floresta/100:,.0f} km²)")

    print("\n[6] Calculando perda esperada (L_20)...")
    df_areas = calcular_perda_esperada(df_areas)
    total_perda_esp = df_areas["perda_esperada_20anos_km2"].sum()
    print(f"  Perda esperada total em 20 anos: {total_perda_esp:,.0f} km²")

    # Salvar áreas por classe
    caminho_areas = os.path.join(OUTPUT_DIR, "areas_risco_municipios.csv")
    df_areas.to_csv(caminho_areas, index=False)
    print(f"  Salvo: {caminho_areas}")

    print("\n[7] Carregando perda observada (PRODES)...")
    df_perda_obs = carregar_perda_observada()
    if df_perda_obs is not None:
        print(f"  {len(df_perda_obs)} registros de perda observada")
    else:
        print("  Dados de perda observada não disponíveis neste formato.")
        print("  O CSV de áreas por classe foi salvo. Use-o para calcular manualmente.")

    print("\n[8] Calculando desmatamento evitado...")
    df_final = calcular_desmatamento_evitado(df_areas, df_perda_obs)

    if isinstance(df_final, pd.DataFrame) and len(df_final) > 0:
        caminho_final = os.path.join(OUTPUT_DIR, "desmatamento_evitado_mt.csv")
        df_final.to_csv(caminho_final, index=False)
        print(f"  Salvo: {caminho_final}")
        print(f"  {len(df_final)} registros (município x ano)")

        # Resumo
        if "desmatamento_evitado_km2" in df_final.columns:
            total_evitado = df_final["desmatamento_evitado_km2"].sum()
            media_anual = df_final.groupby("ano")["desmatamento_evitado_km2"].sum().mean()
            print(f"\n  Desmatamento evitado total (série): {total_evitado:,.1f} km²")
            print(f"  Média anual de desmatamento evitado: {media_anual:,.1f} km²/ano")

    print("\n[OK] Etapa 08 concluída.")
    print("  Próximo passo: python 09_gerar_tiles.py")


if __name__ == "__main__":
    main()
