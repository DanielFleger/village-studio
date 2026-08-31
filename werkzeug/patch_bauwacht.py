# -*- coding: utf-8 -*-
"""Zwei Bausteine fuer den Burg_left_2-Lauf.

1) BAUWACHT - schreibt mit, wann eine Mauer entsteht.
   Fuer die Gegenprobe reicht die SCHRITTNUMMER; die beiden Hypothesen sagen
   unterschiedliche Nummern voraus (Gelaende 337/322/228/107/16 gegen
   Schrittnummer 116/131/225/346/437). Aus dem Tick laesst sich die Nummer
   zurueckrechnen: ein Bauschritt dauert belegte 50 Ticks. Ausgefallene
   Schritte erscheinen als Luecke in der Folge.

2) RUECKFALL auf VS.handleCommand.
   logik.lua ersetzt handleCommand vollstaendig - damit sind die Befehle aus
   init.lua (ai/file/castle fuer den AIV-Tausch, abriss, bericht) nicht mehr
   erreichbar. Ohne Durchreichen laesst sich die Messburg gar nicht laden.
"""
import io, sys

LOGIK = r"C:/Program Files (x86)/Steam/steamapps/common/Stronghold Crusader Extreme/ucp/villagestudio/logik.lua"
roh = open(LOGIK, "rb").read()
if roh.startswith(b"\xef\xbb\xbf"):
    roh = roh[3:]
s = roh.decode("utf-8")

if "bauwachtTick" in s:
    print("Bauwacht ist schon drin.")
    sys.exit(0)

# ---------------------------------------------------------------- Bauwacht
anker = "--============================================================================\n-- 7. Taktgeber"
assert anker in s, "Anker Taktgeber nicht gefunden"

block = '''--============================================================================
-- 6b. Bauwacht - wann entsteht welcher Bauschritt?
--
-- Zaehlt in festem Abstand die Mauerkacheln eines Besitzers und meldet jeden
-- Zuwachs mit Tick. Ein Bauschritt dauert belegte 50 Ticks, die Schrittnummer
-- laesst sich also aus dem Tick zurueckrechnen; ausgefallene Schritte
-- erscheinen als Luecke.
--
-- Warum ueber die Kacheln und nicht ueber die Bauliste: die Bauliste haette
-- die Schrittnummer direkt, aber ihr Eintragsabstand ist noch nicht gemessen.
-- Die Kachelzaehlung braucht nichts Unbelegtes.
--
-- Der Besitzerwert zaehlt AB 0 - Spieler 3 steht dort als 2.
--============================================================================

local bauwacht = nil

local function mauernZaehlen(besitzerWert)
  local n = 0
  for k = 0, KACHELGRENZE - 1 do
    local lg = core.readInteger(LOGIK + k * 4)
    if lg ~= nil and (lg & MAUERBIT) ~= 0 then
      if besitzerWert == nil or core.readByte(BESITZER + k) == besitzerWert then
        n = n + 1
      end
    end
  end
  return n
end

local function bauwachtStart(spieler, abstand)
  if spieler == nil then
    bauwacht = nil
    log(INFO, "BAUWACHT: aus.")
    return true
  end
  local bw = spieler - 1                    -- Besitzerschicht zaehlt ab 0
  local t = tick()
  bauwacht = {
    besitzer = bw,
    abstand  = abstand or 10,
    zahl     = mauernZaehlen(bw),
    naechste = t,
    start    = t,
    stufen   = 0,
  }
  log(INFO, string.format(
    "BAUWACHT: an fuer Spieler %d (Besitzerwert %d), Startbestand %d Mauern bei Tick %d, Pruefabstand %d.",
    spieler, bw, bauwacht.zahl, t, bauwacht.abstand))
  return true
end

local function bauwachtTick()
  if bauwacht == nil then return end
  local t = tick()
  if t < bauwacht.naechste then return end
  bauwacht.naechste = t + bauwacht.abstand

  local neu = mauernZaehlen(bauwacht.besitzer)
  if neu == bauwacht.zahl then return end

  bauwacht.stufen = bauwacht.stufen + 1
  local seitStart = t - bauwacht.start
  -- Bei 50 Ticks je Schritt: welcher Schritt ist das rechnerisch?
  log(INFO, string.format(
    "BAU Tick %d (+%d seit Start) | Mauern %d -> %d (%+d) | Stufe %d | rechnerisch Schritt %.1f",
    t, seitStart, bauwacht.zahl, neu, neu - bauwacht.zahl, bauwacht.stufen, seitStart / 50.0))
  bauwacht.zahl = neu
end

''' + anker
s = s.replace(anker, block, 1)

# ---------------------------------------------------------------- Taktgeber
alt_tick = """local function everyTick()
  pcall(mauerwachtTick)
  pcall(gebaeudewachtTick)
end"""
neu_tick = """local function everyTick()
  pcall(mauerwachtTick)
  pcall(gebaeudewachtTick)
  pcall(bauwachtTick)
end"""
assert alt_tick in s, "Anker everyTick nicht gefunden"
s = s.replace(alt_tick, neu_tick, 1)

# ---------------------------------------------------------------- Befehl
alt_cmd = """  if cmd.einheitenroh ~= nil then"""
neu_cmd = """  if cmd.bauwacht ~= nil then
    if cmd.bauwacht == false then return bauwachtStart(nil) end
    return bauwachtStart(spieler, type(cmd.bauwacht) == "number" and cmd.bauwacht or nil)
  end

  if cmd.einheitenroh ~= nil then"""
assert alt_cmd in s, "Anker einheitenroh nicht gefunden"
s = s.replace(alt_cmd, neu_cmd, 1)

# ------------------------------------------------- Rueckfall auf init.lua
alt_unbek = """  log(WARNING, "logik: unbekannter Befehl.")"""
if alt_unbek in s:
    neu_unbek = """  -- Unbekannt hier heisst nicht unbekannt ueberhaupt: der AIV-Tausch
  -- (ai/file/castle), abriss und bericht sitzen in init.lua. Ohne dieses
  -- Durchreichen liesse sich keine Messburg laden.
  if VS ~= nil and type(VS.handleCommand) == "function" then
    VS.handleCommand(cmd)
    return true
  end
  log(WARNING, "logik: unbekannter Befehl.")"""
    s = s.replace(alt_unbek, neu_unbek, 1)
    print("  Rueckfall auf VS.handleCommand eingebaut")
else:
    print("  ! Anker 'unbekannter Befehl' nicht gefunden - Rueckfall NICHT eingebaut")

# ---------------------------------------------------------------- Rueckgabe
alt_ret = """return {
  handleCommand   = handleCommand,"""
neu_ret = """return {
  handleCommand   = handleCommand,
  bauwachtStart   = bauwachtStart,
  mauernZaehlen   = mauernZaehlen,"""
assert alt_ret in s
s = s.replace(alt_ret, neu_ret, 1)

s = s.replace('log(INFO, "logik.lua neu (30.08.2026): Mauerwacht, Gebaeudewacht, Waren, Kosten, Zeit.")',
              'log(INFO, "logik.lua (31.08.2026): + Bauwacht, + Durchreichen an init.lua.")')

open(LOGIK, "wb").write(s.encode("utf-8"))

t = io.open(LOGIK, encoding="utf-8").read()
proben = ["bauwachtTick", "mauernZaehlen", "cmd.bauwacht", "VS.handleCommand", "pcall(bauwachtTick)"]
fehler = [p for p in proben if p not in t]
for p in proben:
    print(("  ok    " if p in t else "  FEHLT ") + p)
print("erstes Byte: %02X" % open(LOGIK, "rb").read(1)[0])
print("Bauwacht eingebaut" if not fehler else "%d Proben offen" % len(fehler))
sys.exit(1 if fehler else 0)
