import { test, expect, Page, Locator } from '@playwright/test';

test.describe('Módulo: Pesquisa de Voos - FlightRadar24', () => {
  let searchInput: Locator;

  const pesquisar = async (page: Page, termo: string) => {
    await searchInput.click();
    await searchInput.fill(termo);
    await expect(searchInput).toHaveValue(termo);
  };

  test.beforeEach(async ({ page }: { page: Page }) => {
    // 1. Remove webdriver e destrói o container do Gravito CMP no instante em que entra no DOM
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

      const removerGravito = () => {
        const cmp =
          document.getElementById('gravitoCMPRoot') ||
          document.querySelector('.gravitoCMP-tab-container');
        if (cmp) cmp.remove();
        document.body?.style.removeProperty('overflow');
      };

      const observer = new MutationObserver(removerGravito);
      observer.observe(document, { childList: true, subtree: true });
    });

    // 2. Handler apenas para banners promocionais que não sejam o Gravito
    await page.addLocatorHandler(
      page.getByRole('dialog').filter({ hasNot: page.locator('[id^="gravitoCMP"]') }),
      async (dialog) => {
        const closeBtn = dialog.getByRole('button', { name: /Close|Fechar/i }).first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click({ force: true });
        }
      },
      { noWaitAfter: true }
    );

    await page.goto('https://www.flightradar24.com/', { waitUntil: 'domcontentloaded' });

    searchInput = page.getByTestId('search__box');
    await expect(searchInput).toBeVisible({ timeout: 15000 });
  });

  test('CT01 - Verificar visibilidade da barra de pesquisa', async () => {
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeEnabled();
  });

  test('CT02 - Pesquisar por prefixo de voo comercial (GLO)', async ({ page }) => {
    await pesquisar(page, 'GLO');

    const resultado = page
      .getByTestId('search__results')
      .getByText(/GLO\d+|G3\d+/i)
      .first();

    await expect(resultado).toBeVisible({ timeout: 10000 });
  });

  test('CT03 - Pesquisar por prefixo de voo comercial (AZU)', async ({ page }) => {
    await pesquisar(page, 'AZU');

    const resultado = page
      .getByTestId('search__results')
      .getByText(/AZU\d+|AD\d+/i)
      .first();

    await expect(resultado).toBeVisible({ timeout: 10000 });
  });

  test('CT04 - Pesquisar por nome de companhia aérea (LATAM)', async ({ page }) => {
    await pesquisar(page, 'LATAM');

    const resultado = page
      .getByTestId('search__results')
      .getByText(/LATAM/i)
      .first();

    await expect(resultado).toBeVisible({ timeout: 10000 });
  });

  test('CT05 - Pesquisar por matrícula de aeronave (PR-G)', async ({ page }) => {
    await pesquisar(page, 'PR-G');

    const resultadoMatricula = page
      .getByTestId('search__results')
      .getByText(/PR-G[A-Z0-9]{2}/i)
      .first();

    await expect(resultadoMatricula).toBeVisible({ timeout: 10000 });
  });

  test('CT06 - Pesquisar por código de aeroporto (GRU)', async ({ page }) => {
    await pesquisar(page, 'GRU');

    const resultadoAeroporto = page
      .getByTestId('search__results')
      .getByText(/Guarulhos|GRU/i)
      .first();

    await expect(resultadoAeroporto).toBeVisible({ timeout: 10000 });
  });

  test('CT07 - Comportamento diante de pesquisa inexistente', async ({ page }) => {
    await pesquisar(page, 'XYZ999999');

    await page.waitForTimeout(2000);
    await expect(page.getByTestId('search__results')).toHaveCount(0);
  });

  test('CT08 - Pesquisa com caracteres especiais', async ({ page }) => {
    await pesquisar(page, '@@@###');

    await page.waitForTimeout(2000);
    await expect(page.getByTestId('search__results')).toHaveCount(0);
  });

  test('CT09 - Pesquisa case-insensitive com letras minúsculas (glo)', async ({ page }) => {
    await pesquisar(page, 'glo');

    const resultado = page
      .getByTestId('search__results')
      .getByText(/GLO\d+|G3\d+/i)
      .first();

    await expect(resultado).toBeVisible({ timeout: 10000 });
  });

  test('CT10 - Limpar campo de pesquisa', async ({ page }) => {
    await pesquisar(page, 'AZU');

    const resultado = page
      .getByTestId('search__results')
      .getByText(/AZU\d+|AD\d+/i)
      .first();

    await expect(resultado).toBeVisible({ timeout: 10000 });

    await searchInput.clear();
    await expect(searchInput).toHaveValue('');
    await expect(page.getByTestId('search__results')).toHaveCount(0);
  });

  test('CT11 - Selecionar voo ativo na lista de resultados', async ({ page }) => {
    await pesquisar(page, 'AZU');

    const resultados = page.getByTestId('search__results');
    const vooAtivoAzul = resultados
      .getByRole('button', { name: /AD\d+.*(PR-|PS-|PP-|PT-)/i })
      .first();

    await expect(vooAtivoAzul).toBeVisible({ timeout: 10000 });
    await vooAtivoAzul.click();

    const showOnMapBtn = resultados.getByRole('button', { name: 'Show on map' });
    await expect(showOnMapBtn).toBeVisible({ timeout: 10000 });
    await showOnMapBtn.click();

    // Valida que a busca fechou e o painel lateral do voo selecionado abriu no mapa
    await expect(resultados).toBeHidden({ timeout: 10000 });
    await expect(page.locator('main').getByText(/AZU\d+|AD\d+/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Follow' })).toBeVisible();
  });

  test('CT12 - Exibição de informações da aeronave e rota após seleção', async ({ page }) => {
    await pesquisar(page, 'GLO');

    const resultados = page.getByTestId('search__results');
    const vooAtivoGol = resultados
      .getByRole('button', { name: /G3\d+.*(PR-|PS-|PP-|PT-)/i })
      .first();

    await expect(vooAtivoGol).toBeVisible({ timeout: 10000 });
    await vooAtivoGol.click();

    // Valida os campos reais exibidos no card expandido do voo
    await expect(resultados.getByText(/Scheduled departure/i)).toBeVisible({ timeout: 10000 });
    await expect(resultados.getByText(/Equipment/i)).toBeVisible();
    await expect(resultados.getByText(/Call sign/i)).toBeVisible();
    await expect(resultados.getByRole('button', { name: 'Show on map' })).toBeVisible();
  });
});