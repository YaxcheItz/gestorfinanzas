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
import com.gestionfinanzas.repository.SuscripcionNotificacionRepository;
import com.gestionfinanzas.repository.TransaccionRepository;
import com.gestionfinanzas.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final GoogleIdentityService googleIdentityService;
    private final LineaAsientoRepository lineaAsientoRepository;
    private final AsientoContableRepository asientoContableRepository;
    private final AuditoriaTransaccionRepository auditoriaTransaccionRepository;
    private final TransaccionRepository transaccionRepository;
    private final PlantillaRecurrenteRepository plantillaRecurrenteRepository;
    private final PresupuestoRepository presupuestoRepository;
    private final TokenRecuperacionPasswordRepository tokenRecuperacionPasswordRepository;
    private final SuscripcionNotificacionRepository suscripcionNotificacionRepository;
    private final CategoriaRepository categoriaRepository;
    private final CuentaRepository cuentaRepository;
    private final ParejaRepository parejaRepository;
    private final AportacionParejaRepository aporteParejaRepository;
    private final GastoParejaRepository gastoParejaRepository;
    private final RepartoGastoRepository repartoGastoRepository;
    private final PagoParejaRepository pagoParejaRepository;
    private final SesionService sesionService;
    private final jakarta.persistence.EntityManager entityManager;
    private final com.gestionfinanzas.repository.PropuestaChatRepository propuestaChatRepository;

    /** Elimina datos personales y financieros propios; conserva el historial común
     * del otro miembro con una referencia anónima desactivada, sin credenciales reutilizables. */
    @Transactional
    public void eliminarCuenta(Long usuarioId, EliminarUsuarioRequest request) {
        Usuario usuario = usuarioRepository.findByIdForUpdate(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        entityManager.refresh(usuario);

        boolean passwordProvided = request.password() != null && !request.password().isBlank();
        boolean googleCredentialProvided = request.googleCredential() != null
                && !request.googleCredential().isBlank();
        if (passwordProvided == googleCredentialProvided) {
            throw new IllegalArgumentException("Confirma la eliminación con tu contraseña o con Google.");
        }
        if (passwordProvided && !passwordEncoder.matches(request.password(), usuario.getPasswordHash())) {
            throw new IllegalArgumentException("La contraseña es incorrecta");
        }
        if (googleCredentialProvided) {
            String googleSubject = googleIdentityService.verificarReautenticacionReciente(request.googleCredential());
            if (usuario.getGoogleSubject() == null || !usuario.getGoogleSubject().equals(googleSubject)) {
                throw new BadCredentialsException("La cuenta de Google no coincide con esta cuenta de Kaptal.");
            }
        }

        Usuario anonimo = null;
        java.util.Set<Long> referenciasHistoricas = new java.util.HashSet<>();
        for (Long parejaId : parejaRepository.listarIdsDeUsuario(usuarioId)) {
            var vinculo=parejaRepository.findByIdForUpdate(parejaId).orElseThrow();
            entityManager.refresh(vinculo);
            var otro=vinculo.getUsuarioA().getId().equals(usuarioId) ? vinculo.getUsuarioB() : vinculo.getUsuarioA();
            if (otro.isReferenciaHistorica()) referenciasHistoricas.add(otro.getId());
            boolean sinMovimientos = gastoParejaRepository.findByParejaIdOrderByFechaDescIdDesc(parejaId).isEmpty()
                    && aporteParejaRepository.findByParejaIdOrderByFechaDescIdDesc(parejaId).isEmpty()
                    && pagoParejaRepository.findByParejaIdOrderByFechaDescIdDesc(parejaId).isEmpty();
            if (usuarioId.equals(vinculo.getPropietarioHistorialId()) || vinculo.isPendiente() || sinMovimientos
                    || (otro.isReferenciaHistorica() && vinculo.getPropietarioHistorialId()==null)) {
                repartoGastoRepository.deleteByParejaId(parejaId);
                gastoParejaRepository.deleteByParejaId(parejaId);
                aporteParejaRepository.deleteByParejaId(parejaId);
                pagoParejaRepository.deleteByParejaId(parejaId);
                parejaRepository.deleteById(parejaId);
                continue;
            }
            if (anonimo == null) {
                anonimo=usuarioRepository.save(Usuario.builder().nombre("Cuenta eliminada")
                        .email("eliminada-"+java.util.UUID.randomUUID()+"@cuenta.invalid")
                        .passwordHash(passwordEncoder.encode(java.util.UUID.randomUUID().toString()))
                        .activo(false).referenciaHistorica(true).build());
            }
            if (vinculo.getUsuarioA().getId().equals(usuarioId)) {
                vinculo.setUsuarioA(anonimo);
                vinculo.setNombreRemitenteInvitacion("Cuenta eliminada");
                vinculo.setCorreoRemitenteInvitacion(null);
            } else {
                vinculo.setUsuarioB(anonimo);
                vinculo.setCorreoDestinatarioInvitacion(null);
            }
            vinculo.setActiva(false);
            vinculo.setPendiente(false);
            parejaRepository.save(vinculo);
        }
        if (anonimo != null) {
            aporteParejaRepository.anonimizarUsuario(usuarioId,anonimo);
            gastoParejaRepository.anonimizarUsuario(usuarioId,anonimo);
            repartoGastoRepository.anonimizarUsuario(usuarioId,anonimo);
            pagoParejaRepository.anonimizarPagador(usuarioId,anonimo);
            pagoParejaRepository.anonimizarBeneficiario(usuarioId,anonimo);
            pagoParejaRepository.anonimizarAutor(usuarioId,anonimo);
        }
        parejaRepository.deleteByUsuarioId(usuarioId);
        for (Long referenciaId : referenciasHistoricas) {
            if (parejaRepository.listarIdsDeUsuario(referenciaId).isEmpty()) usuarioRepository.deleteById(referenciaId);
        }

        propuestaChatRepository.eliminarDeUsuario(usuarioId);
        lineaAsientoRepository.deleteByUsuarioId(usuarioId);
        asientoContableRepository.deleteByUsuarioId(usuarioId);
        auditoriaTransaccionRepository.deleteByUsuarioId(usuarioId);

        transaccionRepository.desvincularCashbackDe(usuarioId);
        transaccionRepository.deleteByUsuarioId(usuarioId);

        plantillaRecurrenteRepository.deleteByUsuarioId(usuarioId);
        presupuestoRepository.deleteByUsuarioId(usuarioId);
        tokenRecuperacionPasswordRepository.deleteByUsuarioId(usuarioId);
        suscripcionNotificacionRepository.deleteAllByUsuarioId(usuarioId);
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
