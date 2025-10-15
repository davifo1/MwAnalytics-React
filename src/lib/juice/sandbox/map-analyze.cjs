const fs = require('fs');
const otbm2json = require("../otbm2json");
var path = require("path");

//var otbmPath = "C:\\gdev-workspace\\DreamMapEditor\\MyTools\\world2048-dream-prepared.otbm";
var otbmPath = "C:\\gdev-workspace\\Forgotten-Dream-Server\\data\\world\\forgotten.otbm";


var appearancePath = "C:\\gdev-workspace\\DreamMapEditor\\MyTools\\appearenceTypeData.json";
var appearanceData = JSON.parse(fs.readFileSync(appearancePath, 'utf8'));
var appearanceDataDictionary = {};
for (var i = 0; i < appearanceData.Data.length; i++) {
    var appearance = appearanceData.Data[i];
    appearanceDataDictionary[appearance.Sid] = appearance;
}


const mapData = otbm2json.read(otbmPath);
var features = mapData.data.nodes[0].features;

let uniqueIds = new Set();
for (var featureIndex = 0; featureIndex < features.length; featureIndex++) {
    var feature = features[featureIndex];

    var tiles = feature.tiles;
    if (feature.tiles == undefined || feature.type != 4)
        continue;

    for (var tileIndex = 0; tileIndex < tiles.length; tileIndex++) {
        var tile = tiles[tileIndex];
        uniqueIds.add(tile.tileid);

        if (Array.isArray(tile.items)) {
            tile.items.forEach(item => {
                // var data = appearanceDataDictionary[item.id];
                // if(data && !data.IsPickupable)
                uniqueIds.add(item.id);
            });
        }
    }
}

let sortedUniqueIds = Array.from(uniqueIds).sort((a, b) => a - b);

const output = `Unique IDs used in tileid and items (total ${sortedUniqueIds.length}):\n${sortedUniqueIds.join('\n')}`;
fs.writeFileSync('C:\\gdev-workspace\\DreamMapEditor\\MyTools\\unique_ids.txt', output);

console.log("Unique IDs saved to unique_ids.txt");

