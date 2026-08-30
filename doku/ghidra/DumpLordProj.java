import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.Address;
import ghidra.program.model.data.*;
import ghidra.program.model.listing.*;
import java.util.*;
public class DumpLordProj extends GhidraScript {
    public void run() throws Exception {
        // 1. UnitType-Werte mit LORD
        println("### UnitType: Lord und Kampfeinheiten");
        Iterator<DataType> it = currentProgram.getDataTypeManager().getAllDataTypes();
        Set<String> f = new HashSet<>();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().equals("UnitType") || !(d instanceof ghidra.program.model.data.Enum)) continue;
            if (!f.add("x")) continue;
            ghidra.program.model.data.Enum e = (ghidra.program.model.data.Enum) d;
            List<String> nm = new ArrayList<>(Arrays.asList(e.getNames()));
            nm.sort((a, b) -> Long.compare(e.getValue(a), e.getValue(b)));
            for (String s : nm) {
                String u = s.toUpperCase();
                if (u.contains("LORD") || u.contains("KING") || u.contains("ARCHER") || u.contains("SWORD")
                    || u.contains("SPEAR") || u.contains("KNIGHT") || u.contains("MACE") || u.contains("SLAVE")
                    || u.contains("ASSASSIN") || u.contains("PIKE") || u.contains("CROSSBOW"))
                    println("   " + e.getValue(s) + " = " + s);
            }
        }
        // 2. Geschoss-Strukturen und Adressen
        println("");
        println("### Geschosse: Strukturen");
        it = currentProgram.getDataTypeManager().getAllDataTypes();
        f.clear();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!(d instanceof Structure)) continue;
            String n = d.getName();
            if (!n.equals("Entity") && !n.equals("EntitiesState") && !n.equals("Projectile")) continue;
            if (!f.add(n)) continue;
            println("=== " + n + " (" + d.getLength() + " Byte)");
            int k = 0;
            for (DataTypeComponent c : ((Structure) d).getDefinedComponents()) {
                String fn = c.getFieldName() == null ? "" : c.getFieldName();
                String low = fn.toLowerCase();
                if (c.getOffset() < 0x30 || low.contains("type") || low.contains("owner") || low.contains("target")
                    || low.contains("position") || low.contains("tile") || low.contains("speed")
                    || low.contains("damage") || low.contains("entities") || low.contains("count") || low.contains("uid"))
                    println(String.format("   +0x%05X  %-34s %-22s %d", c.getOffset(), fn, c.getDataType().getName(), c.getLength()));
                if (++k > 200) break;
            }
        }
        println("");
        println("### Adressen");
        DataIterator di = currentProgram.getListing().getDefinedData(true);
        while (di.hasNext()) {
            Data dd = di.next();
            String t = dd.getDataType().getName(), lb = dd.getLabel() == null ? "" : dd.getLabel();
            if (t.startsWith("EntitiesState") || lb.contains("EntitiesState") || lb.contains("DAT_Entities"))
                println("   " + dd.getAddress() + "  " + lb + " : " + t);
        }
        // 3. Lord-Tod
        println("");
        println("### checkSkirmishGameDefeat 0x486600");
        DecompInterface dec = new DecompInterface();
        dec.openProgram(currentProgram);
        Address a = currentProgram.getAddressFactory().getAddress("0x486600");
        Function fn2 = getFunctionContaining(a);
        if (fn2 != null) {
            println("Signatur: " + fn2.getSignature());
            DecompileResults r = dec.decompileFunction(fn2, 120, monitor);
            if (r != null && r.decompileCompleted()) {
                String[] z = r.getDecompiledFunction().getC().split("\n");
                for (int i = 0; i < Math.min(z.length, 45); i++) println("   " + z[i]);
            }
        }
        dec.dispose();
    }
}
