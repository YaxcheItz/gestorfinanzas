package com.gestionfinanzas.service;

import com.gestionfinanzas.model.entity.Categoria;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.model.enums.TipoTransaccion;
import com.gestionfinanzas.repository.CategoriaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.text.Normalizer;
import java.util.*;

/** Merchant-only rules. Called after ownership checks and only for a new bank purchase. */
@Service @RequiredArgsConstructor
public class CategoriaCompraAutomaticaService {
    private final CategoriaRepository categorias;
    private record Grupo(String nombre,String icono,String color,Set<String> alias,Set<String> palabras) {}
    private static final Grupo OTROS=new Grupo("Otros gastos","receipt","#64748b",
        Set.of("otros gastos","otros"),Set.of());
    private static final List<Grupo> GRUPOS=List.of(
        new Grupo("Comida","utensils","#ef4444",Set.of("comida","alimentacion","restaurantes","restaurante","cafeterias"),
            Set.of("restaurante","restaurantes","restaurant","taqueria","tacos","pizzeria","pizza","cafeteria","cafe","hamburguesas","sushi")),
        new Grupo("Supermercado","shopping-cart","#f97316",Set.of("supermercado","supermercados","alimentos y supermercado","despensa","abarrotes"),
            Set.of("supermercado","supermercados","abarrotes","despensa")),
        new Grupo("Transporte","car","#f59e0b",Set.of("transporte","transportes"),
            Set.of("taxi","uber","didi","gasolina","gasolinera","metro","estacionamiento","autobus")),
        new Grupo("Salud","heart-pulse","#ec4899",Set.of("salud","salud y bienestar","farmacia","medicinas"),
            Set.of("farmacia","farmacias","hospital","clinica","medicina","medicinas","dentista")),
        new Grupo("Hogar","house","#3b82f6",Set.of("hogar","vivienda","servicios","vivienda y servicios"),
            Set.of("renta","electricidad","agua","internet")),
        new Grupo("Ocio","coffee","#8b5cf6",Set.of("ocio","entretenimiento","ocio y salidas"),
            Set.of("cine","cinema","teatro","netflix","spotify")));
    private static String normalizar(String texto) {
        return Normalizer.normalize(Objects.toString(texto,""),Normalizer.Form.NFD).replaceAll("\\p{M}+","")
            .toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]+"," ").strip().replaceAll(" +"," ");
    }
    private static boolean contiene(String texto,String palabra) { return (" "+texto+" ").contains(" "+palabra+" "); }
    private static Grupo grupo(String descripcion) {
        String texto=normalizar(descripcion);
        // An intermediary's name does not identify the underlying merchant's activity.
        if(Set.of("mercadopago","mercado pago","paypal","payu","stripe","clip","rappipay","rappi pay","rappicard","rappi card")
            .stream().anyMatch(p->contiene(texto,p)))return OTROS;
        // Food delivery is not a ride; preserve other activity words to detect ambiguity.
        String actividad=texto.replaceAll("\\b(?:uber\\s*eats|didi\\s*food|rappi|pedidos\\s*ya|just\\s*eat|door\\s*dash)\\b","restaurante");
        var coincidencias=GRUPOS.stream().filter(g->g.palabras().stream().anyMatch(p->contiene(actividad,p))).toList();
        return coincidencias.size()==1?coincidencias.get(0):OTROS;
    }
    private static boolean corresponde(Categoria categoria,Grupo grupo) {
        return categoria.getTipo()==TipoTransaccion.GASTO && grupo.alias().contains(normalizar(categoria.getNombre()));
    }
    private Long resolver(Usuario usuario,List<Categoria> disponibles,List<Categoria> propias,Grupo grupo) {
        var personales=disponibles.stream().filter(c->c.isActivo()&&c.getUsuario()!=null
            &&usuario.getId().equals(c.getUsuario().getId())&&corresponde(c,grupo)).toList();
        if(!personales.isEmpty())return personales.size()==1?personales.get(0).getId():null;
        if(propias.stream().anyMatch(c->!c.isActivo()&&corresponde(c,grupo)))return null;
        var globales=disponibles.stream().filter(c->c.isActivo()&&c.getUsuario()==null&&corresponde(c,grupo)).toList();
        if(!globales.isEmpty())return globales.size()==1?globales.get(0).getId():null;
        return categorias.saveAndFlush(Categoria.builder().usuario(usuario).nombre(grupo.nombre())
            .tipo(TipoTransaccion.GASTO).icono(grupo.icono()).color(grupo.color()).activo(true).build()).getId();
    }
    // The caller holds the user's row lock, serializing concurrent bank receipts and category creation.
    @Transactional(propagation=Propagation.MANDATORY)
    public Long asignar(Usuario usuario,String descripcion) {
        var disponibles=categorias.findDisponiblesParaUsuario(usuario.getId());
        var propias=categorias.findByUsuarioIdAndTipo(usuario.getId(),TipoTransaccion.GASTO);
        var grupo=grupo(descripcion);
        Long id=resolver(usuario,disponibles,propias,grupo);
        return id!=null||grupo==OTROS?id:resolver(usuario,disponibles,propias,OTROS);
    }
}
