"""
Etapa 04 - Componente U: Proteção (áreas legalmente protegidas)

Processo:
1. Carrega shapefiles de Terras Indígenas (FUNAI), UCs (MMA/CNUC) e Quilombos (INCRA)
2. Faz union (dissolve) de todas as áreas protegidas
3. Recorta para o Mato Grosso
4. Reprojeta para EPSG:31981
5. Rasteriza na grade de referência

O componente U é binário:
- U(x) = 1 se o pixel pertence a qualquer área protegida
- U(x) = 0 caso contrário

Na fórmula ACEU, U entra com sinal negativo (reduz o risco):
R_bruto(x) = A(x) + C(x) + E(x) - U(x)

Saída: rasters/componente_u.tif (uint8, valores 0 ou 1)

Referências:
VENDRUSCULO et al. Aplicação da metodologia do Hectare Indicator para estimativa
de desmatamento evitado no bioma Amazônia. Embrapa, 2019.
"""
import os
import numpy as np
import geopandas as gpd
import rasterio
from rasterio.features import rasterize
from shapely.ops import unary_union
from config import (
    DADOS_BRUTOS_DIR, RASTERS_DIR, CRS_PROJETO
)


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


def carregar_camada(pasta, nome_camada):
    """
    Carrega um shapefile de uma pasta, tentando múltiplos formatos.
    Retorna GeoDataFrame ou None se não encontrar.
    """
    if not os.path.exists(pasta):
        print(f"  [AVISO] Pasta não encontrada: {pasta}")
        return None

    # Procurar shapefiles
    arquivos = os.listdir(pasta)
    shps = [f for f in arquivos if f.endswith(".shp")]
    geojsons = [f for f in arquivos if f.endswith(".geojson") or f.endswith(".json")]
    gpkgs = [f for f in arquivos if f.endswith(".gpkg")]

    caminho = None
    if shps:
        caminho = os.path.join(pasta, shps[0])
    elif geojsons:
        caminho = os.path.join(pasta, geojsons[0])
    elif gpkgs:
        caminho = os.path.join(pasta, gpkgs[0])

    if caminho is None:
        print(f"  [AVISO] Nenhum arquivo vetorial encontrado em: {pasta}")
        return None

    print(f"  Carregando {nome_camada}: {os.path.basename(caminho)}")
    gdf = gpd.read_file(caminho)
    print(f"    {len(gdf)} feições carregadas")
    return gdf


def recortar_para_mt(gdf, limite_mt):
    """Recorta um GeoDataFrame para o limite do MT."""
    if gdf is None:
        return None
    # Garantir mesmo CRS
    gdf = gdf.to_crs(limite_mt.crs)
    # Clip
    gdf_clip = gpd.clip(gdf, limite_mt)
    print(f"    Após recorte para MT: {len(gdf_clip)} feições")
    return gdf_clip


def unir_areas_protegidas(lista_gdfs):
    """
    Faz union de todas as geometrias de áreas protegidas.
    Retorna um GeoDataFrame com uma única geometria (multipolygon).
    """
    todas_geometrias = []
    for gdf in lista_gdfs:
        if gdf is not None and len(gdf) > 0:
            for geom in gdf.geometry:
                if geom is not None and geom.is_valid:
                    todas_geometrias.append(geom)

    if not todas_geometrias:
        print("  [ERRO] Nenhuma geometria válida encontrada!")
        return None

    print(f"  Unindo {len(todas_geometrias)} geometrias...")
    uniao = unary_union(todas_geometrias)
    gdf_uniao = gpd.GeoDataFrame(geometry=[uniao], crs=CRS_PROJETO)
    print(f"  União concluída.")
    return gdf_uniao


def rasterizar_protecao(gdf_protecao, shape, transform, mascara):
    """
    Rasteriza áreas protegidas: 1 = protegido, 0 = não protegido.
    Aplica máscara do estado (fora do MT = 0).
    """
    if gdf_protecao is None or len(gdf_protecao) == 0:
        print("  [AVISO] Sem dados de áreas protegidas. Gerando raster zerado.")
        return np.zeros(shape, dtype=np.uint8)

    geometrias = [(geom, 1) for geom in gdf_protecao.geometry if geom is not None]

    componente_u = rasterize(
        geometrias,
        out_shape=shape,
        transform=transform,
        fill=0,
        dtype=np.uint8,
    )

    # Aplicar máscara (fora do MT = 0)
    componente_u = componente_u * mascara

    pixels_protegidos = np.sum(componente_u == 1)
    pixels_total = np.sum(mascara == 1)
    pct = pixels_protegidos / pixels_total * 100 if pixels_total > 0 else 0

    print(f"  Pixels protegidos: {pixels_protegidos:,} ({pct:.1f}% do MT)")
    area_protegida_km2 = pixels_protegidos * (30 ** 2) / 1e6
    print(f"  Área protegida estimada: {area_protegida_km2:,.0f} km²")

    return componente_u


def main():
    print("=" * 70)
    print("PIPELINE ACEU - ETAPA 04: COMPONENTE U (PROTEÇÃO)")
    print("=" * 70)

    print("\n[1] Carregando grade de referência...")
    meta, transform, shape, mascara = carregar_grade_referencia()

    print("\n[2] Carregando limite do MT para recorte...")
    caminho_limite = os.path.join(DADOS_BRUTOS_DIR, "limite_mt.geojson")
    limite_mt = gpd.read_file(caminho_limite).to_crs(CRS_PROJETO)

    print("\n[3] Carregando camadas de áreas protegidas...")

    # Terras Indígenas
    print("\n  --- Terras Indígenas (FUNAI) ---")
    gdf_ti = carregar_camada(
        os.path.join(DADOS_BRUTOS_DIR, "terras_indigenas"),
        "Terras Indígenas"
    )
    gdf_ti = recortar_para_mt(gdf_ti, limite_mt) if gdf_ti is not None else None

    # Unidades de Conservação
    print("\n  --- Unidades de Conservação (MMA/CNUC) ---")
    gdf_uc = carregar_camada(
        os.path.join(DADOS_BRUTOS_DIR, "ucs"),
        "Unidades de Conservação"
    )
    gdf_uc = recortar_para_mt(gdf_uc, limite_mt) if gdf_uc is not None else None

    # Quilombos
    print("\n  --- Territórios Quilombolas (INCRA) ---")
    gdf_quilombo = carregar_camada(
        os.path.join(DADOS_BRUTOS_DIR, "quilombos"),
        "Quilombos"
    )
    gdf_quilombo = recortar_para_mt(gdf_quilombo, limite_mt) if gdf_quilombo is not None else None

    # Reprojetar todas para CRS do projeto
    print("\n[4] Reprojetando para CRS do projeto...")
    camadas = []
    for nome, gdf in [("TIs", gdf_ti), ("UCs", gdf_uc), ("Quilombos", gdf_quilombo)]:
        if gdf is not None and len(gdf) > 0:
            gdf = gdf.to_crs(CRS_PROJETO)
            camadas.append(gdf)
            print(f"  {nome}: {len(gdf)} feições reprojetadas")
        else:
            print(f"  {nome}: sem dados disponíveis")

    print("\n[5] Unindo todas as áreas protegidas...")
    gdf_protecao = unir_areas_protegidas(camadas)

    print("\n[6] Rasterizando componente U...")
    componente_u = rasterizar_protecao(gdf_protecao, shape, transform, mascara)

    print("\n[7] Salvando componente U...")
    caminho = os.path.join(RASTERS_DIR, "componente_u.tif")
    meta_out = meta.copy()
    meta_out["dtype"] = "uint8"
    meta_out["compress"] = "lzw"
    with rasterio.open(caminho, "w", **meta_out) as dst:
        dst.write(componente_u, 1)
    tamanho_mb = os.path.getsize(caminho) / 1024 / 1024
    print(f"  Salvo: {caminho} ({tamanho_mb:.1f} MB)")

    print("\n[OK] Etapa 04 concluída.")
    print("  Próximo passo: python 05_cultivabilidade.py")


if __name__ == "__main__":
    main()
