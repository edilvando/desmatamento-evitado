"""
Etapa 07 - Composição do Risco ACEU e Classificação em Quintis

Processo:
1. Carrega os 4 componentes (A, C, E, U) gerados nas etapas anteriores
2. Calcula o risco bruto pixel a pixel: R_bruto(x) = A(x) + C(x) + E(x) - U(x)
3. Aplica máscara de floresta de referência (só pixels florestais entram na classificação)
4. Classifica o risco bruto em 5 classes (quintis) sobre os pixels de floresta
5. Gera o raster final de risco ACEU

A classificação por quintis garante que cada classe contenha ~20% dos pixels
florestais, distribuindo o risco de forma equilibrada.

Saída:
- rasters/risco_bruto.tif (int16, valores contínuos)
- rasters/risco_aceu.tif (uint8, valores 1 a 5 = classes de risco)

Referência:
ECOMETRICA. The Hectares Indicator Methods and Guidance. Version 2.0. Edinburgh, 2019.
VENDRUSCULO et al. Aplicação da metodologia do Hectare Indicator. Embrapa, 2019.
"""
import os
import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling
from config import (
    DADOS_BRUTOS_DIR, RASTERS_DIR, CRS_PROJETO,
    obter_mapbiomas, ANO_T0
)

# Classes MapBiomas que representam floresta (referência para o modelo)
CLASSES_FLORESTA_REF = {3, 4, 5, 6, 49}  # Formações florestais


def carregar_grade_referencia():
    """Carrega metadados e máscara."""
    caminho_grade = os.path.join(RASTERS_DIR, "grade_mt.tif")
    caminho_mascara = os.path.join(RASTERS_DIR, "mascara_mt.tif")

    with rasterio.open(caminho_grade) as src:
        meta = src.meta.copy()
        transform = src.transform
        shape = (src.height, src.width)

    with rasterio.open(caminho_mascara) as src:
        mascara = src.read(1)

    return meta, transform, shape, mascara


def carregar_componente(nome_arquivo):
    """Carrega um raster de componente."""
    caminho = os.path.join(RASTERS_DIR, nome_arquivo)
    if not os.path.exists(caminho):
        raise FileNotFoundError(
            f"Componente não encontrado: {caminho}\n"
            "Execute as etapas anteriores primeiro."
        )
    with rasterio.open(caminho) as src:
        dados = src.read(1)
    return dados


def gerar_mascara_floresta(transform, shape):
    """
    Gera máscara de floresta de referência usando MapBiomas.
    Apenas pixels com floresta participam da classificação de risco.
    Se MapBiomas não estiver disponível, usa a máscara do estado como fallback.
    """
    # Tentar carregar MapBiomas usando busca inteligente do config
    caminho_mapbiomas = obter_mapbiomas(ANO_T0)

    if caminho_mapbiomas is None:
        print("  [AVISO] MapBiomas não encontrado.")
        print("  Usando máscara do estado como proxy (todo o MT = floresta potencial).")
        caminho_mascara = os.path.join(RASTERS_DIR, "mascara_mt.tif")
        with rasterio.open(caminho_mascara) as src:
            return src.read(1).astype(bool)

    print(f"  Carregando MapBiomas para máscara de floresta...")
    with rasterio.open(caminho_mapbiomas) as src:
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

    mascara_floresta = np.isin(uso_solo, list(CLASSES_FLORESTA_REF))
    pixels_floresta = np.sum(mascara_floresta)
    area_floresta_km2 = pixels_floresta * (30 ** 2) / 1e6
    print(f"  Pixels de floresta de referência: {pixels_floresta:,}")
    print(f"  Área florestal estimada: {area_floresta_km2:,.0f} km²")

    return mascara_floresta


def calcular_risco_bruto(comp_a, comp_c, comp_e, comp_u, mascara):
    """
    Calcula o risco bruto: R_bruto(x) = A(x) + C(x) + E(x) - U(x)
    
    Valores possíveis:
    - A: 1 a 5
    - C: 1 a 5
    - E: 1 a 5
    - U: 0 ou 1
    - R_bruto: mínimo teórico = 1+1+1-1 = 2, máximo = 5+5+5-0 = 15
    """
    risco = (
        comp_a.astype(np.int16) +
        comp_c.astype(np.int16) +
        comp_e.astype(np.int16) -
        comp_u.astype(np.int16)
    )

    # Aplicar máscara do estado
    risco[mascara == 0] = 0

    # Estatísticas
    validos = risco[mascara == 1]
    print(f"  Risco bruto - min: {validos.min()}, max: {validos.max()}")
    print(f"  Risco bruto - média: {validos.mean():.2f}, mediana: {np.median(validos):.1f}")

    return risco


def classificar_quintis(risco_bruto, mascara_floresta, mascara_estado):
    """
    Classifica o risco bruto em 5 classes (quintis).
    A classificação é feita APENAS sobre pixels de floresta de referência.
    
    Classe 1: 0-20% (risco muito baixo)
    Classe 2: 20-40% (risco baixo)
    Classe 3: 40-60% (risco médio)
    Classe 4: 60-80% (risco alto)
    Classe 5: 80-100% (risco muito alto)
    """
    # Selecionar apenas pixels de floresta dentro do MT
    mascara_valida = mascara_floresta & (mascara_estado == 1)
    valores_floresta = risco_bruto[mascara_valida]

    if len(valores_floresta) == 0:
        print("  [ERRO] Nenhum pixel de floresta encontrado!")
        return np.zeros_like(mascara_estado, dtype=np.uint8)

    # Calcular limiares dos quintis
    percentis = [20, 40, 60, 80]
    limiares = np.percentile(valores_floresta, percentis)
    print(f"  Limiares dos quintis: {limiares}")

    # Classificar
    risco_classes = np.zeros_like(mascara_estado, dtype=np.uint8)

    # Classe 1: abaixo do percentil 20
    risco_classes[mascara_valida & (risco_bruto <= limiares[0])] = 1
    # Classe 2: entre p20 e p40
    risco_classes[mascara_valida & (risco_bruto > limiares[0]) & (risco_bruto <= limiares[1])] = 2
    # Classe 3: entre p40 e p60
    risco_classes[mascara_valida & (risco_bruto > limiares[1]) & (risco_bruto <= limiares[2])] = 3
    # Classe 4: entre p60 e p80
    risco_classes[mascara_valida & (risco_bruto > limiares[2]) & (risco_bruto <= limiares[3])] = 4
    # Classe 5: acima do percentil 80
    risco_classes[mascara_valida & (risco_bruto > limiares[3])] = 5

    # Estatísticas
    print("  Distribuição das classes de risco (sobre floresta):")
    total_floresta = np.sum(mascara_valida)
    for classe in range(1, 6):
        n = np.sum(risco_classes == classe)
        pct = n / total_floresta * 100
        area_km2 = n * (30 ** 2) / 1e6
        print(f"    Classe {classe}: {n:>12,} pixels ({pct:5.1f}%) = {area_km2:,.0f} km²")

    return risco_classes


def main():
    print("=" * 70)
    print("PIPELINE ACEU - ETAPA 07: COMPOSIÇÃO DO RISCO ACEU")
    print("=" * 70)

    print("\n[1] Carregando grade de referência...")
    meta, transform, shape, mascara = carregar_grade_referencia()

    print("\n[2] Carregando componentes...")
    print("  Componente A (Acessibilidade)...")
    comp_a = carregar_componente("componente_a.tif")
    print("  Componente C (Cultivabilidade)...")
    comp_c = carregar_componente("componente_c.tif")
    print("  Componente E (Extraibilidade)...")
    comp_e = carregar_componente("componente_e.tif")
    print("  Componente U (Proteção)...")
    comp_u = carregar_componente("componente_u.tif")

    print("\n[3] Gerando máscara de floresta de referência...")
    mascara_floresta = gerar_mascara_floresta(transform, shape)

    print("\n[4] Calculando risco bruto: R = A + C + E - U...")
    risco_bruto = calcular_risco_bruto(comp_a, comp_c, comp_e, comp_u, mascara)

    # Salvar risco bruto
    print("\n  Salvando risco bruto...")
    caminho_bruto = os.path.join(RASTERS_DIR, "risco_bruto.tif")
    meta_bruto = meta.copy()
    meta_bruto["dtype"] = "int16"
    meta_bruto["compress"] = "lzw"
    meta_bruto["BIGTIFF"] = "YES"
    with rasterio.open(caminho_bruto, "w", **meta_bruto) as dst:
        dst.write(risco_bruto, 1)

    print("\n[5] Classificando em quintis sobre floresta de referência...")
    risco_classes = classificar_quintis(risco_bruto, mascara_floresta, mascara)

    print("\n[6] Salvando raster de risco ACEU (classes 1-5)...")
    caminho_aceu = os.path.join(RASTERS_DIR, "risco_aceu.tif")
    meta_aceu = meta.copy()
    meta_aceu["dtype"] = "uint8"
    meta_aceu["compress"] = "lzw"
    meta_aceu["BIGTIFF"] = "YES"
    with rasterio.open(caminho_aceu, "w", **meta_aceu) as dst:
        dst.write(risco_classes, 1)
    tamanho_mb = os.path.getsize(caminho_aceu) / 1024 / 1024
    print(f"  Salvo: {caminho_aceu} ({tamanho_mb:.1f} MB)")

    # Salvar máscara de floresta para uso posterior
    caminho_floresta = os.path.join(RASTERS_DIR, "mascara_floresta.tif")
    meta_floresta = meta.copy()
    meta_floresta["dtype"] = "uint8"
    meta_floresta["compress"] = "lzw"
    meta_floresta["BIGTIFF"] = "YES"
    with rasterio.open(caminho_floresta, "w", **meta_floresta) as dst:
        dst.write(mascara_floresta.astype(np.uint8), 1)

    print("\n[OK] Etapa 07 concluída.")
    print("  Rasters gerados:")
    print(f"    - {caminho_bruto}")
    print(f"    - {caminho_aceu}")
    print(f"    - {caminho_floresta}")
    print("  Próximo passo: python 08_estatisticas.py")


if __name__ == "__main__":
    main()
