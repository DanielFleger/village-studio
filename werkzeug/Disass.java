// Gibt ab jeder Adresse in SHC_ADR SHC_N Befehle als Assembler aus.
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Instruction;

public class Disass extends GhidraScript {
    @Override
    public void run() throws Exception {
        String adr = System.getenv("SHC_ADR");
        int n = Integer.parseInt(System.getenv("SHC_N") == null ? "20" : System.getenv("SHC_N"));
        for (String s : adr.split(",")) {
            Address a = currentProgram.getAddressFactory().getAddress(s.trim());
            println("ASM ---- " + s.trim());
            Instruction i = getInstructionAt(a);
            for (int k = 0; k < n && i != null; k++) {
                println("ASM " + i.getAddress() + "  " + i.toString());
                i = i.getNext();
            }
        }
    }
}
