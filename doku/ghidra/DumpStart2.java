import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.*;
import ghidra.program.model.data.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.util.*;

// Was muss stehen, bevor LaunchSkirmishGame gerufen werden darf?
public class DumpStart2 extends GhidraScript {
    public void run() throws Exception {
        DecompInterface d = new DecompInterface();
        d.openProgram(currentProgram);
        AddressSpace sp = currentProgram.getAddressFactory().getDefaultAddressSpace();

        println("### Wer ruft LaunchSkirmishGame (0x441270) auf?");
        for (Reference ref : getReferencesTo(sp.getAddress(0x441270L))) {
            Function auf = getFunctionContaining(ref.getFromAddress());
            println(String.format("   %s  %s   in %s", ref.getFromAddress(),
                ref.getReferenceType().getName(),
                auf == null ? "(unbekannt)" : auf.getName() + " @ " + auf.getEntryPoint()));
        }

        println("");
        println("### Die Lobby-Struktur: wo liegt sie, was steht drin?");
        for (Symbol s : currentProgram.getSymbolTable().getAllSymbols(true)) {
            String n = s.getName();
            if (n.contains("SkirmishLobby") || n.contains("LobbySetup")
                || n.equals("DAT_SkirmishLobbySetup"))
                println(String.format("   %s  %s", s.getAddress(), n));
        }
        Iterator<DataType> it = currentProgram.getDataTypeManager().getAllDataTypes();
        Set<String> g = new HashSet<>();
        while (it.hasNext()) {
            DataType dt = it.next();
            if (!dt.getName().startsWith("SkirmishLobbySetup") || !(dt instanceof Structure)) continue;
            if (!g.add(dt.getPathName())) continue;
            Structure st = (Structure) dt;
            println("   --- " + dt.getPathName() + " (" + st.getLength() + " Byte)");
            int k = 0;
            for (DataTypeComponent c : st.getDefinedComponents()) {
                DataType ct = c.getDataType();
                String ex = "";
                if (ct instanceof Array) { Array ar = (Array) ct;
                    ex = String.format("  [%d x %d]", ar.getNumElements(), ar.getElementLength()); }
                println(String.format("      +0x%04X  %-32s %-20s%s", c.getOffset(),
                    c.getFieldName()==null?"?":c.getFieldName(), ct.getName(), ex));
                if (++k > 30) { println("      ..."); break; }
            }
        }

        println("");
        println("### restoreSkirmishLobbySetup (0x490060) - stellt eine Lobby wieder her?");
        Function f = getFunctionContaining(sp.getAddress(0x490060L));
        if (f != null) {
            println("   " + f.getSignature() + "   [" + f.getCallingConventionName() + "]");
            DecompileResults r = d.decompileFunction(f, 90, monitor);
            if (r.decompileCompleted()) {
                String[] z = r.getDecompiledFunction().getC().split("\n");
                for (int i = 0; i < Math.min(45, z.length); i++) println("   " + z[i]);
            }
        }

        println("");
        println("### Signaturen der uebrigen Kandidaten");
        long[] adr = {0x4274F0L, 0x487650L, 0x4C68D0L, 0x429710L, 0x4C62C0L};
        for (long x : adr) {
            Function q = getFunctionContaining(sp.getAddress(x));
            if (q != null) println(String.format("   %s  %-46s [%s]", q.getEntryPoint(),
                q.getSignature().getPrototypeString(), q.getCallingConventionName()));
        }
        d.dispose();
    }
}
