import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.*;
import ghidra.program.model.data.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.util.*;

// Die zwei Zahlen, an denen das Einheiten-Array haengt:
//   1) wo liegt DAT_UnitsState wirklich
//   2) bei welchem Offset beginnt units[] darin, und wie gross ist ein Eintrag
public class DumpSpawn2 extends GhidraScript {
    public void run() throws Exception {
        println("### Symbole mit UnitsState im Namen");
        SymbolTable st = currentProgram.getSymbolTable();
        for (Symbol s : st.getAllSymbols(true)) {
            if (!s.getName().contains("UnitsState")) continue;
            println(String.format("   %s  %-40s %s", s.getAddress(), s.getName(), s.getSymbolType()));
        }

        println("");
        println("### Struktur UnitsState - die ersten Felder");
        Iterator<DataType> it = currentProgram.getDataTypeManager().getAllDataTypes();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().equals("UnitsState") || !(d instanceof Structure)) continue;
            Structure s = (Structure) d;
            println("   Gesamtlaenge: " + s.getLength() + " Byte");
            for (DataTypeComponent c : s.getDefinedComponents()) {
                DataType ct = c.getDataType();
                String extra = "";
                if (ct instanceof Array) {
                    Array ar = (Array) ct;
                    extra = String.format("  [%d Eintraege je %d Byte]",
                        ar.getNumElements(), ar.getElementLength());
                }
                println(String.format("   +0x%06X  %-34s %-24s %d%s", c.getOffset(),
                    c.getFieldName() == null ? "?" : c.getFieldName(),
                    ct.getName(), c.getLength(), extra));
            }
        }

        println("");
        println("### Struktur Unit - Groesse und die Felder, die spawnUnit schreibt");
        it = currentProgram.getDataTypeManager().getAllDataTypes();
        Set<String> gesehen = new HashSet<>();
        String[] wichtig = {"uid","logicalState","owner","x","y","tile","unitType","type",
                            "displayColorPlayerID","calculatedOwnerPlayerIndex","health","hitpoints",
                            "microXPosition","microYPosition","stoneAmmunition"};
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().equals("Unit") || !(d instanceof Structure)) continue;
            Structure s = (Structure) d;
            if (!gesehen.add(d.getPathName())) continue;
            println("   " + d.getPathName() + " = " + s.getLength() + " Byte");
            for (DataTypeComponent c : s.getDefinedComponents()) {
                String n = c.getFieldName() == null ? "" : c.getFieldName();
                for (String w : wichtig)
                    if (n.equalsIgnoreCase(w) || n.toLowerCase().contains(w.toLowerCase())) {
                        println(String.format("      +0x%04X  %-34s %s", c.getOffset(), n,
                            c.getDataType().getName()));
                        break;
                    }
            }
        }

        println("");
        println("### Rohe Anweisungen am Schleifenkopf von spawnUnit (0x53E440..0x53E480)");
        Address a = currentProgram.getAddressFactory().getDefaultAddressSpace().getAddress(0x53E440L);
        Listing l = currentProgram.getListing();
        Instruction i = l.getInstructionAt(a);
        int n = 0;
        while (i != null && n++ < 22) {
            StringBuilder ref = new StringBuilder();
            for (Reference r : i.getReferencesFrom())
                if (r.getReferenceType().isData()) {
                    Symbol sy = getSymbolAt(r.getToAddress());
                    ref.append("   -> ").append(r.getToAddress())
                       .append(sy == null ? "" : " (" + sy.getName() + ")");
                }
            println(String.format("   %s  %-38s%s", i.getAddress(), i.toString(), ref));
            i = i.getNext();
        }
    }
}
