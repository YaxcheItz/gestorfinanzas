"""La comparación semántica no debe ocultar cambios de comportamiento."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('comparison', Path(__file__).with_name('compare-postgres-schema.py'))
comparison = importlib.util.module_from_spec(spec)
spec.loader.exec_module(comparison)


class SchemaComparisonTest(unittest.TestCase):
    def test_physical_column_order_is_ignored_but_type_and_default_are_preserved(self):
        row = dict(table_schema='finanzas', table_name='cuentas', column_name='moneda',
                   ordinal_position=1, data_type='character varying', column_default=None)
        self.assertEqual(comparison.canonical_columns([row]),
                         comparison.canonical_columns([{**row, 'ordinal_position': 7}]))
        for change in ({'data_type': 'text'}, {'column_default': "'MXN'::character varying"}):
            self.assertNotEqual(comparison.canonical_columns([row]),
                                comparison.canonical_columns([{**row, **change}]))

    def test_index_name_is_ignored_but_uniqueness_and_predicate_are_preserved(self):
        def index(name, unique='UNIQUE ', suffix=''):
            return dict(schemaname='finanzas', tablename='usuarios', indexname=name,
                        indexdef=f'CREATE {unique}INDEX {name} ON finanzas.usuarios USING btree (email){suffix}')
        original = comparison.canonical_indexes([index('idx_email')])
        self.assertEqual(original, comparison.canonical_indexes([index('usuarios_email_key')]))
        for row in (index('idx_email', unique=''), index('idx_email', suffix=' WHERE activo')):
            self.assertNotEqual(original, comparison.canonical_indexes([row]))


if __name__ == '__main__':
    unittest.main()
