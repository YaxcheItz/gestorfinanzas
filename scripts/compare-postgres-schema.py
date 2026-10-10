#!/usr/bin/env python3
"""Compara una copia candidata contra una referencia migrada. Solo lectura; NO hace baseline.

La referencia debe representar la versión elegida (V1 o V2) y usar el mismo nombre de esquema.
No consulta filas. Ignora historial, avance de secuencias, orden físico de columnas
y nombres de índices; conserva tipos, defaults, unicidad, predicados y restricciones.
"""
import argparse
import importlib.util
import json
import re
from pathlib import Path

spec = importlib.util.spec_from_file_location("recovery", Path(__file__).with_name("verify-postgres-recovery.py"))
recovery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(recovery)


def canonical_columns(rows):
    return sorted(({key: value for key, value in row.items() if key != 'ordinal_position'}
                   for row in rows), key=lambda row: (row['table_schema'], row['table_name'], row['column_name']))


def canonical_indexes(rows):
    result = []
    for row in rows:
        item = {key: value for key, value in row.items() if key != 'indexname'}
        # El nombre no determina comportamiento. El resto de pg_get_indexdef permanece exacto.
        prefix = 'CREATE UNIQUE INDEX ' if row['indexdef'].startswith('CREATE UNIQUE INDEX ') else 'CREATE INDEX '
        quoted_name = '"' + row['indexname'].replace('"', '""') + '"'
        for name in (row['indexname'], quoted_name):
            if row['indexdef'].startswith(prefix + name + ' ON '):
                item['indexdef'] = prefix + '<name>' + row['indexdef'][len(prefix + name):]
                break
        result.append(item)
    return sorted(result, key=lambda row: json.dumps(row, sort_keys=True))


def schema(database, name):
    result = recovery.manifest(database, include_data=False, schemas={name})
    result["tables"] = sorted(table for table in result["tables"] if table.startswith(name + ".") and not table.endswith(".flyway_schema_history"))
    if not all(name + "." + table in result["tables"] for table in ("usuarios", "cuentas", "transacciones")):
        raise RuntimeError("El esquema elegido no contiene las tablas principales de Kaptal.")
    result["columns"] = [r for r in result["columns"] if r["table_schema"] == name and r["table_name"] != "flyway_schema_history"]
    result["indexes"] = [r for r in result["indexes"] if r["schemaname"] == name and r["tablename"] != "flyway_schema_history"]
    result["constraints"] = [r for r in result["constraints"] if r["schema"] == name and r["tabla"] != "flyway_schema_history"]
    result["sequences"] = [r for r in result["sequences"] if r["schemaname"] == name]
    for sequence in result["sequences"]:
        sequence.pop("last_value", None)
    result['columns'] = canonical_columns(result['columns'])
    result['indexes'] = canonical_indexes(result['indexes'])
    return result


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--reference", required=True)
    p.add_argument("--candidate", required=True)
    p.add_argument("--report", type=Path, required=True)
    p.add_argument("--schema", default="finanzas")
    a = p.parse_args()
    if not all(re.fullmatch(r"[A-Za-z_][A-Za-z0-9_-]*", name) for name in (a.reference, a.candidate)):
        raise RuntimeError("Indique nombres de base, no URLs ni credenciales.")
    if a.reference == a.candidate:
        raise RuntimeError("Referencia y candidato deben ser bases distintas.")
    if a.report.exists():
        raise RuntimeError("El reporte ya existe; no se sobrescribe evidencia.")
    expected, actual = schema(a.reference, a.schema), schema(a.candidate, a.schema)
    differences = [part for part in expected if expected[part] != actual[part]]
    a.report.parent.mkdir(parents=True, exist_ok=True)
    a.report.write_text(json.dumps({"match": not differences, "differences": differences,
        "reference": expected, "candidate": actual}, indent=2, ensure_ascii=False), encoding="utf-8")
    if differences:
        raise RuntimeError("Esquemas distintos; baseline bloqueado. Revisar " + ", ".join(differences))
    print("Esquemas coinciden. Aún requiere revisión de datos, permisos y baseline explícito.")


if __name__ == "__main__":
    main()
