local keywordHandler = KeywordHandler:new()
local npcHandler = NpcHandler:new(keywordHandler)
NpcSystem.parseParameters(npcHandler)

function onCreatureAppear(cid) npcHandler:onCreatureAppear(cid) end

function onCreatureDisappear(cid) npcHandler:onCreatureDisappear(cid) end

function onCreatureSay(cid, type, msg) npcHandler:onCreatureSay(cid, type, msg) end

function onThink() npcHandler:onThink() end

local shopModule = ShopModule:new()
npcHandler:addModule(shopModule)

local function generateJson(cid, itemClientId, action, success, complete, forgeResultMsg, history)
    return json.encode({
        fusionResult = {
            cid = itemClientId,
            money = getPlayerMoney(cid) + getPlayerBalance(cid),
            price = getFusionPrice(itemClientId),
            dustPrice = getFusionDustPrice(),
            improveSuccessRatePrice = getFusionDarkEssenceSuccessRatePrice(),
            improveLevelLossPrice = getFusionDarkEssenceLevelLossPrice(),
            action = action,
            success = success,
            complete = complete,
            forgeResultMsg = forgeResultMsg,
            history = history
        }
    }, { indent = false })
end

local function creatureSayCallback(cid, type, msg)
    if not npcHandler:isFocused(cid) then
        return false
    end
    local player = Player(cid)
    if msgContainsAny(msg, "history") then
        local params = {}
        for param in string.gmatch(msg, '([^,]+)') do
            table.insert(params, param)
        end
        local itemClientId = tonumber(params[2])
        local history = player:getFusionHistory()
        selfSay('##windowFusion##' .. generateJson(cid, itemClientId, "history", false, false, "", history), cid)
    elseif msgContainsAny(msg, "viewFusion") then
        local params = {}
        for param in string.gmatch(msg, '([^,]+)') do
            table.insert(params, param)
        end
        local itemClientId = tonumber(params[2])
        --print(fusionResultJson)
        selfSay('##windowFusion##' .. generateJson(cid, itemClientId, "view", false, false, ""), cid)
    elseif msgContainsAny(msg, "doFusion") then
        local player = Player(cid)
        --print(msg)
        local isValid, itemClientId, fusionLevel, isSuccessChanceIncreased, isFusionLevelLossChanceDecreased =
            parseAndValidateFusionParams(msg)

        if isValid then
            local success, complete, forgeResultMsg = doFusion(player, itemClientId, fusionLevel,
                isSuccessChanceIncreased,
                isFusionLevelLossChanceDecreased)
            player:addStorageKeyValue("medalofvalor_forge_fusion", 1);
            selfSay('##windowFusion##' .. generateJson(cid, itemClientId, "fusion", success, complete, forgeResultMsg),
                cid)
        else
            print("Invalid DoFusionParam: " .. msg)
        end
    end
end

local function onBuyCallback(cid, itemid, subType, amount, ignoreCap, inBackpacks)
    local player = Player(cid)
    return true
end
local basicMultiplier = 1
local epicMultiplier = 1

shopModule:addBuyableItem({ '' }, 2153, basicMultiplier * 500, 1, "Violet Gem", ITEMID_GOLDCOIN_SID, true)                 --basic
shopModule:addBuyableItem({ '' }, 2156, basicMultiplier * 800, 1, "Red Gem", ITEMID_GOLDCOIN_SID, true)                    --basic
shopModule:addBuyableItem({ '' }, 2158, basicMultiplier * 700, 1, "Blue Gem", ITEMID_GOLDCOIN_SID, true)                   --basic
shopModule:addBuyableItem({ '' }, 2165, basicMultiplier * 500, 1, "Mana Ring", ITEMID_GOLDCOIN_SID, true)                  --basic
shopModule:addBuyableItem({ '' }, 2168, basicMultiplier * 600, 1, "Life Ring", ITEMID_GOLDCOIN_SID, true)                  --basic
shopModule:addBuyableItem({ '' }, 2387, basicMultiplier * 3000, 1, "Double Axe", ITEMID_GOLDCOIN_SID, true)                --basic
shopModule:addBuyableItem({ '' }, 2393, basicMultiplier * 5000, 1, "Giant Sword", ITEMID_GOLDCOIN_SID, true)               --basic
shopModule:addBuyableItem({ '' }, 2395, basicMultiplier * 700, 1, "Carlin Sword", ITEMID_GOLDCOIN_SID, true)               --basic
shopModule:addBuyableItem({ '' }, 2467, basicMultiplier * 600, 1, "Leather Armor", ITEMID_GOLDCOIN_SID, true)              --basic
shopModule:addBuyableItem({ '' }, 8602, basicMultiplier * 600, 1, "Jagged Sword", ITEMID_GOLDCOIN_SID, true)               --basic
shopModule:addBuyableItem({ '' }, 8870, basicMultiplier * 800, 1, "Spirit Cloak", ITEMID_GOLDCOIN_SID, true)               --basic
shopModule:addBuyableItem({ '' }, 8872, basicMultiplier * 3000, 1, "Belted Cape", ITEMID_GOLDCOIN_SID, true)               --basic
shopModule:addBuyableItem({ '' }, 8900, basicMultiplier * 800, 1, "Spellbook Of Enlightenment", ITEMID_GOLDCOIN_SID, true) --basic
shopModule:addBuyableItem({ '' }, 8901, basicMultiplier * 3000, 1, "Spellbook Of Warding", ITEMID_GOLDCOIN_SID, true)      --basic
shopModule:addBuyableItem({ '' }, 8902, basicMultiplier * 5000, 1, "Spellbook Of Mind Control", ITEMID_GOLDCOIN_SID, true) --basic
shopModule:addBuyableItem({ '' }, 2112, epicMultiplier * 20000, 1, "Teddy Bear", ITEMID_GOLDCOIN_SID, true)                --epic
shopModule:addBuyableItem({ '' }, 2123, epicMultiplier * 50000, 1, "Ring Of The Sky", ITEMID_GOLDCOIN_SID, true)           --epic
shopModule:addBuyableItem({ '' }, 18402, 150000, 1, "Guardian Necklace", ITEMID_GOLDCOIN_SID, true)                        --legenda
shopModule:addBuyableItem({ '' }, 2173, epicMultiplier * 100000, 1, "Amulet Of Loss", ITEMID_GOLDCOIN_SID, true)           --epic
shopModule:addBuyableItem({ '' }, 2184, epicMultiplier * 20000, 1, "Crystal Wand", ITEMID_GOLDCOIN_SID, true)              --epic
shopModule:addBuyableItem({ '' }, 2361, epicMultiplier * 30000, 1, "Frozen Starlight", ITEMID_GOLDCOIN_SID, true)          --epic
shopModule:addBuyableItem({ '' }, 2363, epicMultiplier * 20000, 1, "Blood Orb", ITEMID_GOLDCOIN_SID, true)                 --epic
shopModule:addBuyableItem({ '' }, 2392, epicMultiplier * 20000, 1, "Fire Sword", ITEMID_GOLDCOIN_SID, true)                --epic
shopModule:addBuyableItem({ '' }, 2409, epicMultiplier * 20000, 1, "Serpent Sword", ITEMID_GOLDCOIN_SID, true)             --epic
shopModule:addBuyableItem({ '' }, 2434, epicMultiplier * 30000, 1, "Dragon Hammer", ITEMID_GOLDCOIN_SID, true)             --epic
shopModule:addBuyableItem({ '' }, 2436, epicMultiplier * 20000, 1, "Skull Staff", ITEMID_GOLDCOIN_SID, true)               --epic
shopModule:addBuyableItem({ '' }, 2476, epicMultiplier * 20000, 1, "Knight Armor", ITEMID_GOLDCOIN_SID, true)              --epic
shopModule:addBuyableItem({ '' }, 2487, epicMultiplier * 20000, 1, "Crown Armor", ITEMID_GOLDCOIN_SID, true)               --epic
shopModule:addBuyableItem({ '' }, 2498, epicMultiplier * 20000, 1, "Royal Helmet", ITEMID_GOLDCOIN_SID, true)              --epic
shopModule:addBuyableItem({ '' }, 2520, epicMultiplier * 40000, 1, "Demon Shield", ITEMID_GOLDCOIN_SID, true)              --epic
shopModule:addBuyableItem({ '' }, 2534, epicMultiplier * 20000, 1, "Vampire Shield", ITEMID_GOLDCOIN_SID, true)            --epic
shopModule:addBuyableItem({ '' }, 2542, epicMultiplier * 20000, 1, "Tempest Shield", ITEMID_GOLDCOIN_SID, true)            --epic
shopModule:addBuyableItem({ '' }, 2656, epicMultiplier * 20000, 1, "Blue Robe", ITEMID_GOLDCOIN_SID, true)                 --epic
shopModule:addBuyableItem({ '' }, 2663, epicMultiplier * 40000, 1, "Mystic Turban", ITEMID_GOLDCOIN_SID, true)             --epic
shopModule:addBuyableItem({ '' }, 3971, epicMultiplier * 40000, 1, "Charmer's Tiara", ITEMID_GOLDCOIN_SID, true)           --epic
shopModule:addBuyableItem({ '' }, 5468, epicMultiplier * 20000, 1, "Fire Bug", ITEMID_GOLDCOIN_SID, true)                  --epic
shopModule:addBuyableItem({ '' }, 5803, epicMultiplier * 40000, 1, "Arbalest", ITEMID_GOLDCOIN_SID, true)                  --epic

shopModule:addBuyableItem({ '' }, 7389, epicMultiplier * 40000, 1, "Heroic Axe", ITEMID_GOLDCOIN_SID, true)                --epic
shopModule:addBuyableItem({ '' }, 7415, epicMultiplier * 40000, 1, "Cranial Basher", ITEMID_GOLDCOIN_SID, true)            --epic
shopModule:addBuyableItem({ '' }, 7422, epicMultiplier * 30000, 1, "Jade Hammer", ITEMID_GOLDCOIN_SID, true)               --epic
shopModule:addBuyableItem({ '' }, 7429, epicMultiplier * 40000, 1, "Blessed Sceptre", ITEMID_GOLDCOIN_SID, true)           --epic
shopModule:addBuyableItem({ '' }, 7434, epicMultiplier * 40000, 1, "Royal Axe", ITEMID_GOLDCOIN_SID, true)                 --epic
shopModule:addBuyableItem({ '' }, 7452, epicMultiplier * 30000, 1, "Spiked Squelcher", ITEMID_GOLDCOIN_SID, true)          --epic
shopModule:addBuyableItem({ '' }, 7456, epicMultiplier * 20000, 1, "Noble Axe", ITEMID_GOLDCOIN_SID, true)                 --epic
shopModule:addBuyableItem({ '' }, 7730, epicMultiplier * 20000, 1, "Blue Legs", ITEMID_GOLDCOIN_SID, true)                 --epic
--shopModule:addBuyableItem({ '' }, 7884, epicMultiplier * 100000, 1, "Terra Mantle", ITEMID_GOLDCOIN_SID, true)             --epic
--shopModule:addBuyableItem({ '' }, 7897, epicMultiplier * 100000, 1, "Glacier Robe", ITEMID_GOLDCOIN_SID, true)             --epic
--shopModule:addBuyableItem({ '' }, 7898, epicMultiplier * 100000, 1, "Lightning Robe", ITEMID_GOLDCOIN_SID, true)           --epic
--shopModule:addBuyableItem({ '' }, 7899, epicMultiplier * 100000, 1, "Magma Coat", ITEMID_GOLDCOIN_SID, true)               --epic
shopModule:addBuyableItem({ '' }, 8871, epicMultiplier * 30000, 1, "Focus Cape", ITEMID_GOLDCOIN_SID, true)                --epic
shopModule:addBuyableItem({ '' }, 8918, epicMultiplier * 20000, 1, "Spellbook Of Dark Mysteries", ITEMID_GOLDCOIN_SID,
    true)                                                                                                                  --epic
shopModule:addBuyableItem({ '' }, 8920, epicMultiplier * 30000, 1, "Wand Of Starstorm", ITEMID_GOLDCOIN_SID, true)         --epic
shopModule:addBuyableItem({ '' }, 2079, epicMultiplier * 40000, 1, "War Horn", ITEMID_GOLDCOIN_SID, true)                  --epic
shopModule:addBuyableItem({ '' }, 12613, epicMultiplier * 30000, 1, "Twiceslicer", ITEMID_GOLDCOIN_SID, true)              --epic
shopModule:addBuyableItem({ '' }, 15643, epicMultiplier * 20000, 1, "Hive Bow", ITEMID_GOLDCOIN_SID, true)                 --epic
shopModule:addBuyableItem({ '' }, 24181, epicMultiplier * 20000, 1, "Orb Of Life Everchanging", ITEMID_GOLDCOIN_SID, true) --epic


shopModule:addBuyableItem({ '' }, 2643, basicMultiplier * 600, 1, "Leather Boots", ITEMID_GOLDCOIN_SID, true)                                                                              --basic

shopModule:addBuyableItem({ '' }, 2195, epicMultiplier * 150000, 1, "Boots Of Haste", ITEMID_GOLDCOIN_SID, true)                                                                           --epic
shopModule:addBuyableItem({ '' }, 2645, epicMultiplier * 150000, 1, "Steel Boots", ITEMID_GOLDCOIN_SID, true)                                                                              --epic
shopModule:addBuyableItem({ '' }, 24742, epicMultiplier * 150000, 1, "Badger Boots", ITEMID_GOLDCOIN_SID, true)                                                                            --epic
shopModule:addBuyableItem({ '' }, 25429, epicMultiplier * 150000, 1, "Magic Shoes", ITEMID_GOLDCOIN_SID, true)                                                                             --epic
shopModule:addBuyableItem({ '' }, 26133, epicMultiplier * 150000, 1, "Void Boots", ITEMID_GOLDCOIN_SID, true)                                                                              --epic
shopModule:addBuyableItem({ '' }, 6132, epicMultiplier * 150000, 1, "Soft Boots", ITEMID_GOLDCOIN_SID, true)                                                                               --epic

shopModule:addBuildableItem({ itemName = "Boots Of Haste L", build = { { itemName = "Boots Of Haste Token", count = 30 }, { itemName = "Boots Of Haste", count = 1, fusionLevel = 4 } } }) --legendary
shopModule:addBuildableItem({ itemName = "Steel Boots L", build = { { itemName = "Steel Boots Token", count = 30 }, { itemName = "Steel Boots", count = 1, fusionLevel = 4 } } })          --legendary
shopModule:addBuildableItem({ itemName = "Badger Boots L", build = { { itemName = "Badger Boots Token", count = 30 }, { itemName = "Badger Boots", count = 1, fusionLevel = 4 } } })       --legendary
shopModule:addBuildableItem({ itemName = "Magic Shoes L", build = { { itemName = "Magic Shoes Token", count = 30 }, { itemName = "Magic Shoes", count = 1, fusionLevel = 4 } } })          --legendary
shopModule:addBuildableItem({ itemName = "Void Boots L", build = { { itemName = "Void Boots Token", count = 30 }, { itemName = "Void Boots", count = 1, fusionLevel = 4 } } })             --legendary
shopModule:addBuildableItem({ itemName = "Soft Boots L", build = { { itemName = "Soft Boots Token", count = 30 }, { itemName = "Soft Boots", count = 1, fusionLevel = 4 } } })             --legendary


--START LEGENDARY
shopModule:addBuildableItem({ itemName = "Arcane Staff", build = { { itemName = "Heaven Blossom", count = 30 }, { itemName = "shiny dust", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Backpack of Holding", build = { { itemName = "Backpack of Holding Token", count = 30 }, { itemName = "stranger powder", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Bonebreaker", build = { { itemName = "bonebreaker token", count = 30 }, { itemName = "Iron Ore", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Demon Armor", build = { { itemName = "Demon Armor Token", count = 30 }, { itemName = "Iron Ore", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Demon Helmet", build = { { itemName = "Demon Helmet Token", count = 30 }, { itemName = "Iron Ore", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Demonrage Sword", build = { { itemName = "demonrage sword token", count = 30 }, { itemName = "grim Potion", count = 100 } } })
--shopModule:addBuildableItem({ itemName = "Divine Plate", build = { { itemName = "divine plate token", count = 30 }, { itemName = "Iron Ore", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Dragon Scale Legs", build = { { itemName = "Green Dragon Scale", count = 30 }, { itemName = "Iron Ore", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Dragon Scale Mail", build = { { itemName = "Dragon Scale Mail Token", count = 30 }, { itemName = "Iron Ore", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Eternal Flames", build = { { itemName = "eternal flames token", count = 30 }, { itemName = "shiny dust", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Ferumbras Hat", build = { { itemName = "Warlock Beard", count = 30 }, { itemName = "shiny dust", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Fireborn Giant Armor", build = { { itemName = "Fireborn Giant Armor Token", count = 30 }, { itemName = "Iron Ore", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Frozen Shield", build = { { itemName = "Shard", count = 30 }, { itemName = "Iron Ore", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Hailstorm Rod", build = { { itemName = "Hailstorm Rod Token", count = 30 }, { itemName = "shiny dust", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Hellforged Axe", build = { { itemName = "Hellforged Axe Token", count = 30 }, { itemName = "grim Potion", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Helmet of the Ancients", build = { { itemName = "Helmet of the Ancients Token", count = 30 }, { itemName = "grim Potion", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Holy Falcon", build = { { itemName = "Holy Falcon Token", count = 30 }, { itemName = "shiny dust", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Holy Scarab", build = { { itemName = "Holy Scarab Token", count = 30 }, { itemName = "shiny dust", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Kraken Slayer", build = { { itemName = "Kraken Slayer Token", count = 30 }, { itemName = "grim Potion", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Magic Plate Armor", build = { { itemName = "Magic Plate Armor Token", count = 30 }, { itemName = "Iron Ore", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Magic Sword", build = { { itemName = "Hydra Head", count = 30 }, { itemName = "grim Potion", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Mandrake", build = { { itemName = "mandrake token", count = 30 }, { itemName = "shiny dust", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Mastermind Shield", build = { { itemName = "Mastermind Shield Token", count = 30 }, { itemName = "Iron Ore", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Oceanborn Leviathan Armor", build = { { itemName = "oceanborn leviathan armor token", count = 30 }, { itemName = "Iron Ore", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Ornate Crossbow", build = { { itemName = "ornate crossbow token", count = 30 }, { itemName = "grim Potion", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Queens Sceptre", build = { { itemName = "Soul Stone", count = 30 }, { itemName = "shiny dust", count = 100 } } })
--shopModule:addBuildableItem({ itemName = "Robe Of The Underworld", build = { { itemName = "robe of the underworld token", count = 30 }, { itemName = "stranger powder", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Royal Crossbow", build = { { itemName = "Blue Note", count = 30 }, { itemName = "grim Potion", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Solar Axe", build = { { itemName = "solar axe token", count = 30 }, { itemName = "grim Potion", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Spellbook of Ancient Arcana", build = { { itemName = "spellbook of ancient arcana token", count = 30 }, { itemName = "shiny dust", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Spellweaver's Robe", build = { { itemName = "Spider Silk", count = 30 }, { itemName = "shiny dust", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Stonecutter Axe", build = { { itemName = "Perfect Behemoth Fang", count = 30 }, { itemName = "grim Potion", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Stormsurge", build = { { itemName = "Stormsurge Token", count = 30 }, { itemName = "shiny dust", count = 100 } } })
shopModule:addBuildableItem({ itemName = "The Lion Heart", build = { { itemName = "The Lion Heart Token", count = 30 }, { itemName = "grim Potion", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Thunder Hammer", build = { { itemName = "thunder hammer token", count = 30 }, { itemName = "grim Potion", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Tiara of Power", build = { { itemName = "Tiara of Power Token", count = 30 }, { itemName = "shiny dust", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Torment Ring", build = { { itemName = "Torment Ring Token", count = 30 }, { itemName = "shiny dust", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Voltage Armor", build = { { itemName = "Voltage Armor Token", count = 30 }, { itemName = "Iron Ore", count = 100 } } })
shopModule:addBuildableItem({ itemName = "Warlord Sword", build = { { itemName = "Piece of Royal Steel", count = 30 }, { itemName = "grim Potion", count = 100 } } })


local function onBuyCallback(cid, itemid, subType, amount, ignoreCap, inBackpacks)
    local player = Player(cid)
    player:addStorageKeyValue("medalofvalor_buy_equip_main", 1)
    --se é item epic
    if ItemType(itemid):getTier() == 3 then
        player:addStorageKeyValue("medalofvalor_buy_epic_equip", 1)
    elseif ItemType(itemid):getTier() == 4 then
        player:addStorageKeyValue("medalofvalor_buy_legendary_equip", 1)
    end

    if itemid == 2173 then
        player:addStorageKeyValue("medalofvalor_buy_amuletofloss", 1)
    elseif itemid == 18402 then
        player:addStorageKeyValue("medalofvalor_buy_guardian_necklace", 1)
    end

    -- Telemetria agora é rastreada automaticamente pelo ShopModule
    return true
end

--END LEGENDARY
local function greetCallback(cid)
    npcHandler:addFocus(cid)
    npcHandler:setMaxIdleTime(60 * 15) --tempo para fechar o chat
    ShopModule.requestTrade(cid, "", "", { module = shopModule })
    return true
end

local focusModule = FocusModule:new()
focusModule:addGreetMessage({ 'hi baldur' })

npcHandler:addModule(focusModule)
npcHandler:setCallback(CALLBACK_GREET, greetCallback)
npcHandler:setCallback(CALLBACK_ONBUY, onBuyCallback)
npcHandler:setCallback(CALLBACK_MESSAGE_DEFAULT, creatureSayCallback)
npcHandler:setCallback(CALLBACK_ONBUY, onBuyCallback)
