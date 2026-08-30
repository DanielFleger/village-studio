--==========================================================================
-- Totschlagtest fuer das Einheiten-Array
--
-- Geschrieben am 30.08.2026 VOR der Messung. Was hier als Widerlegung steht,
-- gilt - es wird nachher nicht umgedeutet.
--
--   Basis        0x0138854C   units[0]
--   Schrittweite 1168
--   Grenze       0x01387F38   maxUnitCount
--   belegt       +0x8C ~= 0   (logicalState, ULS_INVISIBLE = 0)
--
-- Aufruf aus dem Modul heraus:  require("test_einheiten").lauf(logik)
--==========================================================================

local T = {}

function T.lauf(M)
  local A, core = M.A, M.core
  local zeile = {}
  local function sag(s) zeile[#zeile+1] = s; print("[EinheitenTest] " .. s) end
  local rot = 0
  local function pruefe(nr, frage, bestanden, gemessen)
    if bestanden then sag(string.format("  %d GRUEN  %s   (%s)", nr, frage, gemessen))
    else rot = rot + 1;  sag(string.format("  %d ROT    %s   (%s)", nr, frage, gemessen)) end
  end

  sag("=== Totschlagtest Einheiten-Array ===")

  ----------------------------------------------------------------------
  -- 1) Slot 0 ist NIE belegt.
  --    spawnUnit faengt bei 1 an - Slot 0 bekommt nie eine Einheit.
  --    Steht dort etwas Belegtes, zeigt die Basis auf die falsche Stelle.
  --    Das ist der Extremwert-Test: er prueft die Basis allein, ohne
  --    von Typnummern oder Lord-Regeln abzuhaengen.
  ----------------------------------------------------------------------
  local z0 = core.readSmallInteger(A.UNITS + 0x8C)
  pruefe(1, "Slot 0 ist frei (Basis stimmt)", z0 == 0, "logicalState[0] = " .. tostring(z0))

  ----------------------------------------------------------------------
  -- 2) maxUnitCount liegt zwischen 1 und 2500.
  --    Ausserhalb heisst: falsches Feld gelesen.
  ----------------------------------------------------------------------
  local n = core.readInteger(A.UNIT_MAX)
  pruefe(2, "maxUnitCount in 1..2500", n ~= nil and n >= 1 and n <= 2500,
         "maxUnitCount = " .. tostring(n))

  ----------------------------------------------------------------------
  -- 3) Jeder belegte Slot hat einen gueltigen Typ (1..78) und einen
  --    gueltigen Besitzer (0..8). Ein einziger Ausreisser widerlegt
  --    die Schrittweite - bei falschem Abstand wandert der Lesepunkt
  --    mit jedem Index weiter ins Leere, und das faellt hier auf.
  ----------------------------------------------------------------------
  local belegt, schlechterTyp, schlechterOwner, letzterSchlechte = 0, 0, 0, -1
  local proTyp, proOwner = {}, {}
  M.jedeEinheit(function(i, typ, owner, leben)
    belegt = belegt + 1
    proTyp[typ] = (proTyp[typ] or 0) + 1
    proOwner[owner] = (proOwner[owner] or 0) + 1
    if typ < 1 or typ > 78 then schlechterTyp = schlechterTyp + 1; letzterSchlechte = i end
    if owner < 0 or owner > 8 then schlechterOwner = schlechterOwner + 1; letzterSchlechte = i end
  end)
  pruefe(3, "kein belegter Slot mit unsinnigem Typ/Besitzer",
         schlechterTyp == 0 and schlechterOwner == 0,
         string.format("%d belegt, %d Typ-Ausreisser, %d Besitzer-Ausreisser, zuletzt bei %d",
                       belegt, schlechterTyp, schlechterOwner, letzterSchlechte))

  ----------------------------------------------------------------------
  -- 4) DER LORD-TEST.
  --    Jeder Spieler, der Gebaeude besitzt, hat genau EINEN Lord (Typ 55).
  --    Null Lords oder mehr als einer je Spieler = widerlegt.
  --    (Gebaeude als Massstab, weil die Gebaeudetabelle im Spiel belegt ist.)
  ----------------------------------------------------------------------
  local hatGebaeude = {}
  M.jedesGebaeude(function(i, typ, owner) 
    if owner and owner >= 0 and owner <= 8 then hatGebaeude[owner] = true end
  end)
  local lords = {}
  M.jedeEinheit(function(i, typ, owner) 
    if typ == 55 then lords[owner] = (lords[owner] or 0) + 1 end
  end)
  local fehler, txt = 0, {}
  for s = 0, 8 do
    if hatGebaeude[s] then
      local k = lords[s] or 0
      txt[#txt+1] = string.format("S%d:%d", s, k)
      if k ~= 1 then fehler = fehler + 1 end
    end
  end
  pruefe(4, "jeder Spieler mit Gebaeuden hat genau 1 Lord", fehler == 0,
         "Lords je Spieler " .. table.concat(txt, " "))

  ----------------------------------------------------------------------
  -- 5) Kein Lord ohne Gebaeude, und die Gesamtzahl der Lords ist <= 9.
  ----------------------------------------------------------------------
  local gesamt = 0
  for _, k in pairs(lords) do gesamt = gesamt + k end
  pruefe(5, "hoechstens 9 Lords insgesamt", gesamt <= 9, "Lords gesamt = " .. gesamt)

  ----------------------------------------------------------------------
  -- Uebersicht zum Mitlesen - keine Bewertung, nur Zahlen
  ----------------------------------------------------------------------
  sag("--- belegte Einheiten je Besitzer ---")
  for s = 0, 8 do
    if proOwner[s] then sag(string.format("   Spieler %d: %d Einheiten%s",
      s, proOwner[s], hatGebaeude[s] and " (hat Gebaeude)" or "")) end
  end
  local liste = {}
  for t, k in pairs(proTyp) do liste[#liste+1] = {t, k} end
  table.sort(liste, function(a,b) return a[2] > b[2] end)
  sag("--- haeufigste Typen ---")
  for i = 1, math.min(8, #liste) do
    sag(string.format("   Typ %3d: %d", liste[i][1], liste[i][2]))
  end

  sag(rot == 0 and "=== ALLE GRUEN - Adresse gilt als belegt ==="
                or string.format("=== %d ROT - Adresse bleibt widerlegt ===", rot))
  return rot == 0, zeile
end

return T
