import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.mem.*;
import ghidra.program.model.symbol.*;
import java.util.*;

// Bytefolge zum Auffinden von SetupSkirmishMode + Zustandsfelder, an denen
// sich erkennen laesst, ob gerade ein Gefecht laeuft.
public class DumpStart4 extends GhidraScript {
    public void run() throws Exception {
        AddressSpace sp = currentProgram.getAddressFactory().getDefaultAddressSpace();
        Memory m = currentProgram.getMemory();

        for (long adr : new long[]{0x4C68D0L, 0x441270L}) {
            Address a = sp.getAddress(adr);
            Function f = getFunctionContaining(a);
            println("### " + (f == null ? "?" : f.getName()) + " @ " + a);
            byte[] b = new byte[28];
            m.getBytes(a, b);
            StringBuilder hex = new StringBuilder();
            for (byte x : b) hex.append(String.format("%02x ", x));
            println("   Bytes: " + hex.toString().trim());
            // die ersten Anweisungen, damit klar ist, wo es eindeutig wird
            Instruction i = currentProgram.getListing().getInstructionAt(a);
            int n = 0;
            while (i != null && n++ < 7) { println("     " + i.getAddress() + "  " + i); i = i.getNext(); }
            println("");
        }

        println("### Zustandsfelder: laeuft gerade ein Gefecht?");
        String[] such = {"DAT_GameCore", "DAT_GameSynchronyState", "gameMode", "currentGameMode",
                         "currentTrailType", "DAT_SkirmishDefinedData"};
        for (Symbol s : currentProgram.getSymbolTable().getAllSymbols(true)) {
            String n = s.getName();
            for (String w : such) {
                if (n.equals(w) || n.equals("DAT_GameCore.gameMode_2")
                    || n.equals("DAT_GameSynchronyState.currentGameMode")
                    || n.equals("DAT_GameCore.currentTrailType")
                    || n.equals("DAT_GameCore.mapTimeInTicks")) {
                    println(String.format("   %s  %s", s.getAddress(), n));
                    break;
                }
            }
        }

        println("");
        println("### GameMode-Werte");
        Iterator<ghidra.program.model.data.DataType> it =
            currentProgram.getDataTypeManager().getAllDataTypes();
        Set<String> g = new HashSet<>();
        while (it.hasNext()) {
            ghidra.program.model.data.DataType d = it.next();
            if (!(d instanceof ghidra.program.model.data.Enum)) continue;
            if (!d.getName().startsWith("GameMode")) continue;
            if (!g.add(d.getName())) continue;
            ghidra.program.model.data.Enum e = (ghidra.program.model.data.Enum) d;
            for (String n : e.getNames()) println("   " + e.getValue(n) + " = " + n);
            break;
        }

        println("");
        println("### TrailType-Werte");
        it = currentProgram.getDataTypeManager().getAllDataTypes();
        g.clear();
        while (it.hasNext()) {
            ghidra.program.model.data.DataType d = it.next();
            if (!(d instanceof ghidra.program.model.data.Enum)) continue;
            if (!d.getName().startsWith("TrailType")) continue;
            if (!g.add(d.getName())) continue;
            ghidra.program.model.data.Enum e = (ghidra.program.model.data.Enum) d;
            for (String n : e.getNames()) println("   " + e.getValue(n) + " = " + n);
            break;
        }
    }
}
