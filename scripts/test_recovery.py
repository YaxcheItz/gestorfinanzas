"""Checks de normalización: una variante de pg_dump no debe ocultar cambios reales."""
import importlib.util
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


if __name__ == "__main__":
    unittest.main()
