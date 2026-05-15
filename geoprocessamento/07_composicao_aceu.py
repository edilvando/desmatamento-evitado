"""
Etapa 07 - Composição do Risco ACEU e Classificação em Quintis

Processo:
1. Carrega os 4 componentes (A, C, E, U) gerados nas etapas anteriores
2. Calcula o risco bruto pixel a pixel: R_bruto(x) = A(x) + C(x) + E(x)
3. Aplica máscara de floresta de referência (só pixels florestais entram na classificação)
4. Classifica o risco bruto em 5 classes (quintis) sobre os pixels de floresta
5. Reclassifica pixels em áreas protegidas (U=1) para risco 1 (mínimo)

A reclassificação de áreas protegidas para risco 1 segue a abordagem do caso
de estudo do Cerrado (ECOMETRICA, 2018, Appendix B, Table 2):
"Risk values in areas under federal and state protection were reassigned
to the lowest risk (1)."

Essa abordagem é preferível à subtração aritmética de U porque:
- Garante que áreas protegidas sempre recebam risco mínimo
- Independe da escala de U (binário ou graduado)
- É mais conservadora e intuitiva

Saída:
- rasters/risco_bruto.tif (int16, valores contínuos de A+C+E)
- rasters/risco_aceu.tif (uint8, valores 1 a 5 = classes de risco)

Referência:
ECOMETRICA. The Hectares Indicator Methods and Guidance. Version 2.0. Edinburgh, 2018.
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


def calcular_risco_bruto(comp_a, comp_c, comp_e, mascara):
    """
    Calcula o risco bruto: R_bruto(x) = A(x) + C(x) + E(x)

    Nota: O componente U (proteção) NÃO entra na soma aritmética.
    A proteção é aplicada por reclassificação após a classificação em quintis
    (abordagem do caso Cerrado, ECOMETRICA 2018 Appendix B).

    Valores possíveis:
    - A: 1 a 5
    - C: 1 a 5
    - E: 1 a 5
    - R_bruto: mínimo teórico = 1+1+1 = 3, máximo = 5+5+5 = 15
    """
    risco = (
        comp_a.astype(np.int16) +
        comp_c.astype(np.int16) +
        comp_e.astype(np.int16)
    )

    # Aplicar máscara do estado
    risco[mascara == 0] = 0

    # Estatísticas
    validos = risco[mascara == 1]
    print(f"  Risco bruto (A+C+E) - min: {validos.min()}, max: {validos.max()}")
    print(f"  Risco bruto (A+C+E) - média: {validos.mean():.2f}, mediana: {np.median(validos):.1f}")

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

    # Se houver limiares colapsados (valores iguais), usar jitter para desempatar
    if len(set(limiares)) < len(limiares):
        print("  [AVISO] Limiares colapsados detectados. Aplicando jitter para desempatar...")
        # Adicionar ruído uniforme pequeno para desempatar valores inteiros iguais
        jitter = np.random.uniform(-0.49, 0.49, size=valores_floresta.shape)
        valores_jitter = valores_floresta.astype(np.float32) + jitter
        limiares = np.percentile(valores_jitter, percentis)
        print(f"  Limiares ajustados (com jitter): {limiares}")

        # Classificar usando os valores com jitter
        risco_jitter = risco_bruto.astype(np.float32)
        risco_jitter[mascara_valida] += jitter

        risco_classes = np.zeros_like(mascara_estado, dtype=np.uint8)
        risco_classes[mascara_valida & (risco_jitter <= limiares[0])] = 1
        risco_classes[mascara_valida & (risco_jitter > limiares[0]) & (risco_jitter <= limiares[1])] = 2
        risco_classes[mascara_valida & (risco_jitter > limiares[1]) & (risco_jitter <= limiares[2])] = 3
        risco_classes[mascara_valida & (risco_jitter > limiares[2]) & (risco_jitter <= limiares[3])] = 4
        risco_classes[mascara_valida & (risco_jitter > limiares[3])] = 5
    else:
        # Classificar normalmente
        risco_classes = np.zeros_like(mascara_estado, dtype=np.uint8)
        risco_classes[mascara_valida & (risco_bruto <= limiares[0])] = 1
        risco_classes[mascara_valida & (risco_bruto > limiares[0]) & (risco_bruto <= limiares[1])] = 2
        risco_classes[mascara_valida & (risco_bruto > limiares[1]) & (risco_bruto <= limiares[2])] = 3
        risco_classes[mascara_valida & (risco_bruto > limiares[2]) & (risco_bruto <= limiares[3])] = 4
        risco_classes[mascara_valida & (risco_bruto > limiares[3])] = 5

    # Estatísticas antes da reclassificação de áreas protegidas
    print("  Distribuição das classes de risco (antes da reclassificação U):")
    total_floresta = np.sum(mascara_valida)
    for classe in range(1, 6):
        n = np.sum(risco_classes == classe)
        pct = n / total_floresta * 100
        area_km2 = n * (30 ** 2) / 1e6
        print(f"    Classe {classe}: {n:>12,} pixels ({pct:5.1f}%) = {area_km2:,.0f} km²")

    return risco_classes


def aplicar_protecao(risco_classes, comp_u, mascara_floresta, mascara_estado):
    """
    Reclassifica pixels em áreas protegidas para risco 1 (mínimo).

    Abordagem do caso Cerrado (ECOMETRICA, 2018, Appendix B):
    "Risk values in areas under federal and state protection were
    reassigned to the lowest risk (1)."

    Isso garante que áreas protegidas (TIs, UCs, Quilombos) sempre
    recebam o risco mínimo, independente dos valores de A, C e E.
    """
    mascara_valida = mascara_floresta & (mascara_estado == 1)
    mascara_protegida = (comp_u == 1) & mascara_valida

    pixels_reclassificados = np.sum((risco_classes > 1) & mascara_protegida)
    pixels_protegidos_total = np.sum(mascara_protegida)

    print(f"  Pixels de floresta em áreas protegidas: {pixels_protegidos_total:,}")
    print(f"  Pixels reclassificados para risco 1: {pixels_reclassificados:,}")

    # Reclassificar: todos os pixels protegidos recebem risco 1
    risco_classes[mascara_protegida] = 1

    # Estatísticas após reclassificação
    print("  Distribuição das classes de risco (após reclassificação U):")
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
    print("  Abordagem: R_bruto = A + C + E; proteção por reclassificação")
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
    print("  Componente U (Proteção - máscara)...")
    comp_u = carregar_componente("componente_u.tif")

    print("\n[3] Gerando máscara de floresta de referência...")
    mascara_floresta = gerar_mascara_floresta(transform, shape)

    print("\n[4] Calculando risco bruto: R = A + C + E...")
    risco_bruto = calcular_risco_bruto(comp_a, comp_c, comp_e, mascara)

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

    print("\n[6] Aplicando proteção: reclassificando áreas protegidas para risco 1...")
    risco_classes = aplicar_protecao(risco_classes, comp_u, mascara_floresta, mascara)

    print("\n[7] Salvando raster de risco ACEU (classes 1-5)...")
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
    print("  Próximo passo: python 07b_desmatamento_evitado_raster.py")


if __name__ == "__main__":
    main()
