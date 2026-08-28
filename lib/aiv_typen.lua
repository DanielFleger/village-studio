--[[
  AIV-Typnummern mit Namen, plus Bruecke zu den Laufzeit-Typen.

  Es gibt DREI Nummernsaetze fuer Gebaeude, die man leicht verwechselt:
    1. AIV-Typ      - steht in der .aiv-Datei (Abschnitt 2007) und im
                      Bauliste-Eintrag bei +0x3A. Quelle:
                      BUILDING_TYPE_AIV_FILES_KV in sourcehold/tool/convert/aiv/info.py
    2. Laufzeit-Typ - Platz in der Update-Sprungtabelle 0x5B79A8.
                      Gleich sourcehold/data/shc.py (BuildingType).
    3. Mapper-Typ   - nur im Karteneditor-Format, hier ohne Bedeutung.

  Die AIV-Namen sind gegen die gemessenen Grundflaechen aller 18 Doerfer
  geprueft: 59 benutzte Nummern, keine Abweichung.
  Erzeugt von _baue_lua_tabelle.js im Village-Studio-Projekt.
]]--

local M = {}

-- AIV-Typ -> { name, breite, hoehe, art }
M.AIV = {
  [1] = { name = "Kartenrand", art = "sonstiges" },
  [2] = { name = "Bauflaeche", art = "sonstiges" },
  [10] = { name = "Steinmauer", b = 1, h = 1, art = "mauer" },
  [11] = { name = "Niedrige Mauer", b = 1, h = 1, art = "mauer" },
  [12] = { name = "Zinnenmauer hoch", b = 1, h = 1, art = "mauer" },
  [13] = { name = "Zinnenmauer niedrig", b = 1, h = 1, art = "mauer" },
  [14] = { name = "Treppe 1", b = 1, h = 1, art = "mauer" },
  [15] = { name = "Treppe 2", b = 1, h = 1, art = "mauer" },
  [16] = { name = "Treppe 3", b = 1, h = 1, art = "mauer" },
  [17] = { name = "Treppe 4", b = 1, h = 1, art = "mauer" },
  [18] = { name = "Treppe 5", b = 1, h = 1, art = "mauer" },
  [19] = { name = "Treppe 6", b = 1, h = 1, art = "mauer" },
  [20] = { name = "Wassergraben a", b = 1, h = 1, art = "graben" },
  [21] = { name = "Wassergraben b", b = 1, h = 1, art = "graben" },
  [22] = { name = "Wassergraben c", b = 1, h = 1, art = "graben" },
  [23] = { name = "Wassergraben d", b = 1, h = 1, art = "graben" },
  [24] = { name = "Pechgraben", b = 1, h = 1, art = "graben" },
  [25] = { name = "unbenutzt", b = 1, h = 1, art = "sonstiges" },
  [30] = { name = "Wachturm", b = 3, h = 3, art = "turm" },
  [31] = { name = "Verteidigungsturm", b = 4, h = 4, art = "turm" },
  [32] = { name = "Geschuetzturm", b = 5, h = 5, art = "turm" },
  [33] = { name = "Eckiger Turm", b = 6, h = 6, art = "turm" },
  [34] = { name = "Runder Turm", b = 6, h = 6, art = "turm" },
  [35] = { name = "Oelbrennerei", b = 4, h = 4, art = "waffen" },
  [36] = { name = "Hundezwinger", b = 3, h = 3, art = "angst" },
  [37] = { name = "Fallgrube", b = 1, h = 1, art = "graben" },
  [38] = { name = "Bergfried", b = 7, h = 7, art = "burg" },
  [39] = { name = "Soeldnerposten", b = 5, h = 5, art = "militaer" },
  [40] = { name = "Kleines Torhaus (O-W)", b = 5, h = 5, art = "burg" },
  [41] = { name = "Kleines Torhaus (N-S)", b = 5, h = 5, art = "burg" },
  [42] = { name = "Grosses Torhaus (O-W)", b = 7, h = 7, art = "burg" },
  [43] = { name = "Grosses Torhaus (N-S)", b = 7, h = 7, art = "burg" },
  [44] = { name = "Zugbruecke", b = 5, h = 5, art = "burg" },
  [50] = { name = "Stangendreher", b = 4, h = 4, art = "waffen" },
  [51] = { name = "Bogenmacher", b = 4, h = 4, art = "waffen" },
  [52] = { name = "Schmiede", b = 4, h = 4, art = "waffen" },
  [53] = { name = "Gerberei", b = 4, h = 4, art = "waffen" },
  [54] = { name = "Ruestungsschmied", b = 4, h = 4, art = "waffen" },
  [55] = { name = "Kaserne", b = 5, h = 5, art = "militaer" },
  [56] = { name = "Waffenlager", b = 4, h = 4, art = "militaer" },
  [57] = { name = "Ingenieursgilde", b = 5, h = 5, art = "militaer" },
  [58] = { name = "Tunnelgraebergilde", b = 5, h = 5, art = "militaer" },
  [59] = { name = "Stall", b = 6, h = 6, art = "militaer" },
  [60] = { name = "Lagerplatz", b = 5, h = 5, art = "wirtschaft" },
  [61] = { name = "Holzfaellerhuette", b = 3, h = 3, art = "wirtschaft" },
  [62] = { name = "Steinbruch", b = 6, h = 6, art = "wirtschaft" },
  [63] = { name = "Ochsenkarren", b = 2, h = 2, art = "wirtschaft" },
  [64] = { name = "Eisenmine", b = 4, h = 4, art = "wirtschaft" },
  [65] = { name = "Pechgraeber", b = 4, h = 4, art = "wirtschaft" },
  [66] = { name = "Marktplatz", b = 5, h = 5, art = "wirtschaft" },
  [70] = { name = "Kornspeicher", b = 4, h = 4, art = "nahrung" },
  [71] = { name = "Apfelplantage", b = 10, h = 10, art = "nahrung" },
  [72] = { name = "Milchviehhof", b = 10, h = 10, art = "nahrung" },
  [73] = { name = "Getreidefarm", b = 9, h = 9, art = "nahrung" },
  [74] = { name = "Jaegerhuette", b = 3, h = 3, art = "nahrung" },
  [75] = { name = "Hopfenfarm", b = 9, h = 9, art = "nahrung" },
  [76] = { name = "Muehle", b = 3, h = 3, art = "nahrung" },
  [77] = { name = "Baeckerei", b = 4, h = 4, art = "nahrung" },
  [78] = { name = "Brauerei", b = 4, h = 4, art = "nahrung" },
  [79] = { name = "Wirtshaus", b = 5, h = 5, art = "nahrung" },
  [80] = { name = "Huette", b = 4, h = 4, art = "wohnen" },
  [81] = { name = "Kapelle", b = 6, h = 6, art = "religion" },
  [82] = { name = "Kirche", b = 9, h = 9, art = "religion" },
  [83] = { name = "Kathedrale", b = 13, h = 13, art = "religion" },
  [84] = { name = "Apotheke", b = 6, h = 6, art = "wohnen" },
  [85] = { name = "Brunnen", b = 3, h = 3, art = "wohnen" },
  [86] = { name = "Wasserfass", b = 4, h = 4, art = "wohnen" },
  [90] = { name = "Maibaum", b = 3, h = 3, art = "freude" },
  [91] = { name = "Tanzbaer", b = 5, h = 5, art = "freude" },
  [92] = { name = "Statue", b = 2, h = 2, art = "freude" },
  [93] = { name = "Schrein", b = 2, h = 2, art = "freude" },
  [94] = { name = "Stadtgarten", b = 4, h = 4, art = "freude" },
  [95] = { name = "Garten", b = 3, h = 3, art = "freude" },
  [96] = { name = "Teich", b = 3, h = 3, art = "freude" },
  [97] = { name = "Grosser Teich", b = 5, h = 5, art = "freude" },
  [100] = { name = "Galgen", b = 2, h = 2, art = "angst" },
  [101] = { name = "Jauchegrube", b = 5, h = 5, art = "angst" },
  [102] = { name = "Pranger", b = 3, h = 3, art = "angst" },
  [103] = { name = "Scheiterhaufen", b = 3, h = 3, art = "angst" },
  [104] = { name = "Verlies", b = 5, h = 5, art = "angst" },
  [105] = { name = "Streckbank", b = 3, h = 3, art = "angst" },
  [106] = { name = "Haengekaefig", b = 2, h = 2, art = "angst" },
  [107] = { name = "Richtblock", b = 3, h = 3, art = "angst" },
  [108] = { name = "Tauchstuhl", b = 5, h = 5, art = "angst" },
}

-- Laufzeit-Typ (Platz in 0x5B79A8) -> Kurzname
M.LAUFZEIT = {
  [1] = "hovel",
  [2] = "house",
  [3] = "woodcuttershut",
  [4] = "oxtether",
  [5] = "ironmine",
  [6] = "pitchrig",
  [7] = "huntershut",
  [8] = "mercenarypost",
  [9] = "barracks",
  [10] = "stockpile",
  [11] = "armory",
  [12] = "fletcher",
  [13] = "blacksmith",
  [14] = "poleturner",
  [15] = "armourer",
  [16] = "tanner",
  [17] = "bakery",
  [18] = "brewery",
  [19] = "granary",
  [20] = "quarry",
  [21] = "quarrypile",
  [22] = "inn",
  [23] = "apothecary",
  [24] = "engineerguild",
  [25] = "tunnelerguild",
  [26] = "marketplace",
  [27] = "well",
  [28] = "oilsmelter",
  [29] = "siege_tent",
  [30] = "wheat_farm",
  [31] = "hop_farm",
  [32] = "apple_farm",
  [33] = "dairy_farm",
  [34] = "mill",
  [35] = "stables",
  [36] = "chapel",
  [37] = "church",
  [38] = "cathedral",
  [40] = "manorhouse",
  [41] = "stonekeep",
  [42] = "stronghold",
  [43] = "keep_four",
  [44] = "keep_five",
  [45] = "large_gatehouse",
  [46] = "small_gatehouse",
  [47] = "wood_gate",
  [48] = "wood_postern",
  [49] = "drawbridge",
  [50] = "tunnel",
  [60] = "gatehouse",
  [61] = "tower",
  [62] = "gallows",
  [63] = "stocks",
  [64] = "witch_hoist",
  [65] = "maypole",
  [66] = "garden",
  [67] = "killingpit",
  [68] = "pitchditch",
  [70] = "waterpot",
  [71] = "keepdoor_left",
  [72] = "keepdoor_right",
  [73] = "keepdoor",
  [74] = "tower_one",
  [75] = "tower_two",
  [76] = "tower_three",
  [77] = "tower_four",
  [78] = "tower_five",
  [91] = "cesspit",
  [92] = "burningstake",
  [93] = "gibbet",
  [94] = "dungeon",
  [95] = "stretchingrack",
  [96] = "rackflogging",
  [97] = "choppingblock",
  [98] = "dunkingstool",
  [99] = "dogcage",
  [100] = "statue",
  [101] = "shrine",
  [102] = "beehive",
  [103] = "dancingbear",
  [104] = "pond",
  [105] = "bearcave",
}

-- AIV-Typ -> Laufzeit-Typ. Ueber die Bedeutung zugeordnet.
-- Was fehlt, ist offen und nicht geraten - siehe M.OFFEN.
M.AIV_ZU_LAUFZEIT = {
  [24] = 68,   -- Pechgraben = pitchditch
  [30] = 74,   -- Wachturm = tower_one
  [31] = 75,   -- Verteidigungsturm = tower_two
  [32] = 76,   -- Geschuetzturm = tower_three
  [33] = 77,   -- Eckiger Turm = tower_four
  [34] = 78,   -- Runder Turm = tower_five
  [35] = 28,   -- Oelbrennerei = oilsmelter
  [36] = 99,   -- Hundezwinger = dogcage
  [37] = 67,   -- Fallgrube = killingpit
  [38] = 41,   -- Bergfried = stonekeep
  [39] = 8,   -- Soeldnerposten = mercenarypost
  [40] = 46,   -- Kleines Torhaus (O-W) = small_gatehouse
  [41] = 46,   -- Kleines Torhaus (N-S) = small_gatehouse
  [42] = 45,   -- Grosses Torhaus (O-W) = large_gatehouse
  [43] = 45,   -- Grosses Torhaus (N-S) = large_gatehouse
  [44] = 49,   -- Zugbruecke = drawbridge
  [50] = 14,   -- Stangendreher = poleturner
  [51] = 12,   -- Bogenmacher = fletcher
  [52] = 13,   -- Schmiede = blacksmith
  [53] = 16,   -- Gerberei = tanner
  [54] = 15,   -- Ruestungsschmied = armourer
  [55] = 9,   -- Kaserne = barracks
  [56] = 11,   -- Waffenlager = armory
  [57] = 24,   -- Ingenieursgilde = engineerguild
  [58] = 25,   -- Tunnelgraebergilde = tunnelerguild
  [59] = 35,   -- Stall = stables
  [60] = 10,   -- Lagerplatz = stockpile
  [61] = 3,   -- Holzfaellerhuette = woodcuttershut
  [62] = 20,   -- Steinbruch = quarry
  [63] = 4,   -- Ochsenkarren = oxtether
  [64] = 5,   -- Eisenmine = ironmine
  [65] = 6,   -- Pechgraeber = pitchrig
  [66] = 26,   -- Marktplatz = marketplace
  [70] = 19,   -- Kornspeicher = granary
  [71] = 32,   -- Apfelplantage = apple_farm
  [72] = 33,   -- Milchviehhof = dairy_farm
  [73] = 30,   -- Getreidefarm = wheat_farm
  [74] = 7,   -- Jaegerhuette = huntershut
  [75] = 31,   -- Hopfenfarm = hop_farm
  [76] = 34,   -- Muehle = mill
  [77] = 17,   -- Baeckerei = bakery
  [78] = 18,   -- Brauerei = brewery
  [79] = 22,   -- Wirtshaus = inn
  [80] = 1,   -- Huette = hovel
  [81] = 36,   -- Kapelle = chapel
  [82] = 37,   -- Kirche = church
  [83] = 38,   -- Kathedrale = cathedral
  [84] = 23,   -- Apotheke = apothecary
  [85] = 27,   -- Brunnen = well
  [86] = 70,   -- Wasserfass = waterpot
  [90] = 65,   -- Maibaum = maypole
  [91] = 103,   -- Tanzbaer = dancingbear
  [92] = 100,   -- Statue = statue
  [93] = 101,   -- Schrein = shrine
  [94] = 66,   -- Stadtgarten = garden
  [95] = 66,   -- Garten = garden
  [96] = 104,   -- Teich = pond
  [97] = 104,   -- Grosser Teich = pond
  [100] = 62,   -- Galgen = gallows
  [101] = 91,   -- Jauchegrube = cesspit
  [102] = 63,   -- Pranger = stocks
  [103] = 92,   -- Scheiterhaufen = burningstake
  [104] = 94,   -- Verlies = dungeon
  [105] = 95,   -- Streckbank = stretchingrack
  [106] = 93,   -- Haengekaefig = gibbet
  [107] = 97,   -- Richtblock = choppingblock
  [108] = 98,   -- Tauchstuhl = dunkingstool
}

-- AIV-Typen ohne sichere Entsprechung im Laufzeitsatz
M.OFFEN = { [10] = "Steinmauer", [11] = "Niedrige Mauer", [12] = "Zinnenmauer hoch", [13] = "Zinnenmauer niedrig", [14] = "Treppe 1", [15] = "Treppe 2", [16] = "Treppe 3", [17] = "Treppe 4", [18] = "Treppe 5", [19] = "Treppe 6", [20] = "Wassergraben a", [21] = "Wassergraben b", [22] = "Wassergraben c", [23] = "Wassergraben d" }

return M
