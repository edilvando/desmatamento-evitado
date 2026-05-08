"""
Etapa 09 - Geração de Tiles para Visualização Web

Processo:
1. Carrega o raster de risco ACEU (classes 1-5)
2. Reprojeta para EPSG:4326 (WGS84) - necessário para tiles web
3. Aplica colormap (verde a vermelho por classe de risco)
4. Gera tiles PNG no padrão XYZ/Slippy Map (z/x/y.png)
5. Gera também um GeoTIFF colorido para visualização rápida

Os tiles são servidos localmente pelo Vite como arquivos estáticos.
O frontend usa Leaflet para exibir os tiles sobre um mapa base.

Níveis de zoom gerados: 5 a 12
- Zoom 5-7: visão geral do estado
- Zoom 8-10: visão regional (grupos de municípios)
- Zoom 11-12: visão local (detalhamento municipal)

Saída:
- tiles/{z}/{x}/{y}.png (tiles no padrão XYZ)
- rasters/risco_aceu_4326.tif (raster reprojetado para WGS84)
- rasters/risco_aceu_colorido.tif (raster RGBA para preview)

Referência:
OpenStreetMap Slippy Map Tilenames: https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
"""
import os
import math
import numpy as np
import rasterio
from rasterio.warp import reproject, calculate_default_transform, Resampling
from PIL import Image
from tqdm import tqdm
from config import (
    RASTERS_DIR, TILES_DIR, CRS_PROJETO, CORES_RISCO
)

# Níveis de zoom a gerar
ZOOM_MIN = 5
ZOOM_MAX = 12

# Tamanho de cada tile em pixels
TILE_SIZE = 256

# Cores RGBA para cada classe (com transparência para nodata)
COLORMAP = {
    0: (0, 0, 0, 0),           # transparente (sem dados / fora da floresta)
    1: (34, 139, 34, 180),     # verde escuro - risco muito baixo
    2: (144, 238, 144, 180),   # verde claro - risco baixo
    3: (255, 255, 0, 180),     # amarelo - risco médio
    4: (255, 165, 0, 180),     # laranja - risco alto
    5: (220, 20, 20, 180),     # vermelho - risco muito alto
}


def reprojetar_para_4326():
    """Reprojeta o raster de risco para WGS84 (EPSG:4326)."""
    caminho_entrada = os.path.join(RASTERS_DIR, "risco_aceu.tif")
    caminho_saida = os.path.join(RASTERS_DIR, "risco_aceu_4326.tif")

    if os.path.exists(caminho_saida):
        print(f"  Já existe: {caminho_saida}")
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

    print(f"  Reprojetado: {caminho_saida} ({width}x{height} pixels)")
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


def gerar_tile(raster_data, raster_transform, raster_bounds, x, y, zoom):
    """
    Gera um tile PNG 256x256 para a posição (x, y, zoom).
    Retorna uma imagem PIL RGBA ou None se o tile estiver vazio.
    """
    # Bounds do tile
    t_lon_min, t_lat_min, t_lon_max, t_lat_max = tile_bounds(x, y, zoom)

    # Verificar se o tile intersecta o raster
    r_lon_min, r_lat_min, r_lon_max, r_lat_max = raster_bounds
    if (t_lon_max <= r_lon_min or t_lon_min >= r_lon_max or
        t_lat_max <= r_lat_min or t_lat_min >= r_lat_max):
        return None

    # Calcular a janela do raster que corresponde ao tile
    height, width = raster_data.shape

    # Converter bounds do tile para pixels no raster
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
    for valor, cor in COLORMAP.items():
        mascara = data_resized == valor
        rgba[mascara] = cor

    return Image.fromarray(rgba, mode="RGBA")


def gerar_tiles(caminho_raster_4326):
    """Gera todos os tiles para os níveis de zoom configurados."""
    print(f"  Gerando tiles para zoom {ZOOM_MIN} a {ZOOM_MAX}...")

    with rasterio.open(caminho_raster_4326) as src:
        raster_data = src.read(1)
        raster_bounds = src.bounds  # (left, bottom, right, top) = (lon_min, lat_min, lon_max, lat_max)

    bounds = (raster_bounds.left, raster_bounds.bottom, raster_bounds.right, raster_bounds.top)
    print(f"  Bounds do raster: lon=[{bounds[0]:.2f}, {bounds[2]:.2f}], lat=[{bounds[1]:.2f}, {bounds[3]:.2f}]")

    total_tiles = 0
    tiles_gerados = 0

    for zoom in range(ZOOM_MIN, ZOOM_MAX + 1):
        # Determinar range de tiles que cobrem o raster
        x_min, y_max_tile = lat_lon_to_tile(bounds[1], bounds[0], zoom)  # bottom-left
        x_max, y_min_tile = lat_lon_to_tile(bounds[3], bounds[2], zoom)  # top-right

        # Garantir limites válidos
        n = 2 ** zoom
        x_min = max(0, x_min - 1)
        x_max = min(n - 1, x_max + 1)
        y_min_tile = max(0, y_min_tile - 1)
        y_max_tile = min(n - 1, y_max_tile + 1)

        n_tiles_zoom = (x_max - x_min + 1) * (y_max_tile - y_min_tile + 1)
        total_tiles += n_tiles_zoom

        zoom_dir = os.path.join(TILES_DIR, str(zoom))
        tiles_neste_zoom = 0

        for x in range(x_min, x_max + 1):
            for y in range(y_min_tile, y_max_tile + 1):
                tile_img = gerar_tile(raster_data, None, bounds, x, y, zoom)

                if tile_img is not None:
                    # Salvar tile
                    tile_dir = os.path.join(zoom_dir, str(x))
                    os.makedirs(tile_dir, exist_ok=True)
                    tile_path = os.path.join(tile_dir, f"{y}.png")
                    tile_img.save(tile_path, "PNG", optimize=True)
                    tiles_gerados += 1
                    tiles_neste_zoom += 1

        print(f"    Zoom {zoom:2d}: {tiles_neste_zoom:>5} tiles gerados (de {n_tiles_zoom} possíveis)")

    print(f"\n  Total: {tiles_gerados} tiles gerados de {total_tiles} verificados")
    return tiles_gerados


def gerar_metadata_json():
    """Gera arquivo de metadados para o frontend saber os bounds e zooms disponíveis."""
    import json

    caminho_raster = os.path.join(RASTERS_DIR, "risco_aceu_4326.tif")
    with rasterio.open(caminho_raster) as src:
        bounds = src.bounds

    metadata = {
        "nome": "Risco de Desmatamento ACEU - Mato Grosso",
        "descricao": "Classificação de risco de desmatamento baseada no modelo ACEU (Acessibilidade, Cultivabilidade, Extraibilidade, Proteção)",
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
        "url_template": "tiles/{z}/{x}/{y}.png",
        "classes": {
            "1": {"nome": "Risco muito baixo", "cor": "#228B22", "probabilidade": "10%"},
            "2": {"nome": "Risco baixo", "cor": "#90EE90", "probabilidade": "30%"},
            "3": {"nome": "Risco médio", "cor": "#FFFF00", "probabilidade": "50%"},
            "4": {"nome": "Risco alto", "cor": "#FFA500", "probabilidade": "70%"},
            "5": {"nome": "Risco muito alto", "cor": "#DC1414", "probabilidade": "90%"},
        },
        "metodologia": "Hectares Indicator - Modelo ACEU (ECOMETRICA, 2019; VENDRUSCULO et al., 2019)",
        "resolucao_original": "30 metros",
        "crs_original": "EPSG:31981",
        "fonte_dados": {
            "acessibilidade": "SNV/DNIT - rodovias",
            "cultivabilidade": "MapBiomas - uso do solo",
            "extraibilidade": "MapBiomas + SIGMINE/ANM",
            "protecao": "FUNAI + MMA/CNUC + INCRA",
        }
    }

    caminho = os.path.join(TILES_DIR, "metadata.json")
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"  Metadados salvos: {caminho}")

    return metadata


def main():
    print("=" * 70)
    print("PIPELINE ACEU - ETAPA 09: GERAÇÃO DE TILES PARA WEB")
    print("=" * 70)

    print("\n[1] Reprojetando raster para WGS84 (EPSG:4326)...")
    caminho_4326 = reprojetar_para_4326()

    print("\n[2] Gerando tiles PNG...")
    n_tiles = gerar_tiles(caminho_4326)

    print("\n[3] Gerando metadados...")
    metadata = gerar_metadata_json()

    # Calcular tamanho total dos tiles
    tamanho_total = 0
    for root, dirs, files in os.walk(TILES_DIR):
        for f in files:
            tamanho_total += os.path.getsize(os.path.join(root, f))
    tamanho_mb = tamanho_total / 1024 / 1024

    print(f"\n[OK] Etapa 09 concluída.")
    print(f"  {n_tiles} tiles gerados")
    print(f"  Tamanho total: {tamanho_mb:.1f} MB")
    print(f"  Diretório: {TILES_DIR}")
    print(f"\n  Para visualizar no frontend:")
    print(f"  1. Copie a pasta tiles/ para client/public/tiles/")
    print(f"  2. O Leaflet acessa via: /tiles/{{z}}/{{x}}/{{y}}.png")
    print(f"\n  Ou sirva localmente com: python -m http.server 8080 --directory {TILES_DIR}")


if __name__ == "__main__":
    main()
