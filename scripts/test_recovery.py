"""Checks de normalización: una variante de pg_dump no debe ocultar cambios reales."""
import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("recovery", Path(__file__).with_name("verify-postgres-recovery.py"))
recovery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(recovery)


class ConstraintComparisonTest(unittest.TestCase):
    source = "CHECK (tipo::text = ANY (ARRAY['GASTO'::character varying, 'INGRESO'::character varying]::text[]))"
    restored = "CHECK (tipo::text = ANY (ARRAY['GASTO'::character varying::text, 'INGRESO'::character varying::text]))"

    def test_equivalent_pg_dump_casts(self):
        self.assertEqual(recovery.canonical_constraint(self.source), recovery.canonical_constraint(self.restored))

    def test_different_allowed_values_and_columns_remain_different(self):
        for changed in [self.restored.replace("INGRESO", "TRANSFERENCIA"), self.restored.replace("tipo::", "otro::")]:
            self.assertNotEqual(recovery.canonical_constraint(self.source), recovery.canonical_constraint(changed))

    def test_other_constraints_are_not_normalized(self):
        for constraint in ["CHECK (monto > 0)", "CHECK (monto >= 0)", "CHECK (tipo::text <> ALL (ARRAY['GASTO'::text]))"]:
            self.assertEqual(constraint, recovery.canonical_constraint(constraint))

    def test_compound_period_check_from_ci_survives_dump_restore(self):
        fixture = json.loads(Path(__file__).with_name('fixtures').joinpath('recovery-periodo-constraint.json').read_text())
        self.assertEqual(recovery.canonical_constraint(fixture['source']), recovery.canonical_constraint(fixture['restored']))

    def test_compound_check_preserves_every_other_condition(self):
        fixture = json.loads(Path(__file__).with_name('fixtures').joinpath('recovery-periodo-constraint.json').read_text())
        for changed in [
            fixture['restored'].replace("'MES'", "'OTRO'"),
            fixture['restored'].replace('periodo_tipo::text =', 'otro_tipo::text ='),
            fixture['restored'].replace('<= 27', '<= 28'),
            fixture['restored'].replace("'2100-12-31'", "'2101-12-31'"),
            fixture['restored'].replace(' AND ', ' OR ', 1),
            fixture['restored'].replace('> periodo_dia_inicio', '>= periodo_dia_inicio'),
        ]:
            with self.subTest(changed=changed):
                self.assertNotEqual(recovery.canonical_constraint(fixture['source']), recovery.canonical_constraint(changed))

    def test_sql_literals_and_quoted_identifiers_are_never_rewritten(self):
        for quote in ["'", '"']:
            text = "tipo::text = ANY (ARRAY['GASTO'::character varying]::text[])"
            text = text.replace(quote, quote * 2)
            constraint = f'CHECK ({quote}{text}{quote} IS NOT NULL)'
            self.assertEqual(constraint, recovery.canonical_constraint(constraint))


if __name__ == "__main__":
    unittest.main()
