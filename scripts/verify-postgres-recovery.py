#!/usr/bin/env python3
"""Comprueba pg_dump/pg_restore en una base NUEVA. Nunca borra ni limpia una base existente.

Conexión mediante PGHOST/PGPORT/PGUSER/PGPASSFILE; no imprime secretos.
El dump incluye datos de autenticación: guardarlo fuera de Git y con acceso restringido.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess


def run(tool, *args):
    binary = str(Path(os.environ["PG_BIN"]) / (tool + (".exe" if os.name == "nt" else ""))) if os.environ.get("PG_BIN") else shutil.which(tool)
    if not binary:
        raise RuntimeError(f"Falta herramienta PostgreSQL: {tool}")
    result = subprocess.run([binary, *args], capture_output=True, text=True, encoding="utf-8")
    if result.returncode:
        # El stderr del proveedor puede contener configuración de conexión; no se persiste.
        raise RuntimeError(f"{tool} falló (exit {result.returncode}); revise la conexión y permisos.")
    return result.stdout.strip()


def query(database, sql):
    return run("psql", "-X", "--no-password", "-v", "ON_ERROR_STOP=1", "-At", "-d", database, "-c", sql)


def canonical_constraint(definition):
    # pg_dump convierte el cast del array varchar a text en casts de cada literal.
    # Solo se normaliza esta forma exacta de CHECK de enum; valores/columna se conservan.
    match = re.fullmatch(r"CHECK \((\w+)::text = ANY \(ARRAY\[(.*?)\](?:::text\[\])?\)\)", definition)
    literal = r"'(?:[^']|'')*'::character varying(?:::text)?"
    if match and re.fullmatch(literal + r"(?:, " + literal + r")*", match[2]):
        return {"enumColumn": match[1], "allowed": re.findall(r"'(?:[^']|'')*'", match[2])}
    return definition


def manifest(database, include_data=True):
    rows = json.loads(query(database, "SELECT COALESCE(json_agg(x),'[]') FROM (SELECT schemaname,tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1,2) x"))
    tables = {}
    for row in rows:
        schema, table = row["schemaname"], row["tablename"]
        if not include_data:
            tables[f"{schema}.{table}"] = None
            continue
        # Los identificadores vienen del catálogo: se citan incluso cuando incluyen comillas.
        identifier = '"' + schema.replace('"', '""') + '"."' + table.replace('"', '""') + '"'
        tables[f"{schema}.{table}"] = json.loads(query(database,
            f"SELECT json_build_object('rows',count(*),'hash',md5(COALESCE(string_agg(h,'' ORDER BY h),''))) FROM (SELECT md5(to_jsonb(t)::text) h FROM {identifier} t) hashes"))
    sequences = json.loads(query(database, "SELECT COALESCE(json_agg(x),'[]') FROM (SELECT schemaname,sequencename,start_value,min_value,max_value,increment_by,cycle,last_value FROM pg_sequences WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1,2) x"))
    constraints = json.loads(query(database, "SELECT COALESCE(json_agg(x),'[]') FROM (SELECT n.nspname AS schema,c.relname AS tabla,k.contype,pg_get_constraintdef(k.oid,true) AS definition,k.convalidated FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') ORDER BY 1,2,3,4) x"))
    for constraint in constraints:
        constraint["definition"] = canonical_constraint(constraint["definition"])
    constraints.sort(key=lambda row: json.dumps(row, sort_keys=True))
    columns = json.loads(query(database, "SELECT COALESCE(json_agg(x),'[]') FROM (SELECT table_schema,table_name,column_name,ordinal_position,data_type,udt_name,is_nullable,column_default,numeric_precision,numeric_scale,character_maximum_length FROM information_schema.columns WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY 1,2,4) x"))
    indexes = json.loads(query(database, "SELECT COALESCE(json_agg(x),'[]') FROM (SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1,2,3) x"))
    return {"tables": tables, "sequences": sequences, "constraints": constraints, "columns": columns, "indexes": indexes}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True)
    parser.add_argument("--restore", required=True, help="Base nueva, nombre kaptal_restore_<identificador>")
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_-]*", args.source):
        raise RuntimeError("Origen inválido: indique nombre de base, no URL ni credenciales.")
    if not re.fullmatch(r"kaptal_restore_[a-z0-9_]+", args.restore) or args.restore == args.source:
        raise RuntimeError("Destino inválido: debe ser una base nueva kaptal_restore_<identificador>.")
    if args.output.exists():
        raise RuntimeError("El directorio de salida ya existe; no se sobrescribe evidencia ni respaldo.")
    exists = query("postgres", f"SELECT count(*) FROM pg_database WHERE datname='{args.restore}'")
    if exists != "0":
        raise RuntimeError("El destino ya existe; no se restaura encima ni se borra.")
    args.output.mkdir(parents=True, mode=0o700)
    dump = args.output / "database.dump"
    before = manifest(args.source)
    run("pg_dump", "--no-password", "--format=custom", "--file", str(dump), "--dbname", args.source)
    run("createdb", "--no-password", "--template=template0", args.restore)
    run("pg_restore", "--no-password", "--exit-on-error", "--no-owner", "--no-privileges", "--dbname", args.restore, str(dump))
    after = manifest(args.restore)
    report = {"source": args.source, "restore": args.restore, "match": before == after,
              "dumpSHA256": hashlib.sha256(dump.read_bytes()).hexdigest(), "before": before, "after": after,
              "limits": ["Sin escrituras concurrentes durante la verificación", "No compara propietarios, grants ni configura roles externos", "No comprueba RPO/RTO del proveedor ni backups gestionados"]}
    (args.output / "verification.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    if before != after:
        raise RuntimeError("Restauración no coincide: consultar verification.json. Se preservan dump y base de destino.")
    print(f"Restauración comprobada: {len(before['tables'])} tablas; datos, secuencias y restricciones coinciden.")


if __name__ == "__main__":
    main()
