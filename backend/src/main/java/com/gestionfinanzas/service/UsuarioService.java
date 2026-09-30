package com.gestionfinanzas.service;

import com.gestionfinanzas.dto.request.EliminarUsuarioRequest;
import com.gestionfinanzas.model.entity.Usuario;
import com.gestionfinanzas.repository.AportacionParejaRepository;
import com.gestionfinanzas.repository.AsientoContableRepository;
import com.gestionfinanzas.repository.AuditoriaTransaccionRepository;
import com.gestionfinanzas.repository.CategoriaRepository;
import com.gestionfinanzas.repository.CuentaRepository;
import com.gestionfinanzas.repository.GastoParejaRepository;
import com.gestionfinanzas.repository.LineaAsientoRepository;
import com.gestionfinanzas.repository.PagoParejaRepository;
import com.gestionfinanzas.repository.ParejaRepository;
import com.gestionfinanzas.repository.PlantillaRecurrenteRepository;
import com.gestionfinanzas.repository.PresupuestoRepository;
import com.gestionfinanzas.repository.RepartoGastoRepository;
import com.gestionfinanzas.repository.TokenRecuperacionPasswordRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final LineaAsientoRepository lineaAsientoRepository;
    private final AsientoContableRepository asientoContableRepository;
    private final AuditoriaTransaccionRepository auditoriaTransaccionRepository;
    private final TransaccionRepository transaccionRepository;
    private final PlantillaRecurrenteRepository plantillaRecurrenteRepository;
    private final PresupuestoRepository presupuestoRepository;
    private final TokenRecuperacionPasswordRepository tokenRecuperacionPasswordRepository;
    private final CategoriaRepository categoriaRepository;
    private final CuentaRepository cuentaRepository;
    private final ParejaRepository parejaRepository;
    private final AportacionParejaRepository aporteParejaRepository;
    private final GastoParejaRepository gastoParejaRepository;
private final RepartoGastoRepository repartoGastoRepository;
private final PagoParejaRepository pagoParejaRepository;
private final SesionService sesionService;

    /**
     * Elimina la cuenta y TODOS sus datos. No existe reversa ni copia: se pierde tambien
     * el libro contable y la auditoria, por lo que la contrasena actual es obligatoria.
     *
     * <p>El orden importa porque no hay CascadeType.REMOVE desde Usuario: cada borrado en
     * lote debe hacerse antes que las tablas que sus filas referencian, o PostgreSQL
     * rechaza la operacion por llave foranea. Los hijos van primero:
     * LineaAsiento -&gt; AsientoContable, y las tablas que apuntan a Cuenta/Categoria
     * (Transaccion, PlantillaRecurrente, Presupuesto) antes que esas dos.
     *
     * <p>Los gastos compartidos se van enteros, no solo los de quien borra. Es la misma
     * politica de esta pantalla: el borrado es total e irreversible. El lado Perdio de
     * la pareja ve como desaparece el historial compartido y puede volver a vincularse
     * con quien quiera.
     */
    @Transactional
    public void eliminarCuenta(Long usuarioId, EliminarUsuarioRequest request) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        if (!passwordEncoder.matches(request.password(), usuario.getPasswordHash())) {
            throw new IllegalArgumentException("La contraseña es incorrecta");
        }

        // Antes que nada lo que apunta a Usuario por medio de Pareja. Los repartos
        // van primeros porque son los nietos: apuntan al gasto, y el gasto a la pareja.
        for (Long parejaId : parejaRepository.listarIdsDeUsuario(usuarioId)) {
            repartoGastoRepository.deleteByParejaId(parejaId);
            gastoParejaRepository.deleteByParejaId(parejaId);
            aporteParejaRepository.deleteByParejaId(parejaId);
            pagoParejaRepository.deleteByParejaId(parejaId);
        }
        parejaRepository.deleteByUsuarioId(usuarioId);

        lineaAsientoRepository.deleteByUsuarioId(usuarioId);
        asientoContableRepository.deleteByUsuarioId(usuarioId);
        auditoriaTransaccionRepository.deleteByUsuarioId(usuarioId);

        transaccionRepository.desvincularCashbackDe(usuarioId);
        transaccionRepository.deleteByUsuarioId(usuarioId);

        plantillaRecurrenteRepository.deleteByUsuarioId(usuarioId);
        presupuestoRepository.deleteByUsuarioId(usuarioId);
        tokenRecuperacionPasswordRepository.deleteByUsuarioId(usuarioId);
        // Antes de borrar el usuario: los refresh tokens lo apuntan sin cascada, asi que
        // dejarlos convierte el borrado en un fallo de clave foranea.
        sesionService.eliminarTodas(usuarioId);

        categoriaRepository.deleteByUsuarioId(usuarioId);
        cuentaRepository.deleteByUsuarioId(usuarioId);

        // Los borrados en lote anteriores limpian el contexto de persistencia, asi que se
        // vuelve a resolver el usuario en vez de reutilizar la entidad ya desligada.
        usuarioRepository.deleteById(usuarioId);
    }
}
