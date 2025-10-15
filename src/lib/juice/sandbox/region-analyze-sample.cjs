const fs = require('fs');
const otbm2json = require("../otbm2json");
var path = require("path");
const {parseStringPromise} = require('xml2js');
const xml2js = require('xml2js');
const Jimp = require('jimp');

var spawnPath = "C:\\gdev-workspace\\Forgotten-Dream-Server\\data\\world\\world-spawn.xml";
var otbmPath = "C:\\gdev-workspace\\Forgotten-Dream-Server\\data\\world\\forgotten.otbm";

class AreaInfo {
    constructor(name, tag, colorHex) {
        this.name = name;
        this.tag = tag;
        this.colorHex = colorHex;
    }
}

function testGetRegionName() {
    const pos1 = {x: 32367, y: 32216, z: 7};
    const pos2 = {x: 32069, y: 32205, z: 7};

    console.log("Região para", pos1, ":", getRegionName(pos1), "Esperado Thais");
    console.log("Região para", pos2, ":", getRegionName(pos2), "Esperado Rookgaard");
}


const DrawnCenter = {x: 32598, y: 32233};
const VisionSize = 2048;

const areaMap = [
    new AreaInfo("Thais and Surroundings", "thais", "#FFD800"),
    new AreaInfo("Drillturtle Bridge, Swamp and Surroundings", "drillturtle_swamp", "#FF6A00"),
    new AreaInfo("North Carlin, Hill and Orc Fortress", "northcarlin_hill_orcfortress", "#FA00FF"),
    new AreaInfo("POH, Fibula and Darashia", "poh_fibula_darashia", "#00E5FF"),
    new AreaInfo("Venore", "venore", "#0004FF"),
    new AreaInfo("Abdendriel and Hellgate", "abdendriel_hellgate", "#FCFFF9"),
    new AreaInfo("Carlin, Ghost Island and Okolnir", "carlin_ghostisland_okolnir", "#7F0000"),
    new AreaInfo("Ankrahmun and Edron", "ankrahmun_edron", "#000000"),
    new AreaInfo("rookgaard", "rookgaard", "#19FF24"),
];

const areaByPosition = new Map();

function Position2048ToFullTilePosition(imagePos) {
    const x = Math.round(imagePos.x + DrawnCenter.x - (VisionSize / 2));
    const y = Math.round(imagePos.y + DrawnCenter.y - (VisionSize / 2));
    return {x: x, y: y, z: imagePos.z};
}

async function testaCorPixelRegiao(pathImagem) {
    const x = 747;
    const y = 1011;
    const corEsperada = "#FFD800";
    const imagem = await Jimp.read(pathImagem);
    const cor = Jimp.intToRGBA(imagem.getPixelColor(x, y));
    const hexColor = `#${((1 << 24) + (cor.r << 16) + (cor.g << 8) + cor.b).toString(16).slice(1).toUpperCase()}`;
    console.log(`Pixel em (${x},${y}): ${hexColor} | Esperado: ${corEsperada}`);
    if (hexColor === corEsperada) {
        console.log("Teste passou!");
    } else {
        console.log("Teste falhou!");
    }
}

function test_Position2048ToFullTilePosition() {
    const input = {x: 747, y: 1011};
    const esperado = {x: 32321, y: 32220, z: 7};
    const resultado = Position2048ToFullTilePosition(input);
    console.log("Input:", input, "Resultado:", resultado, "Esperado:", esperado);
    if (
        resultado.x === esperado.x &&
        resultado.y === esperado.y &&
        resultado.z === esperado.z
    ) {
        console.log("Teste passou!");
    } else {
        console.log("Teste falhou!");
    }
}

async function loadRegion(regionPath) {

    const image = await Jimp.read(regionPath);

    for (let x = 0; x < 2048; x++) {
        for (let y = 0; y < 2048; y++) {
            const color = Jimp.intToRGBA(image.getPixelColor(x, y));
            const hexColor = `#${((1 << 24) + (color.r << 16) + (color.g << 8) + color.b).toString(16).slice(1).toUpperCase()}`;
            if (color.a === 0) continue; // Ignora pixels transparentes
            const area = areaMap.find(a => a.colorHex.toUpperCase() === hexColor);
            if (area) {
                // console.log(area)
                const remereAbsolutePosition = Position2048ToFullTilePosition({x, y});
                areaByPosition.set(`${remereAbsolutePosition.x},${remereAbsolutePosition.y}`, area);
            }
        }
    }
}

function getRegionName(p) {
    const key = `${p.x},${p.y}`;
    // console.log("Buscando região para posição:", p, "Chave:", key);
    const area = areaByPosition.get(key);
    if (area) {
        // console.log("Área encontrada:", area);
        return area.name;
    } else {
        // console.log("Nenhuma área encontrada para a chave:", key);
        return "[NOT FOUND REGION]";
    }
}

function parseXmlSync(xml) {
    let done = false;
    let result;
    xml2js.parseString(xml, (err, res) => {
        if (err) throw err;
        result = res;
        done = true;
    });
    while (!done) {
        deasync.runLoopOnce();
    }
    return result;
}

function loadSpawns(spawnPath) {
    const spawnData = fs.readFileSync(spawnPath, 'utf8');
    const parsedXml = parseXmlSync(spawnData);
    const spawns = parsedXml.spawns.spawn;
    const dict = {};

    for (let i = 0; i < spawns.length; i++) {
        const spawn = spawns[i];
        const center = {
            x: parseInt(spawn.$.centerx),
            y: parseInt(spawn.$.centery),
            z: parseInt(spawn.$.centerz)
        };

        if (!spawn.monster) continue;

        const monsters = Array.isArray(spawn.monster) ? spawn.monster : [spawn.monster];

        for (let j = 0; j < monsters.length; j++) {
            const monster = spawn.monster[j];
            const abs = {
                x: center.x + parseInt(monster.$.x),
                y: center.y + parseInt(monster.$.y),
                z: center.z
            };
            const key = `${abs.x},${abs.y},${abs.z}`;
            dict[key] = monster;
        }
    }
    return dict;
}

async function main() {
    // testaCorPixelRegiao("C:\\gdev-workspace\\Forgotten-Dream-Server\\data\\world\\regions-bounds.png");
// test_Position2048ToFullTilePosition(); return;
    await loadRegion("C:\\gdev-workspace\\Forgotten-Dream-Server\\data\\world\\regions-bounds.png");
    // testGetRegionName();
    console.log("Regions loaded.");
    var monsters = loadSpawns(spawnPath);
    console.log("Spawns loaded.");
    let areaNames = {};
    const xmlData = fs.readFileSync('C:/gdev-workspace/Forgotten-Dream-Server/data/world/forgotten-areas.xml', 'utf8');
    xml2js.parseString(xmlData, (err, result) => {
        if (err) throw err;
        const areas = result.dreamareas.area;
        for (const area of areas) {
            areaNames[area.$.id] = area.$.name;
        }
    });
    console.log("Area names loaded.");
    const mapData = otbm2json.read(otbmPath);
    console.log("Map loaded.");
    var features = mapData.data.nodes[0].features;
    const hunts = {};

    for (var featureIndex = 0; featureIndex < features.length; featureIndex++) {
        var feature = features[featureIndex];

        if (feature.tiles == undefined || feature.type != 4)
            continue;

        for (var tileIndex = 0; tileIndex < feature.tiles.length; tileIndex++) {
            var tile = feature.tiles[tileIndex];
            var areaId = tile.dreamAreaId;

            if (!areaId) continue;

            if (!hunts[areaId]) {
                hunts[areaId] = [];
            }
            var absoluteX = feature.x + tile.x;
            var absoluteY = feature.y + tile.y;
            var absoluteZ = feature.z;
            // Monta a chave da posição absoluta do tile
            const key = `${absoluteX},${absoluteY},${absoluteZ}`;
            let monsterOnTile = monsters[key] ? [monsters[key]] : [];
            tile.x = absoluteX;
            tile.y = absoluteY;
            hunts[areaId].push({
                tile: tile,
                monster: monsterOnTile
            });
        }
    }

    console.log("Hunt Analyze");
    // Agrupa hunts por região
    const regionHunts = {};
    for (const areaId in hunts) {
        const areaName = areaNames[areaId] || 'Unknown';
        if (!areaName.includes('Hunt')) continue;
        if (hunts.hasOwnProperty(areaId)) {
            const regex = /x\s*=\s*(\d+),\s*y\s*=\s*(\d+),\s*z\s*=\s*(\d+)/;
            const match = areaName.match(regex);
            var huntInit = {x:0, y:0};
            if (match) {
                huntInit.x = parseInt(match[1]);
                huntInit.y = parseInt(match[2]);
            }else{
                console.error(`Erro ao analisar a posição da hunt: ${areaName}`);
            }
            const regionName = getRegionName({ x: huntInit.x, y: huntInit.y });
            if (!regionHunts[regionName]) regionHunts[regionName] = [];
            regionHunts[regionName].push(areaId);
        }
    }
    // Para cada região, loga as hunts
    const outputLines = [];
    for (const regionName in regionHunts) {
        outputLines.push('------------------');
        outputLines.push(`Região: ${regionName} | Total de hunts: ${regionHunts[regionName].length}`);
        for (const areaId of regionHunts[regionName]) {
            const areaName = areaNames[areaId] || 'Unknown';
            let totalMonsters = 0;
            const uniqueMonsters = new Set();
            for (const entry of hunts[areaId]) {
                totalMonsters += entry.monster.length;
                for (const monster of entry.monster) {
                    if (monster && monster.$ && monster.$.name) {
                        uniqueMonsters.add(monster.$.name);
                    }
                }
            }
            outputLines.push(`${areaName} (ID: ${areaId}) | Tiles: ${hunts[areaId].length} | Total Monsters: ${totalMonsters} | Unique Monsters: [${[...uniqueMonsters].join(', ')}]`);
        }
    }
    fs.writeFileSync('hunt-report.txt', outputLines.join('\n'), 'utf8');
    console.log('Relatório salvo em hunt-report.txt');
}

main();


