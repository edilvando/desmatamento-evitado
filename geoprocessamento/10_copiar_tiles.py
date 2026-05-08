"""
Etapa 10 - Copiar tiles e metadados para o frontend

Copia a pasta tiles/ gerada pelo pipeline para client/public/tiles/
de modo que o Vite sirva os tiles como arquivos estáticos.

Também copia o GeoJSON dos municípios para overlay no mapa Leaflet.

Uso:
    python 10_copiar_tiles.py

Após executar, basta rodar 'pnpm dev' na raiz do projeto para
visualizar o mapa de risco no navegador.
"""
import os
import shutil
import json
import geopandas as gpd
from config import TILES_DIR, DADOS_BRUTOS_DIR, BASE_DIR


# Diretório de destino no frontend
FRONTEND_PUBLIC = os.path.join(os.path.dirname(BASE_DIR), "client", "public")
FRONTEND_TILES = os.path.join(FRONTEND_PUBLIC, "tiles")


def copiar_tiles():
    """Copia a pasta tiles/ para client/public/tiles/."""
    print("[1] Copiando tiles para o frontend...")

    if not os.path.exists(TILES_DIR):
        print("  [ERRO] Pasta tiles/ não encontrada. Execute 09_gerar_tiles.py primeiro.")
        return False

    # Contar tiles existentes
    n_tiles = sum(1 for root, dirs, files in os.walk(TILES_DIR) for f in files if f.endswith(".png"))
    if n_tiles == 0:
        print("  [ERRO] Nenhum tile PNG encontrado. Execute 09_gerar_tiles.py primeiro.")
        return False

    print(f"  {n_tiles} tiles encontrados")

    # Remover destino antigo se existir
    if os.path.exists(FRONTEND_TILES):
        print("  Removendo tiles antigos...")
        shutil.rmtree(FRONTEND_TILES)

    # Copiar
    print(f"  Copiando para: {FRONTEND_TILES}")
    shutil.copytree(TILES_DIR, FRONTEND_TILES)

    # Verificar
    n_copiados = sum(1 for root, dirs, files in os.walk(FRONTEND_TILES) for f in files if f.endswith(".png"))
    print(f"  {n_copiados} tiles copiados com sucesso")

    return True


def copiar_municipios_geojson():
    """
    Converte e copia o GeoJSON dos municípios para o frontend.
    Simplifica as geometrias para reduzir o tamanho do arquivo.
    """
    print("\n[2] Preparando GeoJSON dos municípios para overlay...")

    caminho_origem = os.path.join(DADOS_BRUTOS_DIR, "municipios_mt.geojson")
    caminho_destino = os.path.join(FRONTEND_TILES, "municipios_mt.geojson")

    if not os.path.exists(caminho_origem):
        print("  [AVISO] municipios_mt.geojson não encontrado.")
        print("  O overlay de municípios não estará disponível no mapa.")
        return False

    # Carregar e simplificar geometrias
    gdf = gpd.read_file(caminho_origem)

    # Garantir que está em WGS84
    if gdf.crs and gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs("EPSG:4326")

    # Simplificar geometrias para reduzir tamanho (~10x menor)
    gdf["geometry"] = gdf.geometry.simplify(tolerance=0.005, preserve_topology=True)

    # Manter apenas colunas essenciais
    colunas_manter = []
    for col in ["codarea", "CD_MUN", "NM_MUN", "nome", "SIGLA_UF"]:
        if col in gdf.columns:
            colunas_manter.append(col)
    colunas_manter.append("geometry")
    gdf = gdf[colunas_manter]

    # Renomear para padronizar
    if "codarea" in gdf.columns and "CD_MUN" not in gdf.columns:
        gdf = gdf.rename(columns={"codarea": "CD_MUN"})

    # Salvar
    os.makedirs(os.path.dirname(caminho_destino), exist_ok=True)
    gdf.to_file(caminho_destino, driver="GeoJSON")

    tamanho_kb = os.path.getsize(caminho_destino) / 1024
    print(f"  GeoJSON salvo: {caminho_destino} ({tamanho_kb:.0f} KB)")
    print(f"  {len(gdf)} municípios")

    return True


def gerar_dados_resumo():
    """
    Gera um JSON resumo com dados por município para o frontend.
    Combina informações de risco do CSV de output com o GeoJSON.
    """
    print("\n[3] Gerando dados resumo para o frontend...")

    caminho_csv = os.path.join(BASE_DIR, "output", "areas_risco_municipios.csv")
    caminho_destino = os.path.join(FRONTEND_TILES, "resumo_municipios.json")

    if not os.path.exists(caminho_csv):
        print("  [AVISO] CSV de áreas por classe não encontrado.")
        print("  Execute 08_estatisticas.py primeiro para gerar dados completos.")
        return False

    import pandas as pd
    df = pd.read_csv(caminho_csv)

    # Converter para JSON
    resumo = {}
    for _, row in df.iterrows():
        cod = str(row.get("cod_municipio", ""))
        if not cod:
            continue
        resumo[cod] = {
            "area_floresta_ha": round(row.get("area_floresta_total_ha", 0), 1),
            "area_municipio_ha": round(row.get("area_municipio_ha", 0), 1),
            "classes": {
                "1": round(row.get("area_classe_1_ha", 0), 1),
                "2": round(row.get("area_classe_2_ha", 0), 1),
                "3": round(row.get("area_classe_3_ha", 0), 1),
                "4": round(row.get("area_classe_4_ha", 0), 1),
                "5": round(row.get("area_classe_5_ha", 0), 1),
            },
            "perda_esperada_20anos_km2": round(row.get("perda_esperada_20anos_km2", 0), 2),
        }

    with open(caminho_destino, "w", encoding="utf-8") as f:
        json.dump(resumo, f, ensure_ascii=False, indent=2)

    print(f"  Resumo salvo: {caminho_destino}")
    print(f"  {len(resumo)} municípios com dados de risco")

    return True


def main():
    print("=" * 70)
    print("PIPELINE ACEU - ETAPA 10: COPIAR TILES PARA O FRONTEND")
    print("=" * 70)

    sucesso_tiles = copiar_tiles()
    sucesso_geo = copiar_municipios_geojson()
    sucesso_resumo = gerar_dados_resumo()

    print("\n" + "=" * 70)
    if sucesso_tiles:
        print("  Tiles copiados com sucesso para o frontend.")
        print(f"  Diretório: {FRONTEND_TILES}")
        print("")
        print("  Para visualizar:")
        print("  1. cd .. (voltar para a raiz do projeto)")
        print("  2. pnpm dev")
        print("  3. Abrir: http://localhost:3000/desmatamento-evitado/mapa-risco")
    else:
        print("  [ERRO] Falha ao copiar tiles. Verifique os erros acima.")

    print("=" * 70)


if __name__ == "__main__":
    main()
