"""
Etapa 09 - Geração de Tiles para Visualização Web

Gera tiles PNG no padrão XYZ/Slippy Map para DUAS camadas:
1. Risco de desmatamento (classes 1-5 do modelo ACEU)
2. Desmatamento evitado (classes 1-6 do cruzamento ACEU x PRODES)

Processo para cada camada:
1. Carrega o raster classificado
2. Reprojeta para EPSG:4326 (WGS84) - necessário para tiles web
3. Aplica colormap específico
4. Gera tiles PNG no padrão XYZ (z/x/y.png)

Níveis de zoom gerados: 5 a 12
- Zoom 5-7: visão geral do estado
- Zoom 8-10: visão regional (grupos de municípios)
- Zoom 11-12: visão local (detalhamento municipal)

Saída:
- tiles/risco/{z}/{x}/{y}.png (tiles de risco ACEU)
- tiles/evitado/{z}/{x}/{y}.png (tiles de desmatamento evitado)
- tiles/metadata.json (metadados para o frontend)

Referência:
OpenStreetMap Slippy Map Tilenames: https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
"""
import os
import math
import json
import numpy as np
import rasterio
from rasterio.warp import reproject, calculate_default_transform, Resampling
from PIL import Image
from config import (
    RASTERS_DIR, TILES_DIR, CRS_PROJETO
)

# Níveis de zoom a gerar
ZOOM_MIN = 5
ZOOM_MAX = 12

# Tamanho de cada tile em pixels
TILE_SIZE = 256

# Colormap para RISCO ACEU (classes 1-5)
COLORMAP_RISCO = {
    0: (0, 0, 0, 0),           # transparente (sem dados)
    1: (34, 139, 34, 180),     # verde escuro - risco muito baixo
    2: (144, 238, 144, 180),   # verde claro - risco baixo
    3: (255, 255, 0, 180),     # amarelo - risco médio
    4: (255, 165, 0, 180),     # laranja - risco alto
    5: (220, 20, 20, 180),     # vermelho - risco muito alto
}

# Colormap para DESMATAMENTO EVITADO (classes 1-6)
COLORMAP_EVITADO = {
    0: (0, 0, 0, 0),           # transparente (sem dados)
    1: (200, 200, 200, 100),   # cinza claro - floresta mantida, risco baixo (esperado)
    2: (173, 216, 230, 160),   # azul claro - parcialmente evitado
    3: (0, 128, 0, 200),       # verde - desmatamento evitado
    4: (0, 80, 0, 220),        # verde escuro - fortemente evitado
    5: (220, 20, 20, 200),     # vermelho - perda confirmada (modelo acertou)
    6: (128, 0, 128, 180),     # roxo - perda inesperada
}


def reprojetar_raster(nome_entrada, nome_saida):
    """Reprojeta um raster para WGS84 (EPSG:4326)."""
    caminho_entrada = os.path.join(RASTERS_DIR, nome_entrada)
    caminho_saida = os.path.join(RASTERS_DIR, nome_saida)

    if not os.path.exists(caminho_entrada):
        print(f"  [ERRO] Não encontrado: {caminho_entrada}")
        return None

    if os.path.exists(caminho_saida):
        print(f"  Já existe: {nome_saida}")
        return caminho_saida

    with rasterio.open(caminho_entrada) as src:
        transform, width, height = calculate_default_transform(
            src.crs, "EPSG:4326", src.width, src.height, *src.bounds
        )

        meta = src.meta.copy()
        meta.update({
            "crs": "EPSG:4326",
            "transform": transform,
            "width": width,
            "height": height,
            "compress": "lzw",
        })

        with rasterio.open(caminho_saida, "w", **meta) as dst:
            reproject(
                source=rasterio.band(src, 1),
                destination=rasterio.band(dst, 1),
                src_transform=src.transform,
                src_crs=src.crs,
                dst_transform=transform,
                dst_crs="EPSG:4326",
                resampling=Resampling.nearest,
            )

    print(f"  Reprojetado: {nome_saida} ({width}x{height} pixels)")
    return caminho_saida


def lat_lon_to_tile(lat, lon, zoom):
    """Converte coordenadas lat/lon para índices de tile XYZ."""
    n = 2 ** zoom
    x = int((lon + 180.0) / 360.0 * n)
    lat_rad = math.radians(lat)
    y = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return x, y


def tile_bounds(x, y, zoom):
    """Retorna os bounds (lon_min, lat_min, lon_max, lat_max) de um tile."""
    n = 2 ** zoom
    lon_min = x / n * 360.0 - 180.0
    lon_max = (x + 1) / n * 360.0 - 180.0
    lat_max = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    lat_min = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / n))))
    return lon_min, lat_min, lon_max, lat_max


def gerar_tile(raster_data, bounds, x, y, zoom, colormap):
    """
    Gera um tile PNG 256x256 para a posição (x, y, zoom).
    Retorna uma imagem PIL RGBA ou None se o tile estiver vazio.
    """
    t_lon_min, t_lat_min, t_lon_max, t_lat_max = tile_bounds(x, y, zoom)

    # Verificar se o tile intersecta o raster
    r_lon_min, r_lat_min, r_lon_max, r_lat_max = bounds
    if (t_lon_max <= r_lon_min or t_lon_min >= r_lon_max or
        t_lat_max <= r_lat_min or t_lat_min >= r_lat_max):
        return None

    # Calcular a janela do raster que corresponde ao tile
    height, width = raster_data.shape

    px_per_lon = width / (r_lon_max - r_lon_min)
    px_per_lat = height / (r_lat_max - r_lat_min)

    col_start = max(0, int((t_lon_min - r_lon_min) * px_per_lon))
    col_end = min(width, int((t_lon_max - r_lon_min) * px_per_lon))
    row_start = max(0, int((r_lat_max - t_lat_max) * px_per_lat))
    row_end = min(height, int((r_lat_max - t_lat_min) * px_per_lat))

    if col_start >= col_end or row_start >= row_end:
        return None

    # Extrair porção do raster
    chunk = raster_data[row_start:row_end, col_start:col_end]

    if np.all(chunk == 0):
        return None

    # Redimensionar para TILE_SIZE x TILE_SIZE
    img_chunk = Image.fromarray(chunk, mode="L")
    img_resized = img_chunk.resize((TILE_SIZE, TILE_SIZE), Image.Resampling.NEAREST)
    data_resized = np.array(img_resized)

    # Aplicar colormap
    rgba = np.zeros((TILE_SIZE, TILE_SIZE, 4), dtype=np.uint8)
    for valor, cor in colormap.items():
        mascara = data_resized == valor
        rgba[mascara] = cor

    return Image.fromarray(rgba, mode="RGBA")


def gerar_tiles_camada(caminho_raster, subpasta, colormap, descricao):
    """Gera todos os tiles para uma camada específica."""
    print(f"\n  Gerando tiles: {descricao}")
    print(f"  Subpasta: tiles/{subpasta}/")

    with rasterio.open(caminho_raster) as src:
        raster_data = src.read(1)
        raster_bounds = src.bounds

    bounds = (raster_bounds.left, raster_bounds.bottom, raster_bounds.right, raster_bounds.top)
    print(f"  Bounds: lon=[{bounds[0]:.2f}, {bounds[2]:.2f}], lat=[{bounds[1]:.2f}, {bounds[3]:.2f}]")

    tiles_dir_camada = os.path.join(TILES_DIR, subpasta)
    total_tiles = 0
    tiles_gerados = 0

    for zoom in range(ZOOM_MIN, ZOOM_MAX + 1):
        x_min, y_max_tile = lat_lon_to_tile(bounds[1], bounds[0], zoom)
        x_max, y_min_tile = lat_lon_to_tile(bounds[3], bounds[2], zoom)

        n = 2 ** zoom
        x_min = max(0, x_min - 1)
        x_max = min(n - 1, x_max + 1)
        y_min_tile = max(0, y_min_tile - 1)
        y_max_tile = min(n - 1, y_max_tile + 1)

        n_tiles_zoom = (x_max - x_min + 1) * (y_max_tile - y_min_tile + 1)
        total_tiles += n_tiles_zoom
        tiles_neste_zoom = 0

        for x in range(x_min, x_max + 1):
            for y in range(y_min_tile, y_max_tile + 1):
                tile_img = gerar_tile(raster_data, bounds, x, y, zoom, colormap)

                if tile_img is not None:
                    tile_dir = os.path.join(tiles_dir_camada, str(zoom), str(x))
                    os.makedirs(tile_dir, exist_ok=True)
                    tile_path = os.path.join(tile_dir, f"{y}.png")
                    tile_img.save(tile_path, "PNG", optimize=True)
                    tiles_gerados += 1
                    tiles_neste_zoom += 1

        print(f"    Zoom {zoom:2d}: {tiles_neste_zoom:>5} tiles gerados (de {n_tiles_zoom} possíveis)")

    print(f"  Total {descricao}: {tiles_gerados} tiles gerados")
    return tiles_gerados


def gerar_metadata_json():
    """Gera arquivo de metadados para o frontend com info das duas camadas."""
    # Pegar bounds do raster de risco
    caminho_risco = os.path.join(RASTERS_DIR, "risco_aceu_4326.tif")
    if os.path.exists(caminho_risco):
        with rasterio.open(caminho_risco) as src:
            bounds = src.bounds
    else:
        # Bounds aproximados do MT
        from collections import namedtuple
        Bounds = namedtuple("Bounds", ["left", "bottom", "right", "top"])
        bounds = Bounds(-61.63, -18.05, -50.22, -7.35)

    metadata = {
        "nome": "Análise ACEU - Mato Grosso",
        "descricao": "Risco de desmatamento e desmatamento evitado baseado no modelo ACEU",
        "bounds": {
            "south": bounds.bottom,
            "west": bounds.left,
            "north": bounds.top,
            "east": bounds.right,
        },
        "center": {
            "lat": (bounds.bottom + bounds.top) / 2,
            "lon": (bounds.left + bounds.right) / 2,
        },
        "zoom_min": ZOOM_MIN,
        "zoom_max": ZOOM_MAX,
        "tile_size": TILE_SIZE,
        "camadas": {
            "risco": {
                "nome": "Risco de Desmatamento",
                "url_template": "tiles/risco/{z}/{x}/{y}.png",
                "classes": {
                    "1": {"nome": "Risco muito baixo", "cor": "#228B22", "probabilidade": "10%"},
                    "2": {"nome": "Risco baixo", "cor": "#90EE90", "probabilidade": "30%"},
                    "3": {"nome": "Risco médio", "cor": "#FFFF00", "probabilidade": "50%"},
                    "4": {"nome": "Risco alto", "cor": "#FFA500", "probabilidade": "70%"},
                    "5": {"nome": "Risco muito alto", "cor": "#DC1414", "probabilidade": "90%"},
                },
            },
            "evitado": {
                "nome": "Desmatamento Evitado",
                "url_template": "tiles/evitado/{z}/{x}/{y}.png",
                "classes": {
                    "1": {"nome": "Floresta mantida (esperado)", "cor": "#C8C8C8"},
                    "2": {"nome": "Parcialmente evitado", "cor": "#ADD8E6"},
                    "3": {"nome": "Desmatamento evitado", "cor": "#008000"},
                    "4": {"nome": "Fortemente evitado", "cor": "#005000"},
                    "5": {"nome": "Perda confirmada", "cor": "#DC1414"},
                    "6": {"nome": "Perda inesperada", "cor": "#800080"},
                },
            },
        },
        "metodologia": "Hectares Indicator - Modelo ACEU (ECOMETRICA, 2019; VENDRUSCULO et al., 2019)",
        "resolucao_original": "30 metros",
        "crs_original": "EPSG:31981",
        "fonte_dados": {
            "acessibilidade": "SNV/DNIT - rodovias",
            "cultivabilidade": "MapBiomas - uso do solo",
            "extraibilidade": "MapBiomas + SIGMINE/ANM",
            "protecao": "FUNAI + MMA/CNUC + INCRA",
            "desmatamento_observado": "MapBiomas / PRODES-INPE",
        },
    }

    caminho = os.path.join(TILES_DIR, "metadata.json")
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"  Metadados salvos: {caminho}")

    return metadata


def main():
    print("=" * 70)
    print("PIPELINE ACEU - ETAPA 09: GERAÇÃO DE TILES PARA WEB")
    print("Camadas: Risco de Desmatamento + Desmatamento Evitado")
    print("=" * 70)

    # --- Camada 1: Risco ACEU ---
    print("\n[1] Reprojetando raster de RISCO para WGS84...")
    caminho_risco_4326 = reprojetar_raster("risco_aceu.tif", "risco_aceu_4326.tif")

    tiles_risco = 0
    if caminho_risco_4326:
        print("\n[2] Gerando tiles de RISCO...")
        tiles_risco = gerar_tiles_camada(
            caminho_risco_4326, "risco", COLORMAP_RISCO, "Risco ACEU"
        )

    # --- Camada 2: Desmatamento Evitado ---
    print("\n[3] Reprojetando raster de DESMATAMENTO EVITADO para WGS84...")
    caminho_evitado_4326 = reprojetar_raster("desmatamento_evitado.tif", "desmatamento_evitado_4326.tif")

    tiles_evitado = 0
    if caminho_evitado_4326:
        print("\n[4] Gerando tiles de DESMATAMENTO EVITADO...")
        tiles_evitado = gerar_tiles_camada(
            caminho_evitado_4326, "evitado", COLORMAP_EVITADO, "Desmatamento Evitado"
        )
    else:
        print("\n[4] Raster de desmatamento evitado não disponível.")
        print("  Execute 07b_desmatamento_evitado_raster.py primeiro.")

    # --- Metadados ---
    print("\n[5] Gerando metadados...")
    metadata = gerar_metadata_json()

    # Calcular tamanho total
    tamanho_total = 0
    for root, dirs, files in os.walk(TILES_DIR):
        for f in files:
            tamanho_total += os.path.getsize(os.path.join(root, f))
    tamanho_mb = tamanho_total / 1024 / 1024

    print(f"\n{'=' * 70}")
    print(f"[OK] Etapa 09 concluída.")
    print(f"  Tiles de risco: {tiles_risco}")
    print(f"  Tiles de desmatamento evitado: {tiles_evitado}")
    print(f"  Total: {tiles_risco + tiles_evitado} tiles ({tamanho_mb:.1f} MB)")
    print(f"  Diretório: {TILES_DIR}")
    print(f"\n  Estrutura:")
    print(f"    tiles/risco/{{z}}/{{x}}/{{y}}.png")
    print(f"    tiles/evitado/{{z}}/{{x}}/{{y}}.png")
    print(f"    tiles/metadata.json")
    print(f"\n  Próximo passo: python 10_copiar_tiles.py")


if __name__ == "__main__":
    main()
