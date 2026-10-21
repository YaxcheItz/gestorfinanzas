package com.gestionfinanzas.ai;

import com.gestionfinanzas.dto.response.CuentaResponse;
import com.gestionfinanzas.dto.response.CategoriaResponse;
import com.gestionfinanzas.dto.response.TransaccionResponse;
import com.gestionfinanzas.dto.response.ListaResponse;
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
    private static final Pattern RANGO = Pattern.compile("\\b(?:del|desde)\\s+(\\d{4}-\\d{2}-\\d{2})\\s+(?:al|hasta)\\s+(\\d{4}-\\d{2}-\\d{2})\\b");
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
                            String contexto, String reporte, LocalDate desde, LocalDate hasta, String moneda,
                            Long cuentaId, Long categoriaId, String cuentaNombre, String categoriaNombre,
                            Long listaId, String listaNombre) {
        public Resultado(Map<String,Object> datos, String respuesta, List<String> sugerencias,
                         String contexto, String reporte, LocalDate desde, LocalDate hasta, String moneda,
                         Long cuentaId, Long categoriaId, String cuentaNombre, String categoriaNombre) {
            this(datos,respuesta,sugerencias,contexto,reporte,desde,hasta,moneda,cuentaId,categoriaId,cuentaNombre,categoriaNombre,null,null);
        }
        public Resultado(Map<String,Object> datos, String respuesta, List<String> sugerencias,
                         String contexto, String reporte, LocalDate desde, LocalDate hasta, String moneda) {
            this(datos,respuesta,sugerencias,contexto,reporte,desde,hasta,moneda,null,null,null,null,null,null);
        }
    }
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
        return interpretar(mensaje, cuentasEntrada, categorias, recientes, hoy, false);
    }
    public Resultado interpretar(String mensaje, List<CuentaResponse> cuentasEntrada,
                                  List<CategoriaResponse> categorias, List<TransaccionResponse> recientes, LocalDate hoy,
                                  boolean exigirCuenta) {
        return interpretar(mensaje,cuentasEntrada,categorias,recientes,hoy,exigirCuenta,List.of());
    }
    public Resultado interpretar(String mensaje, List<CuentaResponse> cuentasEntrada,
                                  List<CategoriaResponse> categorias, List<TransaccionResponse> recientes, LocalDate hoy,
                                  boolean exigirCuenta, List<ListaResponse> listas) {
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
        boolean comparacionMensual=texto.matches(".*\\b(?:compara|comparame|comparar) (?:este mes|el mes actual) (?:con|contra) (?:el mes pasado|el mes anterior|el anterior)\\b.*");
        boolean consultaRecurrente=texto.matches(".*\\b(recurrentes?|plantillas?|fijos?)\\b.*")
                && !MONTO.matcher(FECHA.matcher(texto).replaceAll(" ")).find();
        boolean consulta=texto.matches(".*\\b(reporte|reportes|resumen|grafico|grafica|categorias|categoria|presupuesto|presupuestos|saldo|balance|cuanto|cuanta|cuantos|cuantas|como voy|en que|top|alertas|gastos fijos|gastos|ingresos|compara|comparame|comparar)\\b.*")
                || consultaRecurrente;
        if (consulta) {
            long cantidadFechas=FECHA.matcher(texto).results().count();
            boolean rangoExplicito=RANGO.matcher(texto).find()&&cantidadFechas==2;
            if ((cantidadFechas>1 && !rangoExplicito)
                    || MONTO.matcher(FECHA.matcher(texto).replaceAll(" ").replaceAll("ultimos 7 dias", " ")).find()
                    || texto.matches(".*\\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|ano|anual|trimestre)\\b.*")) return null;
            if(comparacionMensual&&cantidadFechas>0)return null;
            if (texto.matches(".*\\b(compara|comparar|proyeccion|predice|pronostico|inversion|recomienda)\\b.*") && !comparacionMensual) return null;
            List<ListaResponse> listasCoincidentes=List.of();
            if (palabra(texto,"lista")) {
                listasCoincidentes=listas.stream().filter(l->!l.archivada())
                        .filter(l->palabra(texto,normalizar(l.nombre()))).toList();
                if(listasCoincidentes.isEmpty()) return pregunta(mensaje,
                        "No encontré una lista accesible con ese nombre. Elige una de tus listas activas.",
                        listas.stream().filter(l->!l.archivada()).map(ListaResponse::nombre).distinct().limit(10).toList());
                int longitudMaxima=listasCoincidentes.stream().mapToInt(l->normalizar(l.nombre()).length()).max().orElse(0);
                listasCoincidentes=listasCoincidentes.stream().filter(l->normalizar(l.nombre()).length()==longitudMaxima).toList();
                if(listasCoincidentes.size()>1) return pregunta(mensaje,"Hay varias listas con ese nombre. Indica cuál quieres consultar.",
                        listasCoincidentes.stream().map(ListaResponse::nombre).distinct().limit(10).toList());
            }
            ListaResponse listaSeleccionada=listasCoincidentes.isEmpty()?null:listasCoincidentes.getFirst();
            List<CuentaResponse> cuentasCoincidentes=cuentasEntrada.stream().filter(CuentaResponse::activo)
                    .filter(c -> palabra(texto,normalizar(c.nombre()))).toList();
            if (cuentasCoincidentes.size()>1) return pregunta(mensaje,"Hay varias cuentas con ese nombre. Indica el nombre completo de la cuenta.",cuentasCoincidentes.stream().map(CuentaResponse::nombre).distinct().toList());
            boolean cuentaSolicitada=Pattern.compile("\\b(?:desde|usando|cuenta|tarjeta)\\s+(?!este\\b|esta\\b|hoy\\b|ayer\\b|\\d{4}-\\d{2}-\\d{2})[\\p{L}]+").matcher(texto).find();
            if (cuentaSolicitada && cuentasCoincidentes.isEmpty()) return pregunta(mensaje,"No encontré esa cuenta activa. Indica el nombre exacto de una de tus cuentas.",cuentasEntrada.stream().filter(CuentaResponse::activo).map(CuentaResponse::nombre).limit(10).toList());
            List<CategoriaResponse> categoriasCoincidentes=categorias.stream().filter(CategoriaResponse::activo)
                    .filter(c -> palabra(texto,normalizar(c.nombre()))).toList();
            if (categoriasCoincidentes.size()>1) return pregunta(mensaje,"Hay varias categorías con ese nombre. Aclara cuál quieres consultar.",categoriasCoincidentes.stream().map(CategoriaResponse::nombre).distinct().toList());
            if (categoriasCoincidentes.isEmpty() && solicitaCategoria(texto) && contieneFiltroDesconocido(texto,cuentasEntrada,categorias,moneda))
                return pregunta(mensaje,"No encontré esa categoría. Indica el nombre exacto de una categoría activa.",categorias.stream().filter(CategoriaResponse::activo).map(CategoriaResponse::nombre).limit(10).toList());
            if (comparacionMensual) {
                return new Resultado(null,null,List.of(),null,"COMPARACION_MENSUAL",hoy.withDayOfMonth(1),hoy,moneda,
                        cuentasCoincidentes.isEmpty()?null:cuentasCoincidentes.get(0).id(),
                        categoriasCoincidentes.isEmpty()?null:categoriasCoincidentes.get(0).id(),
                        cuentasCoincidentes.isEmpty()?null:cuentasCoincidentes.get(0).nombre(),
                        categoriasCoincidentes.isEmpty()?null:categoriasCoincidentes.get(0).nombre(),
                        listaSeleccionada==null?null:listaSeleccionada.id(),
                        listaSeleccionada==null?null:listaSeleccionada.nombre());
            }
            boolean consultaPlantillas=consultaRecurrente||texto.contains("gastos fijos");
            String modo=texto.matches(".*\\b(presupuesto|presupuestos|alertas)\\b.*") ? "PRESUPUESTOS"
                    : consultaPlantillas&&texto.matches(".*\\b(gastos?|pagos?)\\s+(fijos?|recurrentes?)\\b.*") ? "RECURRENTES_GASTO"
                    : consultaPlantillas&&texto.matches(".*\\b(ingresos?|entradas?)\\s+recurrentes?\\b.*") ? "RECURRENTES_INGRESO"
                    : consultaPlantillas ? "RECURRENTES"
                    : texto.matches(".*\\b(saldo|balance|cuanto tengo)\\b.*") ? "SALDO"
                    : texto.matches(".*\\b(categoria|categorias|top|en que)\\b.*") ? "CATEGORIAS" : "RESUMEN";
            return new Resultado(null,null,List.of(),null,modo,periodo.desde(),periodo.hasta(),moneda,
                    cuentasCoincidentes.isEmpty()?null:cuentasCoincidentes.get(0).id(),
                    categoriasCoincidentes.isEmpty()?null:categoriasCoincidentes.get(0).id(),
                    cuentasCoincidentes.isEmpty()?null:cuentasCoincidentes.get(0).nombre(),
                    categoriasCoincidentes.isEmpty()?null:categoriasCoincidentes.get(0).nombre(),
                    listaSeleccionada==null?null:listaSeleccionada.id(),
                    listaSeleccionada==null?null:listaSeleccionada.nombre());
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
        List<CuentaResponse> mencionadas=cuentasMencionadas(texto,cuentas,exigirCuenta);
        boolean cuentaExplicita=texto.matches(".*\\b(desde|con|usando|cuenta|tarjeta)\\b.*");
        if (transfer) {
            int posicion=texto.lastIndexOf(" a ");
            String izquierdo=posicion>=0?texto.substring(0,posicion):texto;
            String derecho=posicion>=0?texto.substring(posicion+3):"";
            List<CuentaResponse> origenes=cuentasMencionadas(izquierdo,cuentas,exigirCuenta);
            if (origenes.isEmpty() && texto.contains("desde ")) {
                String explicito=texto.substring(texto.lastIndexOf("desde ")+6);
                origenes=cuentasMencionadas(explicito,cuentas,exigirCuenta);
            }
            final Long origenId=origenes.size()==1?origenes.get(0).id():null;
            List<CuentaResponse> destinos=cuentasMencionadas(derecho,cuentas,exigirCuenta).stream().filter(c -> !c.id().equals(origenId)).toList();
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
                if (exigirCuenta) return pregunta(FECHA.matcher(mensaje).find()?mensaje:mensaje+" "+periodo.hasta(),"¿De qué cuenta salió o a cuál llegó el dinero? Indica el nombre de la cuenta.",cuentas.stream().map(c -> c.nombre()).limit(20).toList());
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
    private static List<CuentaResponse> cuentasMencionadas(String texto,List<CuentaResponse> cuentas,boolean exigirCuenta) {
        if(exigirCuenta) {
            var exactas=cuentas.stream().filter(c->palabra(texto,normalizar(c.nombre()))).toList();
            if(!exactas.isEmpty()) return exactas.stream().filter(c->exactas.stream().noneMatch(otra->normalizar(otra.nombre()).length()>normalizar(c.nombre()).length()&&palabra(normalizar(otra.nombre()),normalizar(c.nombre())))).toList();
        }
        return cuentas.stream().filter(c->coincideCuenta(texto,c)).toList();
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
    private static boolean solicitaCategoria(String texto) {
        return Pattern.compile("\\b(?:categoria|categorias)\\s+(?!por\\b)[\\p{L}]+|\\b(?:gastos?|compras?)\\s+(?:de|en)\\s+(?!este\\s+mes|mes\\b|la\\s+semana|esta\\s+semana|hoy\\b|ayer\\b)[\\p{L}]+|\\ben\\s+(?!que\\b|mxn\\b|usd\\b|eur\\b|cad\\b|gbp\\b|la\\s+lista)[\\p{L}]+")
                .matcher(texto).find();
    }
    private static boolean contieneFiltroDesconocido(String texto,List<CuentaResponse> cuentas,
                                                       List<CategoriaResponse> categorias,String moneda) {
        String residual=RANGO.matcher(texto).replaceAll(" ");
        residual=FECHA.matcher(residual).replaceAll(" ");
        for(CuentaResponse cuenta:cuentas) residual=residual.replaceAll("(?<![\\p{L}\\d])"+Pattern.quote(normalizar(cuenta.nombre()))+"(?![\\p{L}\\d])"," ");
        for(CategoriaResponse categoria:categorias) residual=residual.replaceAll("(?<![\\p{L}\\d])"+Pattern.quote(normalizar(categoria.nombre()))+"(?![\\p{L}\\d])"," ");
        if(moneda!=null) residual=residual.replaceAll("(?<![\\p{L}\\d])"+moneda.toLowerCase(Locale.ROOT)+"(?![\\p{L}\\d])"," ");
        residual=residual.replaceAll("\\b(reporte|reportes|resumen|grafico|grafica|categorias?|presupuestos?|saldo|balance|cuanto|cuanta|cuantos|cuantas|como|voy|en|que|top|alertas|gastos?|gaste|gastado|ingresos?|comparas?|comparame|comparar|mes|semana|hoy|ayer|anteayer|este|esta|del|desde|al|hasta|de|la|las|los|el|por|para|con|usando|cuenta|tarjeta|actual|anterior|pasado|mismo|mxn|usd|eur|cad|gbp|ultimos|ultimas|dias)\\b"," ");
        return !residual.replaceAll("[^\\p{L}\\p{N}]"," ").isBlank();
    }
    private static BigDecimal monto(String texto) {
        texto=texto.replaceAll("[.,]+$","");int coma=texto.lastIndexOf(','),punto=texto.lastIndexOf('.');
        if(coma>=0&&punto>=0)texto=coma>punto?texto.replace(".","").replace(',','.'):texto.replace(",","");
        else if(coma>=0)texto=texto.length()-coma-1<=2?texto.replace(',','.'):texto.replace(",","");
        return new BigDecimal(texto).setScale(2,java.math.RoundingMode.UNNECESSARY);
    }
    private static Periodo periodo(String texto,LocalDate hoy) {
        Matcher rango=RANGO.matcher(texto);
        if(rango.find()) {
            try {
                LocalDate desde=LocalDate.parse(rango.group(1)),hasta=LocalDate.parse(rango.group(2));
                if(hasta.isBefore(desde))throw new IllegalArgumentException();
                return new Periodo(desde,hasta,RANGO.matcher(texto).replaceAll(" "));
            }catch(RuntimeException ex){throw new IllegalArgumentException(ex);}
        }
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
