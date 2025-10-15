/**
 * Application settings
 * Configurações do MWServerBKO - caminhos para arquivos do jogo
 */

// Path base - todos os outros paths são concatenados com este
const basePath = String.raw`C:/gdev-workspace/Forgotten-Dream-Server/data`;

// Configurações da aplicação
const settings = {
  database: {
    // Path base para todos os outros paths
    basePath: basePath,

    // Paths específicos (concatenados com basePath)
    monstersPath: `${basePath}/monster/_dream/`,
    baldurPath: `${basePath}/npc/scripts/baldur.lua`,//file
    branorFile: `${basePath}/npc/scripts/branor.lua`,//file
    movementsPath: `${basePath}/movements/movements.xml`,//file
    worldPath: `${basePath}/world`,
    shrinePath: `${basePath}/shrine`,
    itemsPath: `${basePath}/items`
  }
};

export default settings;
