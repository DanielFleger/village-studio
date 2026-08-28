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

-- AIV-Typ -> { name, breite, hoehe, art, mapper, laufzeit }
-- mapper   = was im Speicher in AIVBuildingStep.buildingType steht
-- laufzeit = Platz in der Sprungtabelle 0x5B79A8, den destroyBuilding braucht
M.AIV = {
  [1] = { name = "Kartenrand", art = "sonstiges" },
  [2] = { name = "Bauflaeche", art = "sonstiges" },
  [10] = { name = "Steinmauer", b = 1, h = 1, mapper = 25, art = "mauer" },
  [11] = { name = "Niedrige Mauer", b = 1, h = 1, mapper = 46, art = "mauer" },
  [12] = { name = "Zinnenmauer hoch", b = 1, h = 1, mapper = 26, art = "mauer" },
  [13] = { name = "Zinnenmauer niedrig", b = 1, h = 1, mapper = 35, art = "mauer" },
  [14] = { name = "Treppe 1", b = 1, h = 1, mapper = 181, art = "mauer" },
  [15] = { name = "Treppe 2", b = 1, h = 1, mapper = 182, art = "mauer" },
  [16] = { name = "Treppe 3", b = 1, h = 1, mapper = 183, art = "mauer" },
  [17] = { name = "Treppe 4", b = 1, h = 1, mapper = 184, art = "mauer" },
  [18] = { name = "Treppe 5", b = 1, h = 1, mapper = 185, art = "mauer" },
  [19] = { name = "Treppe 6", b = 1, h = 1, mapper = 186, art = "mauer" },
  [20] = { name = "Wassergraben a", b = 1, h = 1, mapper = 106, art = "graben" },
  [21] = { name = "Wassergraben b", b = 1, h = 1, mapper = 106, art = "graben" },
  [22] = { name = "Wassergraben c", b = 1, h = 1, mapper = 106, art = "graben" },
  [23] = { name = "Wassergraben d", b = 1, h = 1, mapper = 106, art = "graben" },
  [24] = { name = "Pechgraben", b = 1, h = 1, mapper = 99, laufzeit = 68, art = "graben" },
  [25] = { name = "unbenutzt", b = 1, h = 1, art = "sonstiges" },
  [30] = { name = "Wachturm", b = 3, h = 3, mapper = 110, laufzeit = 74, art = "turm" },
  [31] = { name = "Verteidigungsturm", b = 4, h = 4, mapper = 111, laufzeit = 75, art = "turm" },
  [32] = { name = "Geschuetzturm", b = 5, h = 5, mapper = 112, laufzeit = 76, art = "turm" },
  [33] = { name = "Eckiger Turm", b = 6, h = 6, mapper = 113, laufzeit = 77, art = "turm" },
  [34] = { name = "Runder Turm", b = 6, h = 6, mapper = 114, laufzeit = 78, art = "turm" },
  [35] = { name = "Oelbrennerei", b = 4, h = 4, mapper = 180, laufzeit = 28, art = "waffen" },
  [36] = { name = "Hundezwinger", b = 3, h = 3, mapper = 312, laufzeit = 99, art = "angst" },
  [37] = { name = "Fallgrube", b = 1, h = 1, mapper = 98, laufzeit = 67, art = "graben" },
  [38] = { name = "Bergfried", b = 7, h = 7, mapper = 61, laufzeit = 41, art = "burg" },
  [39] = { name = "Soeldnerposten", b = 5, h = 5, mapper = 86, laufzeit = 8, art = "militaer" },
  [40] = { name = "Kleines Torhaus (O-W)", b = 5, h = 5, mapper = 144, laufzeit = 46, art = "burg" },
  [41] = { name = "Kleines Torhaus (N-S)", b = 5, h = 5, mapper = 145, laufzeit = 46, art = "burg" },
  [42] = { name = "Grosses Torhaus (O-W)", b = 7, h = 7, mapper = 146, laufzeit = 45, art = "burg" },
  [43] = { name = "Grosses Torhaus (N-S)", b = 7, h = 7, mapper = 147, laufzeit = 45, art = "burg" },
  [44] = { name = "Zugbruecke", b = 5, h = 5, mapper = 105, laufzeit = 49, art = "burg" },
  [50] = { name = "Stangendreher", b = 4, h = 4, mapper = 82, laufzeit = 14, art = "waffen" },
  [51] = { name = "Bogenmacher", b = 4, h = 4, mapper = 50, laufzeit = 12, art = "waffen" },
  [52] = { name = "Schmiede", b = 4, h = 4, mapper = 83, laufzeit = 13, art = "waffen" },
  [53] = { name = "Gerberei", b = 4, h = 4, mapper = 85, laufzeit = 16, art = "waffen" },
  [54] = { name = "Ruestungsschmied", b = 4, h = 4, mapper = 84, laufzeit = 15, art = "waffen" },
  [55] = { name = "Kaserne", b = 5, h = 5, mapper = 87, laufzeit = 9, art = "militaer" },
  [56] = { name = "Waffenlager", b = 4, h = 4, mapper = 81, laufzeit = 11, art = "militaer" },
  [57] = { name = "Ingenieursgilde", b = 5, h = 5, mapper = 88, laufzeit = 24, art = "militaer" },
  [58] = { name = "Tunnelgraebergilde", b = 5, h = 5, mapper = 89, laufzeit = 25, art = "militaer" },
  [59] = { name = "Stall", b = 6, h = 6, mapper = 65, laufzeit = 35, art = "militaer" },
  [60] = { name = "Lagerplatz", b = 5, h = 5, mapper = 52, laufzeit = 10, art = "wirtschaft" },
  [61] = { name = "Holzfaellerhuette", b = 3, h = 3, mapper = 51, laufzeit = 3, art = "wirtschaft" },
  [62] = { name = "Steinbruch", b = 6, h = 6, mapper = 56, laufzeit = 20, art = "wirtschaft" },
  [63] = { name = "Ochsenkarren", b = 2, h = 2, mapper = 55, laufzeit = 4, art = "wirtschaft" },
  [64] = { name = "Eisenmine", b = 4, h = 4, mapper = 90, laufzeit = 5, art = "wirtschaft" },
  [65] = { name = "Pechgraeber", b = 4, h = 4, mapper = 91, laufzeit = 6, art = "wirtschaft" },
  [66] = { name = "Marktplatz", b = 5, h = 5, mapper = 77, laufzeit = 26, art = "wirtschaft" },
  [70] = { name = "Kornspeicher", b = 4, h = 4, mapper = 80, laufzeit = 19, art = "nahrung" },
  [71] = { name = "Apfelplantage", b = 10, h = 10, mapper = 72, laufzeit = 32, art = "nahrung" },
  [72] = { name = "Milchviehhof", b = 10, h = 10, mapper = 73, laufzeit = 33, art = "nahrung" },
  [73] = { name = "Getreidefarm", b = 9, h = 9, mapper = 70, laufzeit = 30, art = "nahrung" },
  [74] = { name = "Jaegerhuette", b = 3, h = 3, mapper = 78, laufzeit = 7, art = "nahrung" },
  [75] = { name = "Hopfenfarm", b = 9, h = 9, mapper = 71, laufzeit = 31, art = "nahrung" },
  [76] = { name = "Muehle", b = 3, h = 3, mapper = 74, laufzeit = 34, art = "nahrung" },
  [77] = { name = "Baeckerei", b = 4, h = 4, mapper = 75, laufzeit = 17, art = "nahrung" },
  [78] = { name = "Brauerei", b = 4, h = 4, mapper = 76, laufzeit = 18, art = "nahrung" },
  [79] = { name = "Wirtshaus", b = 5, h = 5, mapper = 92, laufzeit = 22, art = "nahrung" },
  [80] = { name = "Huette", b = 4, h = 4, mapper = 54, laufzeit = 1, art = "wohnen" },
  [81] = { name = "Kapelle", b = 6, h = 6, mapper = 95, laufzeit = 36, art = "religion" },
  [82] = { name = "Kirche", b = 9, h = 9, mapper = 96, laufzeit = 37, art = "religion" },
  [83] = { name = "Kathedrale", b = 13, h = 13, mapper = 97, laufzeit = 38, art = "religion" },
  [84] = { name = "Apotheke", b = 6, h = 6, mapper = 93, laufzeit = 23, art = "wohnen" },
  [85] = { name = "Brunnen", b = 3, h = 3, mapper = 330, laufzeit = 27, art = "wohnen" },
  [86] = { name = "Wasserfass", b = 4, h = 4, mapper = 342, laufzeit = 70, art = "wohnen" },
  [90] = { name = "Maibaum", b = 3, h = 3, mapper = 175, laufzeit = 65, art = "freude" },
  [91] = { name = "Tanzbaer", b = 5, h = 5, mapper = 324, laufzeit = 103, art = "freude" },
  [92] = { name = "Statue", b = 2, h = 2, mapper = 313, laufzeit = 100, art = "freude" },
  [93] = { name = "Schrein", b = 2, h = 2, mapper = 318, laufzeit = 101, art = "freude" },
  [94] = { name = "Stadtgarten", b = 4, h = 4, mapper = 169, laufzeit = 66, art = "freude" },
  [95] = { name = "Garten", b = 3, h = 3, mapper = 166, laufzeit = 66, art = "freude" },
  [96] = { name = "Teich", b = 3, h = 3, mapper = 325, laufzeit = 104, art = "freude" },
  [97] = { name = "Grosser Teich", b = 5, h = 5, mapper = 327, laufzeit = 104, art = "freude" },
  [100] = { name = "Galgen", b = 2, h = 2, mapper = 176, laufzeit = 62, art = "angst" },
  [101] = { name = "Jauchegrube", b = 5, h = 5, mapper = 301, laufzeit = 91, art = "angst" },
  [102] = { name = "Pranger", b = 3, h = 3, mapper = 177, laufzeit = 63, art = "angst" },
  [103] = { name = "Scheiterhaufen", b = 3, h = 3, mapper = 305, laufzeit = 92, art = "angst" },
  [104] = { name = "Verlies", b = 5, h = 5, mapper = 307, laufzeit = 94, art = "angst" },
  [105] = { name = "Streckbank", b = 3, h = 3, mapper = 308, laufzeit = 95, art = "angst" },
  [106] = { name = "Haengekaefig", b = 2, h = 2, mapper = 306, laufzeit = 93, art = "angst" },
  [107] = { name = "Richtblock", b = 3, h = 3, mapper = 310, laufzeit = 97, art = "angst" },
  [108] = { name = "Tauchstuhl", b = 5, h = 5, mapper = 311, laufzeit = 98, art = "angst" },
}

-- Mapper-Nummer -> AIV-Typ, fuer den Weg zurueck aus dem Speicher
M.MAPPER_ZU_AIV = {
  [25] = 10,   -- Steinmauer
  [46] = 11,   -- Niedrige Mauer
  [26] = 12,   -- Zinnenmauer hoch
  [35] = 13,   -- Zinnenmauer niedrig
  [181] = 14,   -- Treppe 1
  [182] = 15,   -- Treppe 2
  [183] = 16,   -- Treppe 3
  [184] = 17,   -- Treppe 4
  [185] = 18,   -- Treppe 5
  [186] = 19,   -- Treppe 6
  [106] = 20,   -- Wassergraben a
  [106] = 21,   -- Wassergraben b
  [106] = 22,   -- Wassergraben c
  [106] = 23,   -- Wassergraben d
  [99] = 24,   -- Pechgraben
  [110] = 30,   -- Wachturm
  [111] = 31,   -- Verteidigungsturm
  [112] = 32,   -- Geschuetzturm
  [113] = 33,   -- Eckiger Turm
  [114] = 34,   -- Runder Turm
  [180] = 35,   -- Oelbrennerei
  [312] = 36,   -- Hundezwinger
  [98] = 37,   -- Fallgrube
  [61] = 38,   -- Bergfried
  [86] = 39,   -- Soeldnerposten
  [144] = 40,   -- Kleines Torhaus (O-W)
  [145] = 41,   -- Kleines Torhaus (N-S)
  [146] = 42,   -- Grosses Torhaus (O-W)
  [147] = 43,   -- Grosses Torhaus (N-S)
  [105] = 44,   -- Zugbruecke
  [82] = 50,   -- Stangendreher
  [50] = 51,   -- Bogenmacher
  [83] = 52,   -- Schmiede
  [85] = 53,   -- Gerberei
  [84] = 54,   -- Ruestungsschmied
  [87] = 55,   -- Kaserne
  [81] = 56,   -- Waffenlager
  [88] = 57,   -- Ingenieursgilde
  [89] = 58,   -- Tunnelgraebergilde
  [65] = 59,   -- Stall
  [52] = 60,   -- Lagerplatz
  [51] = 61,   -- Holzfaellerhuette
  [56] = 62,   -- Steinbruch
  [55] = 63,   -- Ochsenkarren
  [90] = 64,   -- Eisenmine
  [91] = 65,   -- Pechgraeber
  [77] = 66,   -- Marktplatz
  [80] = 70,   -- Kornspeicher
  [72] = 71,   -- Apfelplantage
  [73] = 72,   -- Milchviehhof
  [70] = 73,   -- Getreidefarm
  [78] = 74,   -- Jaegerhuette
  [71] = 75,   -- Hopfenfarm
  [74] = 76,   -- Muehle
  [75] = 77,   -- Baeckerei
  [76] = 78,   -- Brauerei
  [92] = 79,   -- Wirtshaus
  [54] = 80,   -- Huette
  [95] = 81,   -- Kapelle
  [96] = 82,   -- Kirche
  [97] = 83,   -- Kathedrale
  [93] = 84,   -- Apotheke
  [330] = 85,   -- Brunnen
  [342] = 86,   -- Wasserfass
  [175] = 90,   -- Maibaum
  [324] = 91,   -- Tanzbaer
  [313] = 92,   -- Statue
  [318] = 93,   -- Schrein
  [169] = 94,   -- Stadtgarten
  [166] = 95,   -- Garten
  [325] = 96,   -- Teich
  [327] = 97,   -- Grosser Teich
  [176] = 100,   -- Galgen
  [301] = 101,   -- Jauchegrube
  [177] = 102,   -- Pranger
  [305] = 103,   -- Scheiterhaufen
  [307] = 104,   -- Verlies
  [308] = 105,   -- Streckbank
  [306] = 106,   -- Haengekaefig
  [310] = 107,   -- Richtblock
  [311] = 108,   -- Tauchstuhl
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

-- AIV-Typ -> Laufzeit-Typ (fuer destroyBuilding).
-- Was fehlt, ist offen und nicht geraten - siehe M.OFFEN.
M.AIV_ZU_LAUFZEIT = {
  [24] = 68,   -- Pechgraben = BT_PITCHDITCH
  [30] = 74,   -- Wachturm = BT_TOWER1
  [31] = 75,   -- Verteidigungsturm = BT_TOWER2
  [32] = 76,   -- Geschuetzturm = BT_TOWER3
  [33] = 77,   -- Eckiger Turm = BT_TOWER4
  [34] = 78,   -- Runder Turm = BT_TOWER5
  [35] = 28,   -- Oelbrennerei = BT_OILSMELTER
  [36] = 99,   -- Hundezwinger = BT_DOGCAGE
  [37] = 67,   -- Fallgrube = BT_KILLINGPIT
  [38] = 41,   -- Bergfried = BT_STONEKEEP
  [39] = 8,   -- Soeldnerposten = BT_MERCENARYPOST
  [40] = 46,   -- Kleines Torhaus (O-W) = BT_GATEHOUSESMALL
  [41] = 46,   -- Kleines Torhaus (N-S) = BT_GATEHOUSESMALL
  [42] = 45,   -- Grosses Torhaus (O-W) = BT_GATEHOUSELARGE
  [43] = 45,   -- Grosses Torhaus (N-S) = BT_GATEHOUSELARGE
  [44] = 49,   -- Zugbruecke = BT_DRAWBRIDGE
  [50] = 14,   -- Stangendreher = BT_POLETURNER
  [51] = 12,   -- Bogenmacher = BT_FLETCHER
  [52] = 13,   -- Schmiede = BT_BLACKSMITH
  [53] = 16,   -- Gerberei = BT_TANNER
  [54] = 15,   -- Ruestungsschmied = BT_ARMOURER
  [55] = 9,   -- Kaserne = BT_BARRACKS
  [56] = 11,   -- Waffenlager = BT_ARMORY
  [57] = 24,   -- Ingenieursgilde = BT_ENGINEERSGUILD
  [58] = 25,   -- Tunnelgraebergilde = BT_TUNNELERSGUILD
  [59] = 35,   -- Stall = BT_STABLES
  [60] = 10,   -- Lagerplatz = BT_STOCKPILE
  [61] = 3,   -- Holzfaellerhuette = BT_WOODCUTTERSHUT
  [62] = 20,   -- Steinbruch = BT_QUARRY
  [63] = 4,   -- Ochsenkarren = BT_OXTETHER
  [64] = 5,   -- Eisenmine = BT_IRONMINE
  [65] = 6,   -- Pechgraeber = BT_PITCHRIG
  [66] = 26,   -- Marktplatz = BT_MARKETPLACE
  [70] = 19,   -- Kornspeicher = BT_GRANARY
  [71] = 32,   -- Apfelplantage = BT_APPLEFARM
  [72] = 33,   -- Milchviehhof = BT_DAIRYFARM
  [73] = 30,   -- Getreidefarm = BT_WHEATFARM
  [74] = 7,   -- Jaegerhuette = BT_HUNTERSHUT
  [75] = 31,   -- Hopfenfarm = BT_HOPFARM
  [76] = 34,   -- Muehle = BT_MILL
  [77] = 17,   -- Baeckerei = BT_BAKERY
  [78] = 18,   -- Brauerei = BT_BREWERY
  [79] = 22,   -- Wirtshaus = BT_INN
  [80] = 1,   -- Huette = BT_HOVEL
  [81] = 36,   -- Kapelle = BT_CHAPEL
  [82] = 37,   -- Kirche = BT_CHURCH
  [83] = 38,   -- Kathedrale = BT_CATHEDRAL
  [84] = 23,   -- Apotheke = BT_APOTHECARY
  [85] = 27,   -- Brunnen = BT_WELL
  [86] = 70,   -- Wasserfass = BT_WATERPOT
  [90] = 65,   -- Maibaum = BT_MAYPOLE
  [91] = 103,   -- Tanzbaer = BT_DANCINGBEAR
  [92] = 100,   -- Statue = BT_STATUE
  [93] = 101,   -- Schrein = BT_SHRINE
  [94] = 66,   -- Stadtgarten = BT_GARDEN
  [95] = 66,   -- Garten = BT_GARDEN
  [96] = 104,   -- Teich = BT_POND
  [97] = 104,   -- Grosser Teich = BT_POND
  [100] = 62,   -- Galgen = BT_GALLOWS
  [101] = 91,   -- Jauchegrube = BT_CESSPIT
  [102] = 63,   -- Pranger = BT_STOCKS
  [103] = 92,   -- Scheiterhaufen = BT_BURNINGSTAKE
  [104] = 94,   -- Verlies = BT_DUNGEON
  [105] = 95,   -- Streckbank = BT_STRETCHINGRACK
  [106] = 93,   -- Haengekaefig = BT_GIBBET
  [107] = 97,   -- Richtblock = BT_CHOPPINGBLOCK
  [108] = 98,   -- Tauchstuhl = BT_DUNKINGSTOOL
}

-- AIV-Typen ohne sichere Entsprechung im Laufzeitsatz
M.OFFEN = { [10] = "Steinmauer", [11] = "Niedrige Mauer", [12] = "Zinnenmauer hoch", [13] = "Zinnenmauer niedrig", [14] = "Treppe 1", [15] = "Treppe 2", [16] = "Treppe 3", [17] = "Treppe 4", [18] = "Treppe 5", [19] = "Treppe 6", [20] = "Wassergraben a", [21] = "Wassergraben b", [22] = "Wassergraben c", [23] = "Wassergraben d" }

return M
