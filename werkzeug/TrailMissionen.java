// Liest die Gefechtspfad-Missionen aus der exe: wie viele Spieler, welche KI,
// welche Startplaetze, welche Teams. Beantwortet die Frage, welche Mission
// ueberhaupt ein spielbares Match ergibt.
//
// SHC_BASIS = Adresse des ersten Eintrags, SHC_ANZAHL = wie viele.
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;

public class TrailMissionen extends GhidraScript {
    @Override
    public void run() throws Exception {
        String basis = System.getenv("SHC_BASIS");
        int anzahl = Integer.parseInt(System.getenv("SHC_ANZAHL"));
        Address a = currentProgram.getAddressFactory().getAddress(basis);

        println("Nr | Spieler | KI 1..8                  | Plaetze 1..8             | Teams 1..8");
        for (int i = 0; i < anzahl; i++) {
            Address e = a.add((long) i * 144);
            int n = getInt(e.add(0x0C));
            StringBuilder ki = new StringBuilder();
            StringBuilder pos = new StringBuilder();
            StringBuilder team = new StringBuilder();
            for (int k = 0; k < 8; k++) {
                ki.append(String.format("%3d", getInt(e.add(0x10 + k * 4))));
                pos.append(String.format("%3d", getInt(e.add(0x30 + k * 4))));
                team.append(String.format("%3d", getInt(e.add(0x50 + k * 4))));
            }
            println(String.format("%2d | %7d | %s | %s | %s", i, n, ki, pos, team));
        }
    }
}
