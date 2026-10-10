import org.flywaydb.core.Flyway;

/** Ensayo exclusivamente local. No acepta URL ni credenciales de producción. */
public class LocalFlywayAdoption {
    public static void main(String[] args) {
        if (args.length != 1 || !args[0].matches("kaptal_restore_[a-z0-9_]+")) {
            throw new IllegalArgumentException("Indique una copia local kaptal_restore_...");
        }
        var flyway = Flyway.configure()
                .dataSource("jdbc:postgresql://127.0.0.1:15432/" + args[0], "kaptal_test", "")
                .schemas("finanzas").defaultSchema("finanzas")
                .locations("filesystem:backend/src/main/resources/db/migration")
                .baselineOnMigrate(false).baselineVersion("2")
                .baselineDescription("Adopcion explicita V2 comprobada en copia")
                .cleanDisabled(true).load();
        try {
            flyway.migrate();
            throw new IllegalStateException("Se esperaba rechazo de esquema sin historial");
        } catch (org.flywaydb.core.api.FlywayException expected) {
            if (!expected.getMessage().contains("no schema history table")) throw expected;
            System.out.println("Rechazo inicial sin historial: confirmado");
        }
        flyway.baseline();
        flyway.validate();
        if (flyway.migrate().migrationsExecuted != 0) {
            throw new IllegalStateException("Baseline V2 no debe volver a ejecutar V1/V2");
        }
        System.out.println("Baseline explicito V2 validado; ninguna migracion repetida");
    }
}
