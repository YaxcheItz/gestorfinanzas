package com.gestionfinanzas.ai;

import com.gestionfinanzas.dto.response.CuentaResponse;
import com.gestionfinanzas.dto.response.CategoriaResponse;
import com.gestionfinanzas.dto.response.TransaccionResponse;
import com.gestionfinanzas.model.enums.TipoCuenta;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.DayOfWeek;
import java.time.format.DateTimeFormatter;
import java.time.format.ResolverStyle;
import java.util.*;
import java.util.regex.*;

/** Reglas deterministas: nunca llama a proveedores ni escribe movimientos. */
public final class MotorChatReglas {
    private static final Pattern MONTO = Pattern.compile("(?<![\\p{L}\\d-])\\$?([0-9][0-9.,]*)(?![\\p{L}])");
    private static final Pattern FECHA = Pattern.compile("\\b(\\d{4}-\\d{2}-\\d{2}|\\d{1,2}/\\d{1,2}(?:/\\d{4})?)\\b");
    private static final Map<String, Set<String>> DICCIONARIO = Map.ofEntries(
        Map.entry("comida", Set.of("tacos","taco","comida","restaurante","cafe","cafeteria","pizza","hamburguesa","desayuno","almuerzo","cena")),
        Map.entry("supermercado", Set.of("super","supermercado","despensa","abarrotes","walmart","soriana","chedraui")),
        Map.entry("alimentos", Set.of("super","despensa","abarrotes","tacos","comida")),
        Map.entry("transporte", Set.of("uber","didi","taxi","gasolina","metro","camion","autobus","transporte")),
        Map.entry("servicios", Set.of("luz","agua","internet","telefono","gas","cfe")),
        Map.entry("hogar", Set.of("renta","hogar","muebles","alquiler")),
        Map.entry("salud", Set.of("farmacia","doctor","medicina","hospital","salud")),
        Map.entry("entretenimiento", Set.of("cine","netflix","spotify","juegos","entretenimiento")),
        Map.entry("salario", Set.of("nomina","sueldo","salario","quincena")),
        Map.entry("ingresos", Set.of("nomina","sueldo","salario","quincena"))
    );
    public record Resultado(Map<String,Object> datos, String respuesta, List<String> sugerencias,
                            String contexto, String reporte, LocalDate desde, LocalDate hasta, String moneda) {}
    private record Periodo(LocalDate desde, LocalDate hasta, String texto) {}
    private static Resultado pregunta(String mensaje, String respuesta, List<String> opciones) {
        return new Resultado(null,respuesta,opciones,mensaje,null,null,null,null);
    }
    public static String normalizar(String texto) {
        return Normalizer.normalize(texto == null ? "" : texto,Normalizer.Form.NFD)
            .replaceAll("\\p{M}","").toLowerCase(Locale.ROOT).replaceAll("\\s+"," ").strip();
    }
    private static boolean palabra(String texto, String termino) {
        return Pattern.compile("(?<![\\p{L}\\d])"+Pattern.quote(termino)+"(?![\\p{L}\\d])").matcher(texto).find();
    }
    public Resultado interpretar(String mensaje, List<CuentaResponse> cuentasEntrada,
                                  List<CategoriaResponse> categorias, List<TransaccionResponse> recientes, LocalDate hoy) {
        String texto=normalizar(mensaje);
        if (texto.isBlank()) return pregunta(mensaje,"Escribe un movimiento o pide un reporte.",List.of("Gasté 80 en tacos","Reporte de este mes"));
        if (Set.of("hola","ayuda","que puedes hacer","buenas").contains(texto)) return new Resultado(null,"Escribe un gasto, ingreso o transferencia, o pide un resumen, saldo, categor\u00edas o presupuestos. La fecha predeterminada es hoy.",List.of("Gast\u00e9 80 en tacos","Recib\u00ed 900 de sueldo","Reporte de este mes"),null,null,null,null,null);
        Periodo periodo;
        try { periodo=periodo(texto,hoy); }
        catch (IllegalArgumentException ex) { return pregunta(mensaje,"Esa fecha no es válida. Usa día/mes/año o año-mes-día.",List.of()); }
        if (texto.matches(".*\\b(manana|lunes|martes|miercoles|jueves|viernes|sabado|domingo)\\b.*")) return pregunta(mensaje,"Indica la fecha exacta con formato año-mes-día para evitar registrar en el día equivocado.",List.of());
        String textoMoneda=texto;
        for (CuentaResponse c:cuentasEntrada) textoMoneda=textoMoneda.replaceAll("(?<![\\p{L}\\d])"+Pattern.quote(normalizar(c.nombre()))+"(?![\\p{L}\\d])"," ");
        String moneda=moneda(textoMoneda);
        boolean consulta=texto.matches(".*\\b(reporte|reportes|resumen|grafico|grafica|categorias|presupuesto|presupuestos|saldo|balance|cuanto|cuanta|cuantos|cuantas|como voy|en que|top|alertas|gastos fijos)\\b.*") || texto.equals("ingresos") || texto.equals("gastos");
        if (consulta) {
            if (FECHA.matcher(texto).results().count()>1 || MONTO.matcher(FECHA.matcher(texto).replaceAll(" ").replaceAll("ultimos 7 dias", " ")).find() || texto.matches(".*\\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|ano|anual|trimestre)\\b.*")) return null;
            if (texto.matches(".*\\ben\\s+(?!que |categorias?\\b|mxn\\b|usd\\b|eur\\b|cad\\b|gbp\\b).+") || texto.matches(".*\\b(desde|usando|cuenta|tarjeta)\\b.*") && !texto.contains("saldo")) return null;
            if (texto.matches(".*\\b(compara|comparar|proyeccion|predice|pronostico|inversion|recomienda)\\b.*")) return null;
            String modo=texto.matches(".*\\b(presupuesto|presupuestos|alertas)\\b.*") ? "PRESUPUESTOS" : texto.contains("gastos fijos") ? "RECURRENTES" : texto.matches(".*\\b(saldo|balance|cuanto tengo)\\b.*") ? "SALDO" : texto.matches(".*\\b(categoria|categorias|top|en que)\\b.*") ? "CATEGORIAS" : "RESUMEN";
            return new Resultado(null,null,List.of(),null,modo,periodo.desde(),periodo.hasta(),moneda);
        }
        if (FECHA.matcher(texto).results().count()>1 || texto.matches(".*\\b(semana|mes)\\b.*")) return pregunta(mensaje,"Indica un día exacto para registrar el movimiento; por ejemplo hoy, ayer o 2026-10-04.",List.of());
        boolean transfer=texto.matches(".*\\b(transferencia|transferi|transferir|transfiero|traspase|traspaso|movi|mover)\\b.*");
        boolean ingreso=texto.matches(".*\\b(ingreso|ingrese|recibi|cobre|cobro|depositaron|me pagaron|nomina|sueldo|salario)\\b.*");
        boolean gasto=texto.matches(".*\\b(gasto|gaste|pague|pago|compre|compra|gastos)\\b.*");
        TipoTransaccion tipo=transfer ? TipoTransaccion.TRANSFERENCIA : ingreso ? TipoTransaccion.INGRESO : gasto ? TipoTransaccion.GASTO : null;
        List<CuentaResponse> cuentas=cuentasEntrada.stream().filter(CuentaResponse::activo).toList();
        String sinFechas=FECHA.matcher(periodo.texto()).replaceAll(" ");
        for (CuentaResponse cuenta:cuentas) sinFechas=sinFechas.replaceAll("(?<![\\p{L}\\d])"+Pattern.quote(normalizar(cuenta.nombre()))+"(?![\\p{L}\\d])"," ");
        Matcher matcher=MONTO.matcher(sinFechas);
        if (!matcher.find()) {
            if (tipo==null) return null;
            return pregunta(mensaje,"\u00bfCu\u00e1l es el monto? Hoy se usa autom\u00e1ticamente si no indicas otra fecha.",List.of());
        }
        BigDecimal monto;
        try { monto=monto(matcher.group(1)); }
        catch (RuntimeException ex) { return pregunta(mensaje,"Revisa el monto; por ejemplo 80, 80.50 o 1,200.50.",List.of()); }
        if (monto.signum()<=0 || monto.precision()-monto.scale()>13) return pregunta(mensaje,"El monto debe ser mayor que cero y tener como m\u00e1ximo 13 cifras enteras.",List.of());
        String sinMonto=sinFechas.substring(0,matcher.start())+" "+sinFechas.substring(matcher.end());
        if (tipo==null) {
            Set<String> tokens=new HashSet<>(Arrays.asList(sinMonto.split("\\W+")));
            if (DICCIONARIO.values().stream().anyMatch(alias -> !Collections.disjoint(alias,tokens))) tipo=TipoTransaccion.GASTO;
            else return pregunta(mensaje,"\u00bfEs gasto, ingreso o transferencia?",List.of("Gasto "+mensaje,"Ingreso "+mensaje,"Transferencia "+mensaje));
        }
        if (cuentas.isEmpty()) return pregunta(mensaje,"Primero crea una cuenta en Configuraci\u00f3n \u2192 Cuentas.",List.of());
        CuentaResponse origen=null,destino=null;
        List<CuentaResponse> mencionadas=cuentas.stream().filter(c -> coincideCuenta(texto,c)).toList();
        boolean cuentaExplicita=texto.matches(".*\\b(desde|con|usando|cuenta|tarjeta)\\b.*");
        if (transfer) {
            int posicion=texto.lastIndexOf(" a ");
            String izquierdo=posicion>=0?texto.substring(0,posicion):texto;
            String derecho=posicion>=0?texto.substring(posicion+3):"";
            List<CuentaResponse> origenes=cuentas.stream().filter(c -> coincideCuenta(izquierdo,c)).toList();
            if (origenes.isEmpty() && texto.contains("desde ")) {
                String explicito=texto.substring(texto.lastIndexOf("desde ")+6);
                origenes=cuentas.stream().filter(c -> coincideCuenta(explicito,c)).toList();
            }
            final Long origenId=origenes.size()==1?origenes.get(0).id():null;
            List<CuentaResponse> destinos=cuentas.stream().filter(c -> coincideCuenta(derecho,c)&&!c.id().equals(origenId)).toList();
            if (origenes.size()==1) origen=origenes.get(0);
            if (destinos.size()==1) destino=destinos.get(0);
            if (origen==null) return pregunta(mensaje+" desde","\u00bfDesde qu\u00e9 cuenta transfieres? Escribe: transfer\u00ed "+monto+" de Cuenta A a Cuenta B.",cuentas.stream().map(c -> mensaje+" desde "+c.nombre()).limit(6).toList());
            if (destino==null) return pregunta(mensaje+" a","\u00bfA qu\u00e9 cuenta?",cuentas.stream().filter(c -> !c.id().equals(origenId)).map(c -> mensaje+" a "+c.nombre()).limit(6).toList());
            if (origen.id().equals(destino.id())) return pregunta(mensaje,"La cuenta de destino debe ser distinta de la de origen.",List.of());
            if (origen.tipo()==TipoCuenta.CREDITO && destino.tipo()==TipoCuenta.CREDITO) return pregunta(mensaje,"No se permiten transferencias entre tarjetas de cr\u00e9dito.",List.of());
        } else {
            if (mencionadas.size()>1) return pregunta(mensaje,"Hay varias cuentas posibles. Indica una con 'desde Nombre'.",mencionadas.stream().map(c -> mensaje+" desde "+c.nombre()).toList());
            if (mencionadas.size()==1) origen=mencionadas.get(0);
            else if (cuentaExplicita) return pregunta(mensaje,"No pude identificar esa cuenta. Estas son tus cuentas activas:",cuentas.stream().map(c -> mensaje+" desde "+c.nombre()).limit(6).toList());
            if (origen==null) {
                final TipoTransaccion tipoFinal=tipo;
                origen=recientes.stream().filter(t -> t.tipo()==tipoFinal).map(t -> cuentas.stream().filter(c -> c.id().equals(t.cuentaId())).findFirst().orElse(null)).filter(Objects::nonNull).filter(c -> moneda==null||c.moneda().equals(moneda)).findFirst().orElse(null);
                if (origen==null) origen=cuentas.stream().filter(c -> moneda==null||c.moneda().equals(moneda)).min(Comparator.comparingInt(c -> c.tipo()==TipoCuenta.EFECTIVO?0:1)).orElse(null);
            }
        }
        if (origen==null || moneda!=null&&!origen.moneda().equals(moneda)) return pregunta(mensaje,"Elige una cuenta de la moneda indicada.",List.of());
        BigDecimal tasa=null;
        if (transfer && !origen.moneda().equals(destino.moneda())) {
            Matcher cambio=Pattern.compile("(?:tasa|cambio)(?: de| a)?\\s+([0-9][0-9.,]*)").matcher(texto);
            if (!cambio.find()) return pregunta(mensaje,"Las cuentas tienen monedas diferentes. Agrega 'tasa 0.05' (destino por cada unidad de origen).",List.of());
            try { tasa=new BigDecimal(cambio.group(1).replace(',','.')); if(tasa.signum()<=0) throw new IllegalArgumentException(); }
            catch (RuntimeException ex) { return pregunta(mensaje,"La tasa debe ser un n\u00famero mayor que cero.",List.of()); }
        }
        if (MONTO.matcher(sinMonto.replaceAll("(?:tasa|cambio)(?: de| a)?\\s+[0-9][0-9.,]*", " ")).find()) return null; // Varias operaciones: no combinar importes.
        final TipoTransaccion tipoFinal=tipo;
        String concepto=sinMonto.replaceAll("\\b(por favor|registra|registrar|anota|captura|un|una|gaste|gasto|pague|pago|compre|compra|ingreso|ingrese|recibi|cobre|cobro|depositaron|me pagaron|transferencia|transferi|transferir|transfiero|traspase|traspaso|movi|desde|usando|con|cuenta|tarjeta|pesos|peso|mxn|usd|eur|cad|gbp|de|en|a|hoy|ayer|anteayer)\\b"," ").replaceAll("\\s+"," ").strip();
        CategoriaResponse categoria=null;
        if (!transfer) {
            List<CategoriaResponse> opciones=categorias.stream().filter(c -> c.activo()&&c.tipo()==tipoFinal).toList();
            // Nombre exacto primero; luego memoria confirmada del concepto; finalmente diccionario de palabras.
            categoria=opciones.stream().filter(c -> palabra(texto,normalizar(c.nombre()))).max(Comparator.comparingInt(c -> c.nombre().length())).orElse(null);
            if(categoria==null && !concepto.isBlank()) {
                Set<String> palabras=new HashSet<>(Arrays.asList(concepto.split("\\W+")));
                categoria=recientes.stream().filter(t -> t.tipo()==tipoFinal && t.categoriaId()!=null && t.descripcion()!=null && Arrays.stream(normalizar(t.descripcion()).split("\\W+")).anyMatch(w -> w.length()>2&&palabras.contains(w))).map(t -> opciones.stream().filter(c -> c.id().equals(t.categoriaId())).findFirst().orElse(null)).filter(Objects::nonNull).findFirst().orElse(null);
                if(categoria==null) categoria=opciones.stream().filter(c -> DICCIONARIO.entrySet().stream().anyMatch(e -> normalizar(c.nombre()).contains(e.getKey()) && !Collections.disjoint(e.getValue(),palabras))).findFirst().orElse(null);
            }
        }
        Map<String,Object> datos=new LinkedHashMap<>();
        datos.put("tipo",tipo.name());datos.put("monto",monto);datos.put("cuentaId",origen.id());datos.put("categoriaId",categoria==null?null:categoria.id());
        datos.put("fecha",periodo.hasta().toString());datos.put("descripcion",concepto.isBlank()?tipo.name():concepto.substring(0,Math.min(200,concepto.length())));
        if(transfer) {datos.put("cuentaDestinoId",destino.id());if(tasa!=null)datos.put("tasaCambio",tasa);}
        String resumen=(transfer?"Transferencia":tipo==TipoTransaccion.GASTO?"Gasto":"Ingreso")+" de "+monto.toPlainString()+" "+origen.moneda()+" \u00b7 "+origen.nombre()+(destino==null?"":" \u2192 "+destino.nombre())+" \u00b7 "+periodo.hasta()+(categoria==null?"":" \u00b7 "+categoria.nombre());
        return new Resultado(datos,resumen,List.of(),null,null,null,null,null);
    }
    private static boolean coincideCuenta(String texto,CuentaResponse cuenta) {
        String nombre=normalizar(cuenta.nombre());
        if(palabra(texto,nombre))return true;
        return Arrays.stream(nombre.split("\\W+")).filter(t -> t.length()>=3&&!Set.of("cuenta","tarjeta","credito","debito","billetera","ahorro").contains(t)).anyMatch(t -> palabra(texto,t));
    }
    private static String moneda(String texto) {
        for(String m:List.of("MXN","USD","EUR","CAD","GBP"))if(palabra(texto,m.toLowerCase(Locale.ROOT)))return m;
        if(palabra(texto,"dolares"))return "USD";
        if(palabra(texto,"euros"))return "EUR";
        return null;
    }
    private static BigDecimal monto(String texto) {
        texto=texto.replaceAll("[.,]+$","");int coma=texto.lastIndexOf(','),punto=texto.lastIndexOf('.');
        if(coma>=0&&punto>=0)texto=coma>punto?texto.replace(".","").replace(',','.'):texto.replace(",","");
        else if(coma>=0)texto=texto.length()-coma-1<=2?texto.replace(',','.'):texto.replace(",","");
        return new BigDecimal(texto).setScale(2,java.math.RoundingMode.UNNECESSARY);
    }
    private static Periodo periodo(String texto,LocalDate hoy) {
        Matcher fecha=FECHA.matcher(texto);LocalDate desde=hoy.withDayOfMonth(1),hasta=hoy;
        if(fecha.find()) {
            String f=fecha.group(1);
            try {
                if(f.contains("-"))hasta=LocalDate.parse(f);
                else {String[] n=f.split("/");hasta=LocalDate.of(n.length==3?Integer.parseInt(n[2]):hoy.getYear(),Integer.parseInt(n[1]),Integer.parseInt(n[0]));}
                desde=hasta;
            }catch(RuntimeException ex){throw new IllegalArgumentException(ex);}
        } else if(palabra(texto,"anteayer"))desde=hasta=hoy.minusDays(2);
        else if(palabra(texto,"ayer"))desde=hasta=hoy.minusDays(1);
        else if(palabra(texto,"hoy"))desde=hasta=hoy;
        else if(texto.contains("semana pasada")){hasta=hoy.with(DayOfWeek.MONDAY).minusDays(1);desde=hasta.minusDays(6);}
        else if(palabra(texto,"semana")){desde=hoy.with(DayOfWeek.MONDAY);}
        else if(texto.contains("mes pasado")){desde=hoy.minusMonths(1).withDayOfMonth(1);hasta=desde.withDayOfMonth(desde.lengthOfMonth());}
        // Fechas descriptivas se quitan para evitar interpretar el 7 como monto.
        String limpio=texto.replaceAll("\\b(?:ultimos|ultimas) 7 dias\\b", "esta semana");
        if(texto.contains("ultimos 7 dias")){desde=hoy.minusDays(6);hasta=hoy;}
        return new Periodo(desde,hasta,limpio);
    }
}
