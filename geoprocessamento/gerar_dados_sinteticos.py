"""
Gerador de Dados Sintéticos para Teste do Pipeline ACEU

Cria rasters e shapefiles simulados em escala reduzida (1000x1000 pixels)
para validar que todo o pipeline funciona de ponta a ponta, incluindo:
- Grade de referência
- Componentes A, C, E, U
- Composição ACEU
- Raster de desmatamento evitado
- Geração de tiles
- Cópia para o frontend

Uso:
    python gerar_dados_sinteticos.py

Após rodar, execute:
    python run_all.py --from 3

Os scripts 03-10 vão detectar os rasters já existentes e pular a geração,
ou usar os dados sintéticos como entrada.

Este script NÃO substitui dados reais. Serve apenas para:
1. Validar que o pipeline roda sem erros no Mac
2. Testar a visualização no navegador
3. Verificar que os tiles são gerados corretamente
"""
import os
import json
import numpy as np
import rasterio
from rasterio.transform import from_bounds
from rasterio.crs import CRS
from config import (
    BASE_DIR, DADOS_BRUTOS_DIR, RASTERS_DIR, TILES_DIR, OUTPUT_DIR,
    CRS_PROJETO, RESOLUCAO, PROB_PERDA_20
)

# Parâmetros do raster sintético
# Área reduzida: ~30km x 30km (1000 pixels de 30m)
LARGURA = 1000
ALTURA = 1000

# Bounds aproximados do centro do MT em EPSG:31981 (UTM 21S)
# Centro do MT: lat -12.7, lon -55.9
# Em UTM 21S: x ~ 400000, y ~ 8600000
X_MIN = 380000
Y_MIN = 8580000
X_MAX = X_MIN + LARGURA * RESOLUCAO  # 410000
Y_MAX = Y_MIN + ALTURA * RESOLUCAO   # 8610000

# Bounds em WGS84 (aproximado, para metadata)
LON_MIN = -56.2
LON_MAX = -55.6
LAT_MIN = -13.0
LAT_MAX = -12.4


def criar_grade_sintetica():
    """Cria raster-base e máscara do MT sintéticos."""
    print("  Criando grade de referência sintética...")

    transform = from_bounds(X_MIN, Y_MIN, X_MAX, Y_MAX, LARGURA, ALTURA)

    meta = {
        "driver": "GTiff",
        "dtype": "uint8",
        "width": LARGURA,
        "height": ALTURA,
        "count": 1,
        "crs": CRS.from_epsg(31981),
        "transform": transform,
        "compress": "lzw",
        "nodata": 0,
    }

    # Grade (todos = 1)
    grade = np.ones((ALTURA, LARGURA), dtype=np.uint8)
    caminho_grade = os.path.join(RASTERS_DIR, "grade_mt.tif")
    with rasterio.open(caminho_grade, "w", **meta) as dst:
        dst.write(grade, 1)
    print(f"    grade_mt.tif ({LARGURA}x{ALTURA})")

    # Máscara (simular formato do MT com um polígono irregular)
    mascara = np.ones((ALTURA, LARGURA), dtype=np.uint8)
    # Recortar cantos para simular formato irregular
    for i in range(ALTURA):
        for j in range(LARGURA):
            # Criar formato irregular (elipse)
            cx, cy = LARGURA / 2, ALTURA / 2
            dx = (j - cx) / (LARGURA * 0.45)
            dy = (i - cy) / (ALTURA * 0.45)
            if dx**2 + dy**2 > 1:
                mascara[i, j] = 0

    caminho_mascara = os.path.join(RASTERS_DIR, "mascara_mt.tif")
    with rasterio.open(caminho_mascara, "w", **meta) as dst:
        dst.write(mascara, 1)
    print(f"    mascara_mt.tif (pixels válidos: {np.sum(mascara):,})")

    return meta, transform, mascara


def criar_componente_a(meta, mascara):
    """Cria componente A sintético (acessibilidade)."""
    print("  Criando componente A (acessibilidade)...")

    # Simular: rodovias no centro (horizontal e vertical)
    # Distância aumenta conforme se afasta das rodovias
    comp_a = np.zeros((ALTURA, LARGURA), dtype=np.uint8)

    # Criar "rodovias" (linhas de pixels)
    rodovia_h = ALTURA // 2  # rodovia horizontal
    rodovia_v = LARGURA // 3  # rodovia vertical

    for i in range(ALTURA):
        for j in range(LARGURA):
            if mascara[i, j] == 0:
                continue
            # Distância à rodovia mais próxima (em pixels)
            dist_h = abs(i - rodovia_h)
            dist_v = abs(j - rodovia_v)
            dist = min(dist_h, dist_v) * RESOLUCAO  # converter para metros

            # Classificar conforme limiares
            if dist < 4500:
                comp_a[i, j] = 5
            elif dist < 9000:
                comp_a[i, j] = 4
            elif dist < 13500:
                comp_a[i, j] = 3
            elif dist < 18000:
                comp_a[i, j] = 2
            else:
                comp_a[i, j] = 1

    caminho = os.path.join(RASTERS_DIR, "componente_a.tif")
    with rasterio.open(caminho, "w", **meta) as dst:
        dst.write(comp_a, 1)
    print(f"    componente_a.tif (classes: {np.unique(comp_a[comp_a > 0])})")
    return comp_a


def criar_componente_u(meta, mascara):
    """Cria componente U sintético (proteção)."""
    print("  Criando componente U (proteção)...")

    comp_u = np.zeros((ALTURA, LARGURA), dtype=np.uint8)

    # Simular áreas protegidas: um bloco no quadrante superior esquerdo (UC)
    # e outro no quadrante inferior direito (TI)
    # UC
    comp_u[100:350, 100:300] = 1
    # TI
    comp_u[600:850, 650:900] = 1
    # Quilombo (pequeno)
    comp_u[400:450, 700:750] = 1

    # Aplicar máscara
    comp_u[mascara == 0] = 0

    caminho = os.path.join(RASTERS_DIR, "componente_u.tif")
    with rasterio.open(caminho, "w", **meta) as dst:
        dst.write(comp_u, 1)
    area_protegida = np.sum(comp_u == 1) * (RESOLUCAO**2) / 1e6
    print(f"    componente_u.tif (área protegida: {area_protegida:.0f} km²)")
    return comp_u


def criar_componente_c(meta, mascara):
    """Cria componente C sintético (cultivabilidade)."""
    print("  Criando componente C (cultivabilidade)...")

    comp_c = np.zeros((ALTURA, LARGURA), dtype=np.uint8)

    # Simular: pressão agropecuária maior no sul e leste (arco do desmatamento)
    np.random.seed(42)
    for i in range(ALTURA):
        for j in range(LARGURA):
            if mascara[i, j] == 0:
                continue
            # Gradiente: sul e leste = mais pressão
            fator_lat = i / ALTURA  # 0 (norte) a 1 (sul)
            fator_lon = j / LARGURA  # 0 (oeste) a 1 (leste)
            pressao = (fator_lat * 0.6 + fator_lon * 0.4) + np.random.normal(0, 0.1)
            pressao = max(0, min(1, pressao))

            if pressao > 0.7:
                comp_c[i, j] = 5
            elif pressao > 0.5:
                comp_c[i, j] = 4
            elif pressao > 0.3:
                comp_c[i, j] = 3
            elif pressao > 0.1:
                comp_c[i, j] = 2
            else:
                comp_c[i, j] = 1

    caminho = os.path.join(RASTERS_DIR, "componente_c.tif")
    with rasterio.open(caminho, "w", **meta) as dst:
        dst.write(comp_c, 1)
    print(f"    componente_c.tif (classes: {np.unique(comp_c[comp_c > 0])})")
    return comp_c


def criar_componente_e(meta, mascara):
    """Cria componente E sintético (extraibilidade)."""
    print("  Criando componente E (extraibilidade)...")

    comp_e = np.zeros((ALTURA, LARGURA), dtype=np.uint8)

    np.random.seed(123)
    for i in range(ALTURA):
        for j in range(LARGURA):
            if mascara[i, j] == 0:
                continue
            # Simular: floresta densa no norte, mineração pontual
            fator_floresta = 1 - (i / ALTURA)  # mais floresta ao norte
            fator_mineracao = 0
            # Zonas de mineração (clusters)
            if 200 < i < 300 and 500 < j < 600:
                fator_mineracao = 0.8
            if 700 < i < 800 and 300 < j < 400:
                fator_mineracao = 0.6

            valor = fator_floresta * 0.5 + fator_mineracao * 0.5 + np.random.normal(0, 0.05)
            valor = max(0, min(1, valor))

            if valor > 0.7:
                comp_e[i, j] = 5
            elif valor > 0.5:
                comp_e[i, j] = 4
            elif valor > 0.3:
                comp_e[i, j] = 3
            elif valor > 0.15:
                comp_e[i, j] = 2
            else:
                comp_e[i, j] = 1

    caminho = os.path.join(RASTERS_DIR, "componente_e.tif")
    with rasterio.open(caminho, "w", **meta) as dst:
        dst.write(comp_e, 1)
    print(f"    componente_e.tif (classes: {np.unique(comp_e[comp_e > 0])})")
    return comp_e


def criar_composicao_aceu(meta, mascara, comp_a, comp_u, comp_c, comp_e):
    """Cria risco ACEU e classifica em quintis."""
    print("  Criando composição ACEU...")

    # R(x) = A(x) + C(x) + E(x) - U(x)*5
    # U é binário, multiplicamos por 5 para ter impacto significativo
    risco_bruto = (comp_a.astype(np.float32) +
                   comp_c.astype(np.float32) +
                   comp_e.astype(np.float32) -
                   comp_u.astype(np.float32) * 5)

    # Classificar em quintis (apenas pixels de floresta/válidos)
    validos = (mascara == 1) & (risco_bruto != 0)
    valores_validos = risco_bruto[validos]

    if len(valores_validos) == 0:
        print("    [ERRO] Nenhum pixel válido para classificação")
        return None

    quintis = np.percentile(valores_validos, [20, 40, 60, 80])
    risco_classes = np.zeros((ALTURA, LARGURA), dtype=np.uint8)

    for i in range(ALTURA):
        for j in range(LARGURA):
            if not validos[i, j]:
                continue
            v = risco_bruto[i, j]
            if v <= quintis[0]:
                risco_classes[i, j] = 1
            elif v <= quintis[1]:
                risco_classes[i, j] = 2
            elif v <= quintis[2]:
                risco_classes[i, j] = 3
            elif v <= quintis[3]:
                risco_classes[i, j] = 4
            else:
                risco_classes[i, j] = 5

    caminho = os.path.join(RASTERS_DIR, "risco_aceu.tif")
    with rasterio.open(caminho, "w", **meta) as dst:
        dst.write(risco_classes, 1)

    # Estatísticas
    for classe in range(1, 6):
        n = np.sum(risco_classes == classe)
        pct = n / np.sum(validos) * 100
        print(f"    Classe {classe}: {n:>7,} pixels ({pct:.1f}%)")

    print(f"    risco_aceu.tif")

    # Salvar máscara de floresta (para etapa 07b)
    mascara_floresta = (risco_classes > 0).astype(np.uint8)
    caminho_floresta = os.path.join(RASTERS_DIR, "mascara_floresta.tif")
    with rasterio.open(caminho_floresta, "w", **meta) as dst:
        dst.write(mascara_floresta, 1)

    return risco_classes


def criar_desmatamento_evitado(meta, mascara, risco_classes):
    """Cria raster de desmatamento evitado sintético."""
    print("  Criando raster de desmatamento evitado...")

    np.random.seed(77)

    # Simular desmatamento proporcional ao risco
    floresta_ref = (risco_classes > 0)
    prob_perda = np.zeros((ALTURA, LARGURA), dtype=np.float32)
    prob_perda[risco_classes == 1] = 0.02
    prob_perda[risco_classes == 2] = 0.06
    prob_perda[risco_classes == 3] = 0.12
    prob_perda[risco_classes == 4] = 0.20
    prob_perda[risco_classes == 5] = 0.30

    aleatorio = np.random.random((ALTURA, LARGURA))
    foi_desmatado = floresta_ref & (aleatorio < prob_perda)
    floresta_atual = floresta_ref & (~foi_desmatado)

    # Classificar
    resultado = np.zeros((ALTURA, LARGURA), dtype=np.uint8)

    # Floresta mantida
    resultado[floresta_atual & (risco_classes <= 2)] = 1  # esperado
    resultado[floresta_atual & (risco_classes == 3)] = 2  # parcialmente evitado
    resultado[floresta_atual & (risco_classes == 4)] = 3  # desmatamento evitado
    resultado[floresta_atual & (risco_classes == 5)] = 4  # fortemente evitado

    # Desmatado
    resultado[foi_desmatado & (risco_classes >= 4)] = 5  # perda confirmada
    resultado[foi_desmatado & (risco_classes <= 3)] = 6  # perda inesperada

    caminho = os.path.join(RASTERS_DIR, "desmatamento_evitado.tif")
    with rasterio.open(caminho, "w", **meta) as dst:
        dst.write(resultado, 1)

    # Estatísticas
    labels = {
        1: "Floresta mantida, risco baixo",
        2: "Parcialmente evitado",
        3: "Desmatamento evitado",
        4: "Fortemente evitado",
        5: "Perda confirmada",
        6: "Perda inesperada",
    }
    total = np.sum(floresta_ref)
    for classe, label in labels.items():
        n = np.sum(resultado == classe)
        pct = n / total * 100 if total > 0 else 0
        area_ha = n * (RESOLUCAO**2) / 10000
        print(f"    {classe}: {n:>7,} px ({pct:5.1f}%) = {area_ha:>8,.0f} ha — {label}")

    evitado = np.sum((resultado == 3) | (resultado == 4))
    area_evitada_ha = evitado * (RESOLUCAO**2) / 10000
    print(f"\n    DESMATAMENTO EVITADO TOTAL: {area_evitada_ha:,.0f} hectares")

    return resultado


def criar_geojson_municipios():
    """Cria GeoJSON sintético com 5 municípios fictícios para teste."""
    print("  Criando GeoJSON de municípios sintéticos...")

    # 5 municípios fictícios cobrindo a área do raster
    municipios = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"CD_MUN": "5100101", "NM_MUN": "Município Norte", "SIGLA_UF": "MT"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[LON_MIN, LAT_MIN + 0.36], [LON_MAX, LAT_MIN + 0.36],
                                     [LON_MAX, LAT_MAX], [LON_MIN, LAT_MAX], [LON_MIN, LAT_MIN + 0.36]]]
                }
            },
            {
                "type": "Feature",
                "properties": {"CD_MUN": "5100201", "NM_MUN": "Município Central", "SIGLA_UF": "MT"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[LON_MIN, LAT_MIN + 0.12], [LON_MIN + 0.3, LAT_MIN + 0.12],
                                     [LON_MIN + 0.3, LAT_MIN + 0.36], [LON_MIN, LAT_MIN + 0.36],
                                     [LON_MIN, LAT_MIN + 0.12]]]
                }
            },
            {
                "type": "Feature",
                "properties": {"CD_MUN": "5100301", "NM_MUN": "Município Leste", "SIGLA_UF": "MT"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[LON_MIN + 0.3, LAT_MIN + 0.12], [LON_MAX, LAT_MIN + 0.12],
                                     [LON_MAX, LAT_MIN + 0.36], [LON_MIN + 0.3, LAT_MIN + 0.36],
                                     [LON_MIN + 0.3, LAT_MIN + 0.12]]]
                }
            },
            {
                "type": "Feature",
                "properties": {"CD
_MUN": "5100401", "NM_MUN": "Município Sul", "SIGLA_UF": "MT"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[LON_MIN, LAT_MIN], [LON_MIN + 0.3, LAT_MIN],
                                     [LON_MIN + 0.3, LAT_MIN + 0.12], [LON_MIN, LAT_MIN + 0.12],
                                     [LON_MIN, LAT_MIN]]]
                }
            },
            {
                "type": "Feature",
                "properties": {"CD_MUN": "5100501", "NM_MUN": "Município Sudeste", "SIGLA_UF": "MT"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[LON_MIN + 0.3, LAT_MIN], [LON_MAX, LAT_MIN],
                                     [LON_MAX, LAT_MIN + 0.12], [LON_MIN + 0.3, LAT_MIN + 0.12],
                                     [LON_MIN + 0.3, LAT_MIN]]]
                }
            },
        ]
    }

    caminho = os.path.join(TILES_DIR, "municipios_mt.geojson")
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(municipios, f, ensure_ascii=False)
    print(f"    municipios_mt.geojson (5 municípios)")

    return municipios


def criar_estatisticas_csv(resultado, municipios_geo):
    """Cria CSV de estatísticas por município (sintético)."""
    print("  Criando CSV de estatísticas sintéticas...")

    import csv

    linhas = []
    nomes = ["Município Norte", "Município Central", "Município Leste",
             "Município Sul", "Município Sudeste"]
    codigos = ["5100101", "5100201", "5100301", "5100401", "5100501"]

    np.random.seed(99)
    for i, (cod, nome) in enumerate(zip(codigos, nomes)):
        area_total = np.random.randint(5000, 20000)  # hectares
        floresta_ref = int(area_total * np.random.uniform(0.4, 0.8))
        desmatado = int(floresta_ref * np.random.uniform(0.05, 0.25))
        floresta_atual = floresta_ref - desmatado

        # Distribuição por classe de risco
        risco_dist = np.random.dirichlet([1, 2, 3, 2, 1]) * floresta_ref
        perda_esperada = sum(risco_dist[k] * PROB_PERDA_20[k+1] for k in range(5))
        desm_evitado = max(0, perda_esperada - desmatado)

        linhas.append({
            "cod_municipio": cod,
            "nome_municipio": nome,
            "area_total_ha": area_total,
            "floresta_referencia_ha": floresta_ref,
            "floresta_atual_ha": floresta_atual,
            "desmatado_ha": desmatado,
            "perda_esperada_ha": int(perda_esperada),
            "desmatamento_evitado_ha": int(desm_evitado),
            "taxa_protecao_pct": round(desm_evitado / perda_esperada * 100, 1) if perda_esperada > 0 else 0,
            "classe_risco_1_ha": int(risco_dist[0]),
            "classe_risco_2_ha": int(risco_dist[1]),
            "classe_risco_3_ha": int(risco_dist[2]),
            "classe_risco_4_ha": int(risco_dist[3]),
            "classe_risco_5_ha": int(risco_dist[4]),
        })

    caminho = os.path.join(OUTPUT_DIR, "desmatamento_evitado_mt.csv")
    with open(caminho, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=linhas[0].keys())
        writer.writeheader()
        writer.writerows(linhas)
    print(f"    desmatamento_evitado_mt.csv ({len(linhas)} municípios)")

    # Também salvar como JSON para o frontend
    caminho_json = os.path.join(OUTPUT_DIR, "estatisticas_municipios.json")
    with open(caminho_json, "w", encoding="utf-8") as f:
        json.dump(linhas, f, indent=2, ensure_ascii=False)
    print(f"    estatisticas_municipios.json")

    return linhas


def main():
    print("=" * 70)
    print("  GERADOR DE DADOS SINTÉTICOS - PIPELINE ACEU")
    print("  Para teste e validação do fluxo completo")
    print("=" * 70)
    print(f"\n  Resolução: {RESOLUCAO}m | Grade: {LARGURA}x{ALTURA} pixels")
    print(f"  Área simulada: {LARGURA * RESOLUCAO / 1000:.0f} x {ALTURA * RESOLUCAO / 1000:.0f} km")

    print("\n[1] Criando grade de referência...")
    meta, transform, mascara = criar_grade_sintetica()

    print("\n[2] Criando componentes ACEU...")
    comp_a = criar_componente_a(meta, mascara)
    comp_u = criar_componente_u(meta, mascara)
    comp_c = criar_componente_c(meta, mascara)
    comp_e = criar_componente_e(meta, mascara)

    print("\n[3] Criando composição ACEU...")
    risco = criar_composicao_aceu(meta, mascara, comp_a, comp_u, comp_c, comp_e)

    print("\n[4] Criando raster de desmatamento evitado...")
    resultado = criar_desmatamento_evitado(meta, mascara, risco)

    print("\n[5] Criando GeoJSON de municípios...")
    municipios = criar_geojson_municipios()

    print("\n[6] Criando CSV de estatísticas...")
    stats = criar_estatisticas_csv(resultado, municipios)

    # Listar arquivos gerados
    print(f"\n{'=' * 70}")
    print("  ARQUIVOS GERADOS:")
    print(f"{'=' * 70}")
    for pasta in [RASTERS_DIR, TILES_DIR, OUTPUT_DIR]:
        for f in sorted(os.listdir(pasta)):
            caminho = os.path.join(pasta, f)
            if os.path.isfile(caminho):
                tamanho = os.path.getsize(caminho) / 1024
                rel = os.path.relpath(caminho, BASE_DIR)
                print(f"  {rel:50s} {tamanho:>8.1f} KB")

    print(f"\n{'=' * 70}")
    print("  PRÓXIMOS PASSOS:")
    print(f"{'=' * 70}")
    print("  1. Gerar tiles: python 09_gerar_tiles.py")
    print("  2. Copiar para frontend: python 10_copiar_tiles.py")
    print("  3. Rodar frontend: cd .. && pnpm dev")
    print("  4. Abrir: http://localhost:3000/mapa-risco")
    print(f"\n  Ou execute tudo de uma vez:")
    print("  python run_all.py --from 9")


if __name__ == "__main__":
    main()
