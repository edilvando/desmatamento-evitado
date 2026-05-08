"""
Pipeline ACEU Completo - Execução Sequencial

Executa todas as etapas do modelo ACEU para o Mato Grosso:
01. Download de dados geoespaciais
02. Criação da grade de referência (30m, EPSG:31981)
03. Componente A - Acessibilidade (distância a rodovias)
04. Componente U - Proteção (áreas protegidas)
05. Componente C - Cultivabilidade (pressão agropecuária)
06. Componente E - Extraibilidade (recursos florestais e minerais)
07. Composição ACEU (risco bruto + quintis)
08. Estatísticas zonais (desmatamento evitado por município)
09. Geração de tiles (visualização web)

Uso:
    python run_all.py           # executa tudo
    python run_all.py --from 3  # executa a partir da etapa 3
    python run_all.py --only 7  # executa apenas a etapa 7

Requisitos:
    pip install -r requirements.txt

Referências:
    ECOMETRICA. The Hectares Indicator Methods and Guidance. Version 2.0. 2019.
    VENDRUSCULO et al. Aplicação da metodologia do Hectare Indicator. Embrapa, 2019.
"""
import sys
import time
import argparse
import importlib


ETAPAS = [
    ("01_download_mt", "Download de dados"),
    ("02_grade_mt", "Grade de referência"),
    ("03_acessibilidade", "Componente A - Acessibilidade"),
    ("04_protecao", "Componente U - Proteção"),
    ("05_cultivabilidade", "Componente C - Cultivabilidade"),
    ("06_extraibilidade", "Componente E - Extraibilidade"),
    ("07_composicao_aceu", "Composição ACEU"),
    ("08_estatisticas", "Estatísticas zonais"),
    ("09_gerar_tiles", "Geração de tiles"),
    ("10_copiar_tiles", "Copiar tiles para frontend"),
]


def executar_etapa(modulo_nome, descricao, numero):
    """Executa uma etapa do pipeline."""
    print(f"\n{'#' * 70}")
    print(f"# ETAPA {numero:02d}: {descricao}")
    print(f"{'#' * 70}")

    inicio = time.time()

    try:
        modulo = importlib.import_module(modulo_nome)
        modulo.main()
        duracao = time.time() - inicio
        print(f"\n  Tempo: {duracao:.1f} segundos")
        return True
    except FileNotFoundError as e:
        print(f"\n  [ERRO] Arquivo não encontrado: {e}")
        print("  Verifique se as etapas anteriores foram executadas.")
        return False
    except Exception as e:
        print(f"\n  [ERRO] Falha na etapa {numero}: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    parser = argparse.ArgumentParser(description="Pipeline ACEU - Mato Grosso")
    parser.add_argument("--from", type=int, dest="from_step", default=1,
                        help="Executar a partir desta etapa (1-9)")
    parser.add_argument("--only", type=int, default=None,
                        help="Executar apenas esta etapa")
    parser.add_argument("--skip-download", action="store_true",
                        help="Pular a etapa de download (útil se dados já estão disponíveis)")
    args = parser.parse_args()

    print("=" * 70)
    print("  PIPELINE ACEU - DESMATAMENTO EVITADO NO MATO GROSSO")
    print("  Modelo: Hectares Indicator (ECOMETRICA, 2019)")
    print("  Adaptação: Embrapa Agrossilvipastoril (CPAMT)")
    print("=" * 70)
    print(f"\n  Etapas: {len(ETAPAS)}")
    print(f"  Resolução: 30 metros")
    print(f"  CRS: EPSG:31981 (SIRGAS 2000 / UTM 21S)")
    print(f"  Área: Estado do Mato Grosso (141 municípios)")

    inicio_total = time.time()
    resultados = {}

    for i, (modulo, descricao) in enumerate(ETAPAS, 1):
        # Filtrar etapas conforme argumentos
        if args.only is not None and i != args.only:
            continue
        if i < args.from_step:
            continue
        if args.skip_download and i == 1:
            print(f"\n  [SKIP] Etapa 01 (download) pulada com --skip-download")
            continue

        sucesso = executar_etapa(modulo, descricao, i)
        resultados[i] = sucesso

        if not sucesso and i <= 2:
            # Etapas 1-2 são críticas
            print("\n  [ABORTADO] Etapa crítica falhou. Corrija e re-execute.")
            break

    # Resumo final
    duracao_total = time.time() - inicio_total
    print(f"\n{'=' * 70}")
    print("  RESUMO DA EXECUÇÃO")
    print(f"{'=' * 70}")
    for i, (_, descricao) in enumerate(ETAPAS, 1):
        if i in resultados:
            status = "OK" if resultados[i] else "FALHOU"
            print(f"  Etapa {i:02d}: {descricao:40s} [{status}]")
    print(f"\n  Tempo total: {duracao_total:.1f} segundos ({duracao_total/60:.1f} minutos)")

    falhas = [k for k, v in resultados.items() if not v]
    if falhas:
        print(f"\n  {len(falhas)} etapa(s) com falha: {falhas}")
        print("  Verifique os erros acima e re-execute com: python run_all.py --from <etapa>")
        sys.exit(1)
    else:
        print("\n  Pipeline concluído com sucesso!")
        print("  Resultados em: geoprocessamento/output/")
        print("  Tiles em: geoprocessamento/tiles/")
        sys.exit(0)


if __name__ == "__main__":
    main()
