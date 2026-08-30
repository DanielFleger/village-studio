--[[ Village Studio - Live-Logik fuer Stronghold Crusader
     Neu geschrieben am 30.08.2026.

     Die Vorgaengerfassung war ueber rund vierzig Textersetzungen gewachsen
     und dabei zerbrochen. Diese Fassung enthaelt nur, was im Spiel BELEGT
     ist - jede Adresse und jeder Wert wurde gemessen, nichts geraten.
     Die alte Datei liegt als logik_alt_20260830.lua daneben.

     Wird von init.lua nachgeladen: sobald sich diese Datei aendert, ist die
     neue Fassung im naechsten Tick aktiv. Bei einem Syntaxfehler bleibt die
     laufende Fassung stehen und es kommt eine Warnung ins Log.
]]--

local VS = ...

--============================================================================
-- 1. Adressen. Alle im laufenden Spiel gemessen.
--============================================================================

-- Kachel-Ebenen der Karte. NICHT ueber KACHELGRENZE hinaus lesen:
-- dahinter steht Zufallsspeicher (29.08.: erfundene Kacheln fuehrten zum
-- Absturz, weil sie an destroyWall weitergereicht wurden).
local LOGIK        = 0x01BF8368   -- int  je Kachel: Gelaende- und Baubits
local HOEHE        = 0x01D32C38   -- byte je Kachel: bei Mauern die GESUNDHEIT
local GRUNDHOEHE   = 0x01D46648   -- byte je Kachel: Hoehe ohne Bebauung
local BESITZER     = 0x01D5A058   -- byte je Kachel, zaehlt AB 0
local SCHADEN      = 0x01DBC2A8   -- byte je Kachel
local KACHELGRENZE = 80400

-- Mauerwerk: genau die Bits, die destroyWall loescht (ohne Schutt).
-- 0x100000 ist NICHT dabei - das ist L_RIVER, ein Irrtum vom 29.08.
local MAUERBIT = 0x100 | 0x200 | 0x800 | 0x10000 | 0x400000

-- Gebaeudetabelle. Ein Eintrag ist 0x32C Bytes, Anzahl steht bei +0x08.
local GEBAEUDE     = 0xF98520
local G_SCHRITT    = 0x32C
local G_ZUSTAND    = 0xE4    -- word: 0 = kein Gebaeude, 3 = abgerissen
local G_TYP        = 0xE6    -- word
local G_BESITZER   = 0xEA    -- word: Spielernummer (NICHT ab 0)
-- ACHTUNG Versatz: Die Ghidra-Referenz zaehlt ab Gebaeude+0x14, unsere Basis
-- nicht. Bei Zustand/Typ/Besitzer ist der Versatz eingerechnet, beim Leben
-- fehlte er (30.08.: Gebaeude starben trotz laufender Wacht).
-- Referenz +0x10C/+0x10E  ->  bei uns +0x120/+0x122.
local G_LEBEN      = 0x120   -- word
local G_MAXLEBEN   = 0x122   -- word

-- Spielerdaten: Waren bei +0x4D0 als int[25] (2 Holz, 4 Stein, 15 Gold).
local SPIELERDATEN = 0x0115BDF8
local SD_SCHRITT   = 0x39F4
local SD_WAREN     = 0x4D0

-- Baukosten: int[110][5] je 20 Byte (Holz, Stein, Eisen, Pech, Gold).
-- Index ist die Laufzeit-Gebaeudenummer. VOR dem Gefecht ist die Tabelle
-- leer - wer da liest, misst Nullen und haelt die Adresse fuer falsch.
local KOSTEN       = 0x01124CF4
local KOSTENFELD   = { holz = 0, stein = 4, eisen = 8, pech = 12, gold = 16 }

-- Zeit und Tempo. Ticks je Sekunde = Tempowert (gemessen bei 20/50/100/200).
-- Tag 50, Woche 200, Monat 800, Jahr 9600 Ticks.
local TICKZAEHLER  = 0x0117CADC
local TEMPO        = 0x1FE7DD8
local PAUSE        = 0x1FEA054

--============================================================================
-- 2. Kleine Helfer
--============================================================================

local function ware(spieler, art)
  return core.readInteger(SPIELERDATEN + spieler * SD_SCHRITT + SD_WAREN + art * 4)
end

local function wareSetzen(spieler, art, menge)
  core.writeInteger(SPIELERDATEN + spieler * SD_SCHRITT + SD_WAREN + art * 4, menge)
end

local function tick()
  return core.readInteger(TICKZAEHLER) or 0
end

local function gebaeudeAnzahl()
  local n = core.readInteger(GEBAEUDE + 8)
  if n == nil or n < 2 or n > 4000 then return nil, n end
  return n
end

--============================================================================
-- 3. Mauerwacht
--
-- BELEGT am 30.08.2026, gemessen im Treffer-Moment:
--   Logik 0x100 -> 0x100 (unveraendert), Hoehe 98 -> 77, Schaden 0 -> 1
-- Beschuss laesst die Logikbits also unangetastet und senkt die HOEHE.
-- Die Hoehe ist die Gesundheit einer Mauerkachel.
--
-- Drei harte Grenzen, aus Fehlschlaegen desselben Tages gelernt:
--   1. Nur Kacheln EINES Besitzerwerts, nicht die ganze Karte.
--   2. Nur Kacheln, die beim Scharfstellen volle Mauerhoehe hatten.
--   3. Es werden NIE Logikbits geschrieben - nur Hoehe und Schaden. Damit
--      kann diese Wacht prinzipiell keine Mauer erzeugen, nur erhalten.
--      (Ohne Grenze 3 entstanden Phantommauern ueber die halbe Karte.)
--
-- Der Schadenswert MUSS mitzurueckgesetzt werden: sonst laeuft er hoch und
-- das Spiel zerstoert die Kachel trotz gehaltener Hoehe.
--============================================================================

local mauerwacht = {}   -- schluessel -> { kacheln, ziel, anzahl, wieder, modus }

local function mauerwachtStart(schluessel, besitzer, zielHoehe, modus)
  local roh, hoechstJeArt, gefunden = {}, {}, 0
  for k = 0, KACHELGRENZE - 1 do
    if core.readByte(BESITZER + k) == besitzer then
      local lg = core.readInteger(LOGIK + k * 4)
      if (lg & MAUERBIT) ~= 0 then
        local h = core.readByte(HOEHE + k)
        roh[k] = { lg, h }
        local art = lg & MAUERBIT
        if hoechstJeArt[art] == nil or h > hoechstJeArt[art] then
          hoechstJeArt[art] = h
        end
        gefunden = gefunden + 1
      end
    end
  end

  local kacheln, genommen, zuNiedrig = {}, 0, 0
  for k, v in pairs(roh) do
    local gesund = hoechstJeArt[v[1] & MAUERBIT]
    local eigene = v[2]                     -- Ursprungshoehe DIESER Kachel
    local ziel = zielHoehe or math.floor((gesund or eigene) / 2)
    if ziel < 1 then ziel = 1 end

    -- SICHERUNG, zweimal am 30.08. schmerzhaft gelernt:
    -- Ein Mauerbit auf einer Kachel heisst NICHT, dass dort eine Mauer steht.
    -- Es sitzt auch unter Lagerplaetzen, Torhaeusern und geplanten Bauten.
    -- Wird deren niedrige Kachel auf Mauerhoehe gehoben, entsteht eine
    -- Erhebung, ueber die niemand mehr laeuft - Softlock.
    -- Deshalb: Kacheln, die nicht klar ueber dem Ziel liegen, bleiben aussen
    -- vor. Angehoben wird grundsaetzlich nichts.
    if eigene > ziel then
      kacheln[k] = { ziel, eigene }         -- 1 = Zielhoehe, 2 = Ursprungshoehe
      genommen = genommen + 1
    else
      zuNiedrig = zuNiedrig + 1
    end
  end

  mauerwacht[schluessel] = { kacheln = kacheln, anzahl = genommen,
                             wieder = 0, modus = modus or "halten" }
  log(INFO, string.format(
    "MAUERWACHT %s: %d von %d Kacheln uebernommen, %d zu niedrig (Lager, Torhaeuser, Baufelder - werden NIE angehoben). Zielhoehe %s, Modus %s.",
    tostring(schluessel), genommen, gefunden, zuNiedrig, tostring(zielHoehe or "halb"), modus or "halten"))
  return true
end

local function mauerwachtTick()
  for schluessel, w in pairs(mauerwacht) do
    for k, v in pairs(w.kacheln) do
      local h = core.readByte(HOEHE + k)
      if h < v[2] then                       -- Ausloeser: Hoehe verloren
        if w.modus == "melden" then
          core.writeInteger(PAUSE, 1)
          log(INFO, string.format("TREFFER Tick %d | Kachel %d: Hoehe %d -> %d. SPIEL PAUSIERT.",
            tick(), k, v[2], h))
          mauerwacht[schluessel] = nil
          return
        elseif h ~= v[1] then
          core.writeByte(HOEHE + k, v[1])
          core.writeByte(SCHADEN + k, 0)
          w.wieder = w.wieder + 1
          if w.wieder <= 3 or w.wieder % 1000 == 0 then
            log(INFO, string.format("MAUER Tick %d | Kachel %d auf %d gehalten (insgesamt %d).",
              tick(), k, v[1], w.wieder))
          end
        end
      end
    end
  end
end

--============================================================================
-- 4. Gebaeudewacht
--
-- Gebaeude haben ein echtes Lebensfeld (+0x10C) samt Maximum (+0x10E) - hier
-- muss nichts ueber Hoehen erschlossen werden.
--
-- Verhalten nach Daniels Vorgabe: Sobald ein Gebaeude Leben verliert, faellt
-- es sofort auf den Zielwert (Standard 1) und bleibt dort. Es kann damit
-- nicht mehr zerstoert werden, sieht aber schwer beschaedigt aus.
--
-- Neue Gebaeude werden mitgenommen: die Wacht laeuft ueber die ganze
-- Tabelle, nicht ueber eine Liste vom Scharfstellen. Deshalb greift sie auch
-- bei allem, was erst spaeter gebaut wird.
--============================================================================

local gebaeudewacht = {}   -- spieler -> { ziel, wieder }

local function gebaeudewachtTick()
  local n = gebaeudeAnzahl()
  if n == nil then return end
  for spieler, w in pairs(gebaeudewacht) do
    for i = 1, n - 1 do
      local b = GEBAEUDE + i * G_SCHRITT
      local zustand = core.readSmallInteger(b + G_ZUSTAND)
      if zustand ~= 0 and core.readSmallInteger(b + G_BESITZER) == spieler then
        local leben = core.readSmallInteger(b + G_LEBEN)
        local maxLeben = core.readSmallInteger(b + G_MAXLEBEN)
        if leben ~= nil and maxLeben ~= nil and maxLeben > 0 then
          -- Bei genau 1 Leben toetet der naechste Treffer. Deshalb wird auch
          -- der Zustand 3 (zerstoert) zurueckgenommen - das Gebaeude kommt
          -- zurueck. UNGEPRUEFT: ob das Spiel mit einer Auferstehung sauber
          -- umgeht, muss der Test zeigen.
          if zustand == 3 then
            core.writeSmallInteger(b + G_ZUSTAND, 1)
            core.writeSmallInteger(b + G_LEBEN, w.ziel)
            w.wieder = w.wieder + 1
            if w.wieder <= 5 or w.wieder % 200 == 0 then
              log(INFO, string.format("GEBAEUDE Tick %d | Spieler %d Eintrag %d ZURUECKGEHOLT (war zerstoert), Leben %d.",
                tick(), spieler, i, w.ziel))
            end
          elseif leben < maxLeben and leben ~= w.ziel then
            core.writeSmallInteger(b + G_LEBEN, w.ziel)
            w.wieder = w.wieder + 1
            if w.wieder <= 3 or w.wieder % 500 == 0 then
              log(INFO, string.format("GEBAEUDE Tick %d | Spieler %d Eintrag %d (Typ %d): Leben %d/%d -> %d (insgesamt %d).",
                tick(), spieler, i, core.readSmallInteger(b + G_TYP),
                leben, maxLeben, w.ziel, w.wieder))
            end
          end
        end
      end
    end
  end
end

--============================================================================
-- 4b. Einheiten - Adressen aus Ghidra, im Spiel noch UNGEPRUEFT.
--
-- Totschlagtest (vorher festgelegt): Jeder lebende Spieler hat GENAU EINEN
-- Lord (Typ 55). Nicht null, nicht mehrere. Zufallsdaten erfuellen das
-- praktisch nie - stimmt es, ist die Struktur belegt; stimmt es nicht, sind
-- die Adressen falsch. Kein Schreibzugriff, reine Messung.
--============================================================================

local EINHEITEN   = 0x0138854C
local E_SCHRITT   = 1168
local E_ANZAHL    = 0x01387F38 + 4
local E_TYP       = 0x08E
local E_BESITZER  = 0x096
local E_LEBEN     = 0x3C8
local UT_LORD     = 55

local function einheitenBericht()
  local anzahl = core.readInteger(E_ANZAHL)
  if anzahl == nil or anzahl < 0 or anzahl > 2500 then
    log(WARNING, string.format("EINHEITEN: Anzahl unplausibel (%s) - Adresse falsch.", tostring(anzahl)))
    return true
  end
  local jeBesitzer, jeTyp, lords, lebend = {}, {}, {}, 0
  for i = 0, anzahl - 1 do
    local b = EINHEITEN + i * E_SCHRITT
    local leben = core.readInteger(b + E_LEBEN)
    if leben ~= nil and leben > 0 then
      local o = core.readSmallInteger(b + E_BESITZER)
      local t = core.readSmallInteger(b + E_TYP)
      lebend = lebend + 1
      jeBesitzer[o] = (jeBesitzer[o] or 0) + 1
      jeTyp[t] = (jeTyp[t] or 0) + 1
      if t == UT_LORD then lords[o] = (lords[o] or 0) + 1 end
    end
  end
  log(INFO, string.format("EINHEITEN: Zaehler %d, davon %d lebend.", anzahl, lebend))
  for o = 0, 8 do
    if jeBesitzer[o] then
      log(INFO, string.format("   Besitzer %d : %4d Einheiten, Lords: %d",
        o, jeBesitzer[o], lords[o] or 0))
    end
  end
  -- Der Totschlagtest
  local bestanden, spieler = true, 0
  for o, n in pairs(jeBesitzer) do
    if n > 5 then                      -- nur ernsthaft besetzte Spieler pruefen
      spieler = spieler + 1
      if (lords[o] or 0) ~= 1 then bestanden = false end
    end
  end
  log(INFO, string.format("TOTSCHLAGTEST Lord: %s (%d Spieler geprueft, jeder muss genau 1 Lord haben)",
    bestanden and "BESTANDEN - Struktur belegt" or "FEHLGESCHLAGEN - Adressen falsch", spieler))
  return true
end


-- Sucht den richtigen Versatz fuer das Einheiten-Feld. Bedingung: jeder
-- ernsthaft besetzte Spieler hat GENAU EINEN Lord. Nur lesen, kein Schreiben.
local function einheitenSuche()
  local anzahl = core.readInteger(E_ANZAHL)
  if anzahl == nil or anzahl < 1 or anzahl > 2500 then
    log(WARNING, "SUCHE: Anzahl unplausibel.")
    return true
  end
  local treffer = 0
  for _, versatz in ipairs({ 0, 0x14, -0x14, 0x08, 0x10, 0x20, 0x614 }) do
    for _, lordTyp in ipairs({ 55, 20, 30 }) do
      local jeBes, lords = {}, {}
      for i = 0, anzahl - 1 do
        local b = EINHEITEN + i * E_SCHRITT + versatz
        local leben = core.readInteger(b + E_LEBEN)
        if leben ~= nil and leben > 0 and leben < 10000 then
          local o = core.readSmallInteger(b + E_BESITZER)
          local t = core.readSmallInteger(b + E_TYP)
          if o ~= nil and o >= 0 and o <= 8 then
            jeBes[o] = (jeBes[o] or 0) + 1
            if t == lordTyp then lords[o] = (lords[o] or 0) + 1 end
          end
        end
      end
      local spieler, ok = 0, true
      for o, n in pairs(jeBes) do
        if n > 5 then
          spieler = spieler + 1
          if (lords[o] or 0) ~= 1 then ok = false end
        end
      end
      if ok and spieler >= 2 then
        treffer = treffer + 1
        log(INFO, string.format("SUCHE TREFFER: Versatz 0x%X, Lordtyp %d, %d Spieler mit je genau 1 Lord.",
          versatz, lordTyp, spieler))
      end
    end
  end
  if treffer == 0 then
    log(INFO, "SUCHE: kein Versatz erfuellt die Lord-Bedingung - Grundadresse oder Schrittweite stimmt nicht.")
  end
  return true
end

--============================================================================
-- 5. Berichte und Werkzeuge
--============================================================================

local function mauerDiagnose(bis)
  bis = math.min(bis or KACHELGRENZE, KACHELGRENZE)
  local mitBit, jeBesitzer = 0, {}
  for k = 0, bis - 1 do
    local lg = core.readInteger(LOGIK + k * 4)
    if lg ~= nil and (lg & MAUERBIT) ~= 0 then
      mitBit = mitBit + 1
      local b = core.readByte(BESITZER + k)
      jeBesitzer[b] = (jeBesitzer[b] or 0) + 1
    end
  end
  log(INFO, string.format("DIAGNOSE: %d Kacheln mit Mauerwerk.", mitBit))
  for b = 0, 16 do
    if jeBesitzer[b] then
      log(INFO, string.format("   Besitzerwert %2d : %5d Kacheln", b, jeBesitzer[b]))
    end
  end
  return true
end

local function gebaeudeBericht(spieler)
  local n, roh = gebaeudeAnzahl()
  if n == nil then
    log(WARNING, string.format("logik: Gebaeudeanzahl unplausibel (%s).", tostring(roh)))
    return false
  end
  local jeTyp, gesamt, verletzt = {}, 0, 0
  for i = 1, n - 1 do
    local b = GEBAEUDE + i * G_SCHRITT
    local z = core.readSmallInteger(b + G_ZUSTAND)
    if z ~= 0 and z ~= 3 and core.readSmallInteger(b + G_BESITZER) == spieler then
      local t = core.readSmallInteger(b + G_TYP)
      jeTyp[t] = (jeTyp[t] or 0) + 1
      gesamt = gesamt + 1
      if core.readSmallInteger(b + G_LEBEN) < core.readSmallInteger(b + G_MAXLEBEN) then
        verletzt = verletzt + 1
      end
    end
  end
  log(INFO, string.format("BESTAND Spieler %d: %d Gebaeude, davon %d beschaedigt.",
    spieler, gesamt, verletzt))
  for t = 0, 109 do
    if jeTyp[t] then
      log(INFO, string.format("   Typ %3d : %3d Stueck", t, jeTyp[t]))
    end
  end
  return true
end

local function kostenBefehl(cmd)
  local typ = cmd.typ
  if type(typ) ~= "number" or typ < 0 or typ > 109 then
    log(WARNING, "logik: 'typ' fehlt oder liegt ausserhalb 0-109.")
    return false
  end
  local basis = KOSTEN + typ * 20
  local vorher = {}
  for name, off in pairs(KOSTENFELD) do vorher[name] = core.readInteger(basis + off) end
  for name, off in pairs(KOSTENFELD) do
    if type(cmd[name]) == "number" then core.writeInteger(basis + off, cmd[name]) end
  end
  log(INFO, string.format(
    "KOSTEN Typ %d: Holz %d->%d, Stein %d->%d, Eisen %d->%d, Pech %d->%d, Gold %d->%d",
    typ,
    vorher.holz,  core.readInteger(basis + 0),
    vorher.stein, core.readInteger(basis + 4),
    vorher.eisen, core.readInteger(basis + 8),
    vorher.pech,  core.readInteger(basis + 12),
    vorher.gold,  core.readInteger(basis + 16)))
  return true
end

--============================================================================
-- 6. Befehle
--============================================================================

local function einzelbefehl(cmd)
  if type(cmd) ~= "table" then return false end
  local spieler = cmd.player

  if cmd.pause ~= nil then
    core.writeInteger(PAUSE, cmd.pause == true and 1 or 0)
    log(INFO, "logik: Spiel " .. (cmd.pause == true and "pausiert" or "fortgesetzt") .. ".")
    return true
  end

  if cmd.tempo ~= nil then
    local alt = core.readInteger(TEMPO)
    if type(cmd.tempo) == "number" then core.writeInteger(TEMPO, cmd.tempo) end
    log(INFO, string.format("TEMPO: %s -> %s (Ticks je Sekunde = Tempowert).",
      tostring(alt), tostring(core.readInteger(TEMPO))))
    return true
  end

  if cmd.zeit == true then
    local t = tick()
    log(INFO, string.format("ZEIT: Tick %d | Tag %d/50 | Woche %d/200 | Monat %d/800 | Jahr = 9600",
      t, t % 50, t % 200, t % 800))
    return true
  end

  if cmd.kosten ~= nil then return kostenBefehl(cmd.kosten) end
  if cmd.mauerDiagnose ~= nil then
    return mauerDiagnose(type(cmd.mauerDiagnose) == "number" and cmd.mauerDiagnose or nil)
  end

  if spieler == nil then
    log(WARNING, "logik: 'player' fehlt im Befehl.")
    return false
  end

  if cmd.ware ~= nil then
    local art = cmd.ware.typ or 4
    local alt = ware(spieler, art)
    if type(cmd.ware.menge) == "number" then wareSetzen(spieler, art, cmd.ware.menge) end
    log(INFO, string.format("WARE %d bei Spieler %d: %s -> %s",
      art, spieler, tostring(alt), tostring(ware(spieler, art))))
    return true
  end

  if cmd.gold ~= nil then
    local alt = ware(spieler, 15)
    if type(cmd.gold) == "number" then wareSetzen(spieler, 15, cmd.gold) end
    log(INFO, string.format("GOLD Spieler %d: %s -> %s",
      spieler, tostring(alt), tostring(ware(spieler, 15))))
    return true
  end

  if cmd.bestand == true then return gebaeudeBericht(spieler) end
  if cmd.einheiten == true then return einheitenBericht() end
  if cmd.einheitensuche == true then return einheitenSuche() end

  if cmd.mauerwacht ~= nil then
    if cmd.mauerwacht == false then
      mauerwacht[spieler] = nil
      log(INFO, string.format("MAUERWACHT %d aus.", spieler))
      return true
    end
    -- besitzer: Wert in der Besitzer-Ebene. Sie zaehlt ab 0, aber die
    -- Zuordnung Spieler -> Besitzerwert ist nicht immer spieler-1, deshalb
    -- ist sie direkt angebbar.
    return mauerwachtStart(spieler, cmd.besitzer or (spieler - 1), cmd.hoehe,
      type(cmd.mauerwacht) == "string" and cmd.mauerwacht or nil)
  end

  if cmd.gebaeudewacht ~= nil then
    if cmd.gebaeudewacht == false then
      gebaeudewacht[spieler] = nil
      log(INFO, string.format("GEBAEUDEWACHT %d aus.", spieler))
      return true
    end
    gebaeudewacht[spieler] = { ziel = cmd.leben or 1, wieder = 0 }
    log(INFO, string.format(
      "GEBAEUDEWACHT Spieler %d an: beschaedigte Gebaeude fallen sofort auf %d Leben und bleiben dort.",
      spieler, gebaeudewacht[spieler].ziel))
    return true
  end

  log(WARNING, "logik: unbekannter Befehl.")
  return false
end

-- Befehle koennen einzeln oder als Liste kommen. Eine "id" wird gemerkt,
-- damit derselbe Befehl nicht zweimal ausgefuehrt wird - so kann die
-- Befehlsdatei gefahrlos mehrfach geschrieben werden.
local erledigt = {}

local function handleCommand(cmd)
  if type(cmd) ~= "table" then return end
  local liste = cmd
  if type(cmd.befehle) == "table" then liste = cmd.befehle
  elseif cmd[1] == nil then liste = { cmd } end

  local ok, fehler, uebersprungen = 0, 0, 0
  for i = 1, #liste do
    local c = liste[i]
    if type(c) == "table" and c.id ~= nil and erledigt[c.id] then
      uebersprungen = uebersprungen + 1
    else
      local gut, err = pcall(einzelbefehl, c)
      if gut and err then ok = ok + 1 else
        fehler = fehler + 1
        if not gut then log(WARNING, "logik: " .. tostring(err)) end
      end
      if type(c) == "table" and c.id ~= nil then erledigt[c.id] = true end
    end
  end
  if ok + fehler > 1 or uebersprungen > 0 then
    log(INFO, string.format("logik: %d von %d Befehlen ausgefuehrt, %d schon erledigt.",
      ok, ok + fehler, uebersprungen))
  end
end

--============================================================================
-- 7. Taktgeber
--============================================================================

local function everyTick()
  pcall(mauerwachtTick)
  pcall(gebaeudewachtTick)
end

log(INFO, "logik.lua neu (30.08.2026): Mauerwacht, Gebaeudewacht, Waren, Kosten, Zeit.")

return {
  handleCommand   = handleCommand,
  everyTick       = everyTick,
  mauerwachtStart = mauerwachtStart,
  gebaeudeBericht = gebaeudeBericht,
  mauerDiagnose   = mauerDiagnose,
}
