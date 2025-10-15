/**
 * Health Check Service
 * Verifica a existência de paths e arquivos configurados no settings.js
 */

/**
 * Busca as configurações do settings.js via API
 */
export async function getSettings() {
  try {
    const response = await fetch('/api/settings');
    if (!response.ok) {
      throw new Error('Não foi possível carregar settings via API');
    }
    return await response.json();
  } catch (error) {
    console.error('Erro ao carregar settings:', error);
    throw error;
  }
}

/**
 * Verifica um path com validação detalhada usando a API
 */
export async function checkPathDetailed(path, type) {
  try {
    const response = await fetch(
      `/api/health-check?path=${encodeURIComponent(path)}&type=${encodeURIComponent(type)}`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Erro ao verificar path ${path}:`, error);
    return { exists: false, valid: false, error: error.message };
  }
}

/**
 * Verifica todos os paths e arquivos do settings.js
 */
export async function checkAllPaths() {
  try {
    const settings = await getSettings();
    const checks = [];

    // Verifica cada path na seção database
    if (settings.database) {
      const { database } = settings;

      // monstersPath - must be a directory with .xml files
      if (database.monstersPath) {
        const result = await checkPathDetailed(database.monstersPath, 'monstersPath');
        checks.push({
          key: 'monstersPath',
          label: 'Monsters Path',
          path: database.monstersPath,
          type: 'directory',
          ...result,
          description: result.xmlCount
            ? `${result.xmlCount} arquivo(s) .xml encontrado(s)`
            : 'Nenhum arquivo .xml encontrado',
        });
      }

      // baldurPath - must be a file named baldur.lua
      if (database.baldurPath) {
        const result = await checkPathDetailed(database.baldurPath, 'baldurFile');
        checks.push({
          key: 'baldurPath',
          label: 'Baldur File',
          path: database.baldurPath,
          type: 'file',
          ...result,
          description: result.fileName
            ? `Arquivo: ${result.fileName}`
            : 'Deve ser o arquivo baldur.lua',
        });
      }

      // movementsPath - must be a file named movements.xml
      if (database.movementsPath) {
        const result = await checkPathDetailed(database.movementsPath, 'movementsFile');
        checks.push({
          key: 'movementsPath',
          label: 'Movements File',
          path: database.movementsPath,
          type: 'file',
          ...result,
          description: result.fileName
            ? `Arquivo: ${result.fileName}`
            : 'Deve ser o arquivo movements.xml',
        });
      }

      // worldPath - must be a directory with specific files
      if (database.worldPath) {
        const result = await checkPathDetailed(database.worldPath, 'worldPath');
        let description = 'Diretório do mundo';

        if (result.requiredFiles) {
          const foundCount = Object.values(result.requiredFiles).filter(Boolean).length;
          const totalCount = Object.keys(result.requiredFiles).length;
          description = `${foundCount}/${totalCount} arquivos obrigatórios encontrados`;
        }

        checks.push({
          key: 'worldPath',
          label: 'World Path',
          path: database.worldPath,
          type: 'directory',
          ...result,
          description,
        });
      }

      // itemsPath - must be a directory with items.xml and items.otb
      if (database.itemsPath) {
        const result = await checkPathDetailed(database.itemsPath, 'itemsPath');
        let description = 'Diretório de itens';

        if (result.requiredFiles) {
          const foundCount = Object.values(result.requiredFiles).filter(Boolean).length;
          const totalCount = Object.keys(result.requiredFiles).length;
          description = `${foundCount}/${totalCount} arquivos obrigatórios encontrados`;
        }

        checks.push({
          key: 'itemsPath',
          label: 'Items Path',
          path: database.itemsPath,
          type: 'directory',
          ...result,
          description,
        });
      }
    }

    return checks;
  } catch (error) {
    console.error('Erro ao verificar paths:', error);
    throw error;
  }
}
