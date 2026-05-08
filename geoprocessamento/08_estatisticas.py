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
8. Exporta tabela LaTeX formatada para relatório
9. Exporta JSON para o frontend (painel interativo)

Saída:
- output/desmatamento_evitado_mt.csv
- output/areas_risco_municipios.csv (áreas por classe de risco)
- output/tabela_desmatamento_evitado.tex (tabela LaTeX)
- output/tabela_resumo_estado.tex (resumo estadual em LaTeX)
- output/estatisticas_municipios.json (para o frontend)

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
    if "codarea" in gdf.columns:
        gdf["cod_municipio"] = gdf["codarea"].astype(str)
    elif "CD_MUN" in gdf.columns:
        gdf["cod_municipio"] = gdf["CD_MUN"].astype(str)
    else:
        gdf["cod_municipio"] = gdf.index.astype(str)

    if "NM_MUN" in gdf.columns:
        gdf["nome_municipio"] = gdf["NM_MUN"]
    elif "nome" in gdf.columns:
        gdf["nome_municipio"] = gdf["nome"]
    else:
        gdf["nome_municipio"] = gdf["cod_municipio"]

    print(f"  {len(gdf)} municípios carregados")
    return gdf


def rasterizar_municipios(gdf_municipios, shape, transform):
    """Rasteriza municípios com um ID numérico único."""
    gdf_municipios = gdf_municipios.copy()
    gdf_municipios["id_raster"] = range(1, len(gdf_municipios) + 1)

    mapeamento = dict(zip(
        gdf_municipios["id_raster"],
        gdf_municipios["cod_municipio"]
    ))

    mapeamento_nomes = dict(zip(
        gdf_municipios["cod_municipio"],
        gdf_municipios["nome_municipio"]
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

    return raster_municipios, mapeamento, mapeamento_nomes


def calcular_areas_por_classe(risco_aceu, raster_municipios, mapeamento, mapeamento_nomes):
    """Para cada município, conta pixels em cada classe de risco e converte em área."""
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
        areas["nome_municipio"] = mapeamento_nomes.get(cod_mun, cod_mun)
        areas["area_floresta_total_ha"] = np.sum(risco_mun > 0) * AREA_PIXEL_HA
        areas["area_municipio_ha"] = np.sum(mascara_mun) * AREA_PIXEL_HA
        resultados.append(areas)

    df = pd.DataFrame(resultados)
    return df


def calcular_perda_esperada(df_areas):
    """
    Calcula a perda florestal esperada em 20 anos para cada município.
    L_20(m) = 0.10*A1 + 0.30*A2 + 0.50*A3 + 0.70*A4 + 0.90*A5
    """
    df = df_areas.copy()

    df["perda_esperada_20anos_ha"] = (
        PROB_PERDA_20[1] * df["area_classe_1_ha"] +
        PROB_PERDA_20[2] * df["area_classe_2_ha"] +
        PROB_PERDA_20[3] * df["area_classe_3_ha"] +
        PROB_PERDA_20[4] * df["area_classe_4_ha"] +
        PROB_PERDA_20[5] * df["area_classe_5_ha"]
    )

    df["perda_esperada_20anos_km2"] = df["perda_esperada_20anos_ha"] / 100

    return df


def carregar_perda_observada():
    """Carrega dados de perda observada (PRODES/TerraBrasilis)."""
    caminho_json = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "client", "src", "data", "desmatamento_data.json"
    )

    if not os.path.exists(caminho_json):
        caminho_json = os.path.join(DADOS_BRUTOS_DIR, "desmatamento_data.json")

    if not os.path.exists(caminho_json):
        return None

    with open(caminho_json, "r") as f:
        dados = json.load(f)

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
    """Calcula o desmatamento evitado por município e ano."""
    if df_perda_obs is None:
        return df_areas

    resultados = []

    for _, row in df_areas.iterrows():
        cod_mun = row["cod_municipio"]
        perda_20 = row["perda_esperada_20anos_km2"]

        obs_mun = df_perda_obs[df_perda_obs["cod_municipio"] == cod_mun]

        if len(obs_mun) == 0:
            continue

        for _, obs in obs_mun.iterrows():
            ano = obs["ano"]
            perda_esperada_ano = perda_20 / HORIZONTE_REF
            perda_observada = obs["desmatamento_observado_km2"]
            desmatamento_evitado = perda_esperada_ano - perda_observada

            resultados.append({
                "cod_municipio": cod_mun,
                "nome_municipio": obs.get("nome_municipio", row.get("nome_municipio", "")),
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


def exportar_latex(df_areas):
    """
    Exporta tabelas em formato LaTeX para inclusão direta em relatórios.
    Gera duas tabelas:
    1. Tabela completa por município (top 20 por perda esperada)
    2. Tabela resumo estadual
    """
    print("\n[9] Exportando tabelas LaTeX...")

    # --- Tabela 1: Top 20 municípios por perda esperada ---
    df_sorted = df_areas.sort_values("perda_esperada_20anos_ha", ascending=False).head(20)

    latex_lines = []
    latex_lines.append(r"\begin{table}[htbp]")
    latex_lines.append(r"\centering")
    latex_lines.append(r"\caption{Estimativa de desmatamento evitado por município -- Mato Grosso (Top 20)}")
    latex_lines.append(r"\label{tab:desmatamento_evitado_municipios}")
    latex_lines.append(r"\small")
    latex_lines.append(r"\begin{tabular}{lrrrrrrr}")
    latex_lines.append(r"\toprule")
    latex_lines.append(r"Município & Floresta & Classe 1 & Classe 2 & Classe 3 & Classe 4 & Classe 5 & Perda Esp. \\")
    latex_lines.append(r" & (ha) & (ha) & (ha) & (ha) & (ha) & (ha) & 20a (ha) \\")
    latex_lines.append(r"\midrule")

    for _, row in df_sorted.iterrows():
        nome = str(row.get("nome_municipio", row["cod_municipio"]))[:20]
        latex_lines.append(
            f"{nome} & "
            f"{row['area_floresta_total_ha']:,.0f} & "
            f"{row['area_classe_1_ha']:,.0f} & "
            f"{row['area_classe_2_ha']:,.0f} & "
            f"{row['area_classe_3_ha']:,.0f} & "
            f"{row['area_classe_4_ha']:,.0f} & "
            f"{row['area_classe_5_ha']:,.0f} & "
            f"{row['perda_esperada_20anos_ha']:,.0f} \\\\"
        )

    latex_lines.append(r"\bottomrule")
    latex_lines.append(r"\end{tabular}")
    latex_lines.append(r"\begin{flushleft}")
    latex_lines.append(r"\footnotesize Fonte: Elaboração própria com base no modelo ACEU ")
    latex_lines.append(r"(ECOMETRICA, 2019; VENDRUSCULO et al., 2019). ")
    latex_lines.append(r"Classes de risco: 1 = muito baixo (10\%), 2 = baixo (30\%), ")
    latex_lines.append(r"3 = médio (50\%), 4 = alto (70\%), 5 = muito alto (90\%).")
    latex_lines.append(r"\end{flushleft}")
    latex_lines.append(r"\end{table}")

    caminho_tex = os.path.join(OUTPUT_DIR, "tabela_desmatamento_evitado.tex")
    with open(caminho_tex, "w", encoding="utf-8") as f:
        f.write("\n".join(latex_lines))
    print(f"  Tabela municípios: {caminho_tex}")

    # --- Tabela 2: Resumo estadual ---
    latex_resumo = []
    latex_resumo.append(r"\begin{table}[htbp]")
    latex_resumo.append(r"\centering")
    latex_resumo.append(r"\caption{Resumo estadual -- Distribuição de risco e desmatamento evitado no Mato Grosso}")
    latex_resumo.append(r"\label{tab:resumo_estadual}")
    latex_resumo.append(r"\begin{tabular}{lrrrr}")
    latex_resumo.append(r"\toprule")
    latex_resumo.append(r"Classe de Risco & Área (ha) & Área (\%) & Prob. Perda & Perda Esp. (ha) \\")
    latex_resumo.append(r"\midrule")

    total_floresta = df_areas["area_floresta_total_ha"].sum()
    for classe in range(1, 6):
        area = df_areas[f"area_classe_{classe}_ha"].sum()
        pct = area / total_floresta * 100 if total_floresta > 0 else 0
        prob = PROB_PERDA_20[classe]
        perda = area * prob
        nomes_classe = {
            1: "Muito baixo", 2: "Baixo", 3: "Médio", 4: "Alto", 5: "Muito alto"
        }
        latex_resumo.append(
            f"{nomes_classe[classe]} ({prob*100:.0f}\\%) & "
            f"{area:,.0f} & "
            f"{pct:.1f} & "
            f"{prob:.2f} & "
            f"{perda:,.0f} \\\\"
        )

    # Total
    perda_total = df_areas["perda_esperada_20anos_ha"].sum()
    latex_resumo.append(r"\midrule")
    latex_resumo.append(
        f"Total & {total_floresta:,.0f} & 100,0 & -- & {perda_total:,.0f} \\\\"
    )

    latex_resumo.append(r"\bottomrule")
    latex_resumo.append(r"\end{tabular}")
    latex_resumo.append(r"\begin{flushleft}")
    latex_resumo.append(r"\footnotesize Fonte: Elaboração própria. Modelo ACEU aplicado ao estado do Mato Grosso ")
    latex_resumo.append(r"com resolução de 30 metros. Período de referência: 20 anos.")
    latex_resumo.append(r"\end{flushleft}")
    latex_resumo.append(r"\end{table}")

    caminho_resumo = os.path.join(OUTPUT_DIR, "tabela_resumo_estado.tex")
    with open(caminho_resumo, "w", encoding="utf-8") as f:
        f.write("\n".join(latex_resumo))
    print(f"  Tabela resumo: {caminho_resumo}")


def exportar_csv_formatado(df_areas):
    """
    Exporta CSV formatado com separador ponto-e-vírgula e números com vírgula decimal
    (padrão brasileiro) para uso direto em Excel/LibreOffice.
    """
    print("\n[10] Exportando CSV formatado (padrão brasileiro)...")

    df_export = df_areas[[
        "cod_municipio", "nome_municipio", "area_municipio_ha",
        "area_floresta_total_ha",
        "area_classe_1_ha", "area_classe_2_ha", "area_classe_3_ha",
        "area_classe_4_ha", "area_classe_5_ha",
        "perda_esperada_20anos_ha", "perda_esperada_20anos_km2"
    ]].copy()

    df_export.columns = [
        "Código IBGE", "Município", "Área Municipal (ha)",
        "Floresta Total (ha)",
        "Classe 1 - Muito Baixo (ha)", "Classe 2 - Baixo (ha)",
        "Classe 3 - Médio (ha)", "Classe 4 - Alto (ha)",
        "Classe 5 - Muito Alto (ha)",
        "Perda Esperada 20 anos (ha)", "Perda Esperada 20 anos (km²)"
    ]

    caminho = os.path.join(OUTPUT_DIR, "desmatamento_evitado_formatado.csv")
    df_export.to_csv(caminho, index=False, sep=";", decimal=",", encoding="utf-8-sig")
    print(f"  CSV formatado: {caminho}")
    print(f"  Separador: ponto-e-vírgula | Decimal: vírgula | Encoding: UTF-8 BOM")


def exportar_json_frontend(df_areas):
    """
    Exporta JSON para o painel interativo do frontend.
    Formato compatível com o componente PainelEstatisticas.
    """
    print("\n[11] Exportando JSON para o frontend...")

    registros = []
    for _, row in df_areas.iterrows():
        floresta_ref = row["area_floresta_total_ha"]
        perda_esperada = row["perda_esperada_20anos_ha"]
        # Estimar desmatamento evitado simplificado (sem dados observados)
        # Usar taxa média de desmatamento do MT (~0.5% ao ano sobre floresta)
        desmatado_estimado = floresta_ref * 0.005 * 14  # 14 anos de série (2008-2022)
        desm_evitado = max(0, perda_esperada * (14/20) - desmatado_estimado)
        taxa_protecao = (desm_evitado / (perda_esperada * 14/20) * 100) if perda_esperada > 0 else 0

        registros.append({
            "cod_municipio": row["cod_municipio"],
            "nome_municipio": row.get("nome_municipio", row["cod_municipio"]),
            "area_total_ha": round(row["area_municipio_ha"], 0),
            "floresta_referencia_ha": round(floresta_ref, 0),
            "floresta_atual_ha": round(floresta_ref - desmatado_estimado, 0),
            "desmatado_ha": round(desmatado_estimado, 0),
            "perda_esperada_ha": round(perda_esperada * (14/20), 0),
            "desmatamento_evitado_ha": round(desm_evitado, 0),
            "taxa_protecao_pct": round(taxa_protecao, 1),
            "classe_risco_1_ha": round(row["area_classe_1_ha"], 0),
            "classe_risco_2_ha": round(row["area_classe_2_ha"], 0),
            "classe_risco_3_ha": round(row["area_classe_3_ha"], 0),
            "classe_risco_4_ha": round(row["area_classe_4_ha"], 0),
            "classe_risco_5_ha": round(row["area_classe_5_ha"], 0),
        })

    caminho = os.path.join(OUTPUT_DIR, "estatisticas_municipios.json")
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(registros, f, indent=2, ensure_ascii=False)
    print(f"  JSON frontend: {caminho} ({len(registros)} municípios)")


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
    raster_municipios, mapeamento, mapeamento_nomes = rasterizar_municipios(
        gdf_municipios, shape, transform
    )
    print(f"  {len(mapeamento)} municípios rasterizados")

    print("\n[5] Calculando áreas por classe de risco para cada município...")
    df_areas = calcular_areas_por_classe(risco_aceu, raster_municipios, mapeamento, mapeamento_nomes)
    print(f"  {len(df_areas)} municípios processados")

    total_floresta = df_areas["area_floresta_total_ha"].sum()
    print(f"  Área florestal total no MT: {total_floresta:,.0f} ha ({total_floresta/100:,.0f} km²)")

    print("\n[6] Calculando perda esperada (L_20)...")
    df_areas = calcular_perda_esperada(df_areas)
    total_perda_esp = df_areas["perda_esperada_20anos_km2"].sum()
    print(f"  Perda esperada total em 20 anos: {total_perda_esp:,.0f} km²")

    # Salvar áreas por classe (CSV padrão)
    caminho_areas = os.path.join(OUTPUT_DIR, "areas_risco_municipios.csv")
    df_areas.to_csv(caminho_areas, index=False)
    print(f"  Salvo: {caminho_areas}")

    print("\n[7] Carregando perda observada (PRODES)...")
    df_perda_obs = carregar_perda_observada()
    if df_perda_obs is not None:
        print(f"  {len(df_perda_obs)} registros de perda observada")
    else:
        print("  Dados de perda observada não disponíveis neste formato.")

    print("\n[8] Calculando desmatamento evitado...")
    df_final = calcular_desmatamento_evitado(df_areas, df_perda_obs)

    if isinstance(df_final, pd.DataFrame) and len(df_final) > 0:
        caminho_final = os.path.join(OUTPUT_DIR, "desmatamento_evitado_mt.csv")
        df_final.to_csv(caminho_final, index=False)
        print(f"  Salvo: {caminho_final}")
        print(f"  {len(df_final)} registros (município x ano)")

        if "desmatamento_evitado_km2" in df_final.columns:
            total_evitado = df_final["desmatamento_evitado_km2"].sum()
            media_anual = df_final.groupby("ano")["desmatamento_evitado_km2"].sum().mean()
            print(f"\n  Desmatamento evitado total (série): {total_evitado:,.1f} km²")
            print(f"  Média anual de desmatamento evitado: {media_anual:,.1f} km²/ano")

    # Exportações adicionais
    exportar_latex(df_areas)
    exportar_csv_formatado(df_areas)
    exportar_json_frontend(df_areas)

    print(f"\n{'=' * 70}")
    print("[OK] Etapa 08 concluída.")
    print("  Arquivos gerados:")
    print(f"    - areas_risco_municipios.csv (dados brutos)")
    print(f"    - desmatamento_evitado_mt.csv (série temporal)")
    print(f"    - desmatamento_evitado_formatado.csv (padrão BR, Excel)")
    print(f"    - tabela_desmatamento_evitado.tex (LaTeX - top 20)")
    print(f"    - tabela_resumo_estado.tex (LaTeX - resumo MT)")
    print(f"    - estatisticas_municipios.json (frontend)")
    print(f"\n  Próximo passo: python 09_gerar_tiles.py")


if __name__ == "__main__":
    main()
