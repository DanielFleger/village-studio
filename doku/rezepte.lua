--[[
  Fertige Bausteine fuer das Hot-Swap-Modul.

  Alle Adressen stammen aus doku/Wissensstand.md. Was dort als *belegt* steht,
  ist im Spiel bestaetigt; was als *abgelesen* steht, kommt aus der
  Ghidra-Referenz und ist im Spiel NICHT ausprobiert. Die Marke steht bei jeder
  Funktion dabei - wer eine ungeprueffte benutzt, sollte das Ergebnis
  gegenlesen und die Marke danach im Wissensstand nachziehen.

  Erwartet werden core.readInteger / readSmallInteger / readByte und die
  passenden write-Gegenstuecke.
]]--

local M = {}

--==========================================================================
-- Adressen
--==========================================================================

M.ADR = {
  -- belegt
  AIV_STATE      = 0x01866AB0,   -- AIVSpec[9] ab +0x04, je 0x6D98
  BUILDINGS      = 0x00F98520,   -- buildings[2000] ab +0x14, je 812
  BAUKOSTEN      = 0x01124CF4,   -- BuildingCostStruct[110], je 20
  PLAYERDATA     = 0x0115BDF8,   -- je Spieler 0x39F4
  GAME_SPEED     = 0x01FE7DD8,
  TICKS          = 0x0117CADC,   -- totalGameTicks
  -- Kartenschichten, belegt
  LOGIC          = 0x01BF8368,   -- int[80400]
  HEIGHT         = 0x01D32C38,   -- byte
  DEFAULT_HEIGHT = 0x01D46648,   -- byte
  WALL_OWNER     = 0x01D5A058,   -- byte, ZAEHLT AB 0: Spieler 3 steht als 2
  DAMAGE         = 0x01DBC2A8,   -- byte
  BUILDING_LAYER = 0x01C95BB8,   -- ushort
  -- abgelesen, im Spiel ungeprueft
  UNITS          = 0x0138854C,   -- units[2500], je 1168
  UNIT_COUNT     = 0x01387F3C,
  ENTITIES       = 0x02350314,   -- entityArray[3000], je 232
  ENTITY_COUNT   = 0x02350300,
}

local A = M.ADR
local KACHELN = 80400

--==========================================================================
-- Bauliste  (belegt)
--==========================================================================

function M.spec(slot)            return A.AIV_STATE + 4 + slot * 0x6D98 end
function M.schritt(slot, nr)     return M.spec(slot) + 0x34 + nr * 12   end
function M.totalSteps(slot)      return core.readInteger(M.spec(slot) + 0x20) end
function M.stepGoal(slot)        return core.readInteger(M.spec(slot) + 0x14) end

-- Zustand: 0 aus, 1 ungebaut, 3 gebaut, 4 kein Platz, 5 keine Rohstoffe
function M.schrittZustand(slot, nr)   return core.readByte(M.schritt(slot, nr)) end
function M.schrittTyp(slot, nr)       return core.readSmallInteger(M.schritt(slot, nr) + 2) end
function M.schrittSperren(slot, nr)   core.writeByte(M.schritt(slot, nr), 0) end
function M.schrittOeffnen(slot, nr)   core.writeByte(M.schritt(slot, nr), 1) end

-- Alle Schritte eines Bereichs sperren. Achtung: NACH applyAIV aufrufen,
-- das setzt alle Schritte auf "ungebaut" zurueck.
function M.bereichSperren(slot, von, bis)
  for n = von, math.min(bis, M.totalSteps(slot)) do M.schrittSperren(slot, n) end
end

--==========================================================================
-- Waren und Gold  (belegt)
--==========================================================================

M.WARE = { HOLZSTAEMME=1, HOLZ=2, HOPFEN=3, STEIN=4, EISEN=6, PECH=7,
           WEIZEN=9, BROT=10, KAESE=11, FLEISCH=12, APFEL=13, BIER=14,
           GOLD=15, MEHL=16 }

function M.ware(spieler, rt)
  return core.readInteger(A.PLAYERDATA + spieler * 0x39F4 + 0x4D0 + rt * 4)
end
function M.wareSetzen(spieler, rt, wert)
  core.writeInteger(A.PLAYERDATA + spieler * 0x39F4 + 0x4D0 + rt * 4, wert)
end

-- Gold verschieben. Geht auch an Nicht-Verbuendete - die Warenzelle kennt
-- keine Buendnisse. (Der Weg ueber processResourceGain dagegen sucht ein
-- Lagergebaeude und scheitert, wenn keins steht.)
function M.goldSchicken(von, nach, betrag)
  local hat = M.ware(von, M.WARE.GOLD)
  if hat < betrag then betrag = hat end
  if betrag <= 0 then return 0 end
  M.wareSetzen(von,  M.WARE.GOLD, hat - betrag)
  M.wareSetzen(nach, M.WARE.GOLD, M.ware(nach, M.WARE.GOLD) + betrag)
  return betrag
end

--==========================================================================
-- Baukosten  (Adresse belegt, Wirkung im Spiel noch ungeprueft)
--==========================================================================

-- Index ist die LAUFZEIT-Gebaeudenummer (siehe lib/kosten.json).
-- Reihenfolge im Eintrag: Holz, Stein, Eisen, Pech, Gold.
function M.kosten(laufzeitNr)
  local a = A.BAUKOSTEN + laufzeitNr * 20
  return { holz  = core.readInteger(a),      stein = core.readInteger(a + 4),
           eisen = core.readInteger(a + 8),  pech  = core.readInteger(a + 12),
           gold  = core.readInteger(a + 16) }
end

function M.kostenSetzen(laufzeitNr, k)
  local a = A.BAUKOSTEN + laufzeitNr * 20
  if k.holz  then core.writeInteger(a,      k.holz)  end
  if k.stein then core.writeInteger(a + 4,  k.stein) end
  if k.eisen then core.writeInteger(a + 8,  k.eisen) end
  if k.pech  then core.writeInteger(a + 12, k.pech)  end
  if k.gold  then core.writeInteger(a + 16, k.gold)  end
end

-- Alles kostenlos machen - nuetzlich, um bei einer Messung die
-- Rohstoffbremse auszuschalten.
function M.allesKostenlos()
  for nr = 1, 109 do M.kostenSetzen(nr, { holz=0, stein=0, eisen=0, pech=0, gold=0 }) end
end

--==========================================================================
-- Einheiten  (abgelesen, im Spiel ungeprueft)
--==========================================================================

M.UNIT = { LORD=55, E_ARCHER=22, E_SPEAR=24, E_PIKE=25, E_MACE=26,
           E_SWORD=27, E_KNIGHT=28, A_ARCHER=70, A_SLAVE=71,
           A_ASSASSIN=73, A_HARCHER=74, A_SWORDSMAN=75 }

function M.einheit(i)          return A.UNITS + i * 1168 end
function M.einheitTyp(i)       return core.readSmallInteger(M.einheit(i) + 0x8E) end
function M.einheitOwner(i)     return core.readSmallInteger(M.einheit(i) + 0x96) end
function M.einheitLeben(i)     return core.readInteger(M.einheit(i) + 0x3C8) end
function M.einheitMaxLeben(i)  return core.readInteger(M.einheit(i) + 0x3CC) end
function M.einheitKachel(i)    return core.readInteger(M.einheit(i) + 0xD4) end

function M.einheitLebenSetzen(i, wert) core.writeInteger(M.einheit(i) + 0x3C8, wert) end
function M.einheitTypSetzen(i, typ)    core.writeSmallInteger(M.einheit(i) + 0x8E, typ) end

-- Bewegungsziel setzen. Ob das allein reicht oder ob der Wegplan
-- (+0xFE, byte[400]) neu berechnet werden muss, ist ungeprueft.
function M.einheitZielSetzen(i, x, y)
  core.writeSmallInteger(M.einheit(i) + 0xC8, x)
  core.writeSmallInteger(M.einheit(i) + 0xCA, y)
end

-- Ueber alle Einheiten laufen. fn(index, typ, owner, leben) - gibt fn
-- true zurueck, wird abgebrochen.
function M.jedeEinheit(fn)
  local n = core.readInteger(A.UNIT_COUNT)
  if n == nil or n < 0 or n > 2500 then n = 2500 end
  for i = 0, n - 1 do
    local typ = M.einheitTyp(i)
    if typ ~= 0 then
      if fn(i, typ, M.einheitOwner(i), M.einheitLeben(i)) then return i end
    end
  end
end

-- Lebt der Lord dieses Spielers noch?
function M.lordLebt(spieler)
  local gefunden = false
  M.jedeEinheit(function(i, typ, owner, leben)
    if typ == M.UNIT.LORD and owner == spieler and leben > 0 then
      gefunden = true; return true
    end
  end)
  return gefunden
end

--==========================================================================
-- Geschosse  (abgelesen, im Spiel ungeprueft)
--==========================================================================

M.GESCHOSS = { PFEIL=1, ARMBRUST=7, FEUER=9, FEUERWERFER=34, FEUERBALLISTE=37 }

function M.entity(i)         return A.ENTITIES + i * 232 end
function M.entityTyp(i)      return core.readSmallInteger(M.entity(i) + 0x2A) end
function M.entityOwner(i)    return core.readSmallInteger(M.entity(i) + 0x2C) end

-- Position und Ziel eines Geschosses - Grundlage fuers Ausweichen
function M.entityFlug(i)
  local a = M.entity(i)
  return { x  = core.readSmallInteger(a + 0x44), y  = core.readSmallInteger(a + 0x46),
           zx = core.readSmallInteger(a + 0x3E), zy = core.readSmallInteger(a + 0x40),
           zz = core.readSmallInteger(a + 0x42),
           schuetze = core.readInteger(a + 0xD4) }
end

-- Alle fliegenden Geschosse eines Gegners. fn(index, typ, flug)
function M.jedesGeschoss(fn)
  local n = core.readInteger(A.ENTITY_COUNT)
  if n == nil or n < 0 or n > 3000 then n = 3000 end
  for i = 0, n - 1 do
    local t = M.entityTyp(i)
    if t == M.GESCHOSS.PFEIL or t == M.GESCHOSS.ARMBRUST
       or t == M.GESCHOSS.FEUERBALLISTE then
      fn(i, t, M.entityFlug(i))
    end
  end
end

--==========================================================================
-- Mauern  (belegt)
--==========================================================================

M.MAUERBITS = 0x100 + 0x200 + 0x800 + 0x10000 + 0x400000

function M.istMauer(kachel)
  return (core.readInteger(A.LOGIC + kachel * 4) & M.MAUERBITS) ~= 0
end
function M.mauerBesitzer(kachel)
  return core.readByte(A.WALL_OWNER + kachel)     -- zaehlt ab 0!
end
function M.mauerSchaden(kachel)
  return core.readByte(A.DAMAGE + kachel)
end

-- Alle beschaedigten Mauerkacheln eines Spielers.
-- ACHTUNG: spieler hier in der Zaehlung der Besitzer-Ebene, also
-- Spielernummer minus 1.
function M.beschaedigteMauern(spielerAb0)
  local treffer = {}
  for k = 0, KACHELN - 1 do
    if M.mauerBesitzer(k) == spielerAb0 and M.istMauer(k) and M.mauerSchaden(k) > 0 then
      treffer[#treffer + 1] = { kachel = k, schaden = M.mauerSchaden(k) }
    end
  end
  return treffer
end

--==========================================================================
-- Zeit  (belegt)
--==========================================================================

function M.ticks()             return core.readInteger(A.TICKS) end
function M.tempo()             return core.readInteger(A.GAME_SPEED) end
function M.tempoSetzen(n)      core.writeInteger(A.GAME_SPEED, n) end

-- Ein Bauschritt dauert 50 Ticks. Damit laesst sich vorhersagen, wann
-- Schritt n gebaut sein muss.
M.TICKS_JE_BAUSCHRITT = 50

return M
