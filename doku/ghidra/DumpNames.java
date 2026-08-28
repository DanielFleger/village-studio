import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;

public class DumpNames extends GhidraScript {
    public void run() throws Exception {
        // AIVDefinedData +0x234 = aivFileNames char[16][8][50]
        Address basis = currentProgram.getAddressFactory().getAddress("0xB46358");
        println("### aivFileNames ab " + basis + "   (16 Lords x 8 Burgen x 50 Zeichen)");
        for (int lord = 0; lord < 16; lord++) {
            StringBuilder sb = new StringBuilder();
            for (int burg = 0; burg < 8; burg++) {
                Address a = basis.add((long) (lord * 8 + burg) * 50);
                StringBuilder s = new StringBuilder();
                for (int k = 0; k < 50; k++) {
                    byte b = getByte(a.add(k));
                    if (b == 0) break;
                    s.append((char) (b & 0xff));
                }
                if (s.length() > 0) sb.append(s).append("  ");
            }
            println(String.format("   aiType %2d : %s", lord, sb.toString().trim()));
        }
    }
}
