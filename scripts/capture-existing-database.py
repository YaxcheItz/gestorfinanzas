#!/usr/bin/env python3
"""Copia finanzas mediante snapshot de solo lectura; restaura en una base local nueva.

Requiere requirements-operations.txt, PG_BIN y un directorio privado existente.
Nunca imprime credenciales ni modifica el origen. No sustituye un backup del proveedor.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
from urllib.parse import parse_qs, urlsplit

import psycopg


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--env-file', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--restore', required=True)
    args = parser.parse_args()
    if not re.fullmatch(r'kaptal_restore_[a-z0-9_]+', args.restore):
        raise RuntimeError('Nombre de destino local invalido.')
    if not args.output.parent.is_dir() or args.output.exists():
        raise RuntimeError('Salida debe ser nueva bajo un directorio privado existente.')
    values = {}
    for line in args.env_file.read_text(encoding='utf-8-sig').splitlines():
        if line.strip() and not line.lstrip().startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            values[key.strip()] = value.strip().strip('\"\'')
    url = urlsplit(values['SPRING_DATASOURCE_URL'].removeprefix('jdbc:'))
    if url.scheme != 'postgresql' or not url.hostname or url.username or url.password:
        raise RuntimeError('Se requiere URL JDBC PostgreSQL con credenciales separadas.')
    remote = dict(host=url.hostname, port=url.port or 5432, dbname=url.path.lstrip('/'),
                  user=values['SPRING_DATASOURCE_USERNAME'],
                  password=values['SPRING_DATASOURCE_PASSWORD'],
                  sslmode=parse_qs(url.query).get('sslmode', ['require'])[0], connect_timeout=20)
    local = dict(host='127.0.0.1', port=15432, user='kaptal_test', dbname='postgres')
    with psycopg.connect(**local, autocommit=True) as check:
        if check.execute('SELECT 1 FROM pg_database WHERE datname=%s', (args.restore,)).fetchone():
            raise RuntimeError('Destino ya existe; no se sobrescribe.')
    spec = importlib.util.spec_from_file_location('recovery', Path(__file__).with_name('verify-postgres-recovery.py'))
    recovery = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(recovery)
    args.output.mkdir(mode=0o700)
    dump = args.output / 'finanzas.dump'

    def read(connection):
        def query(_database, sql):
            result = connection.execute(sql).fetchone()[0]
            return json.dumps(result) if isinstance(result, (dict, list)) else str(result)
        return query

    with psycopg.connect(**remote, autocommit=True) as source:
        source.execute('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
        source.execute("SET LOCAL TIME ZONE 'UTC'")
        source.execute("SET LOCAL statement_timeout = '120s'")
        if source.execute('SHOW transaction_read_only').fetchone()[0] != 'on':
            raise RuntimeError('Origen no esta en transaccion de solo lectura.')
        snapshot = source.execute('SELECT pg_export_snapshot()').fetchone()[0]
        before = recovery.manifest(remote['dbname'], schemas={'finanzas'}, query_function=read(source))
        environment = os.environ.copy()
        environment.update({f'PG{key}': str(remote[value]) for key, value in
                            [('HOST', 'host'), ('PORT', 'port'), ('DATABASE', 'dbname'),
                             ('USER', 'user'), ('PASSWORD', 'password'), ('SSLMODE', 'sslmode')]})
        environment.pop('PGOPTIONS', None)
        binary = Path(os.environ['PG_BIN']) / ('pg_dump.exe' if os.name == 'nt' else 'pg_dump')
        result = subprocess.run([str(binary), '--no-password', '--schema=finanzas', '--format=custom',
                                 '--snapshot', snapshot, '--file', str(dump)], env=environment,
                                capture_output=True, timeout=300)
        if result.returncode:
            raise RuntimeError('pg_dump fallo; detalles privados no publicados.')
        source.execute('ROLLBACK')
    os.environ.update(PGHOST='127.0.0.1', PGPORT='15432', PGUSER='kaptal_test', PGDATABASE='postgres', PGTZ='UTC')
    for name in ('PGPASSWORD', 'PGPASSFILE', 'PGOPTIONS'):
        os.environ.pop(name, None)
    recovery.run('createdb', '--no-password', '--template=template0', args.restore)
    recovery.run('pg_restore', '--no-password', '--exit-on-error', '--no-owner', '--no-privileges',
                 '--dbname', args.restore, str(dump))
    local['dbname'] = args.restore
    with psycopg.connect(**local, autocommit=True) as restored:
        restored.execute('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
        restored.execute("SET LOCAL TIME ZONE 'UTC'")
        after = recovery.manifest(args.restore, schemas={'finanzas'}, query_function=read(restored))
        restored.execute('ROLLBACK')
    report = dict(match=before == after, sourceReadOnly=True, schema='finanzas', restore=args.restore,
                  dumpSHA256=hashlib.sha256(dump.read_bytes()).hexdigest(), before=before, after=after,
                  limits=['Solo esquema finanzas; no incluye esquemas gestionados por Supabase.',
                          'Restauracion sin propietarios ni grants; no valida roles externos.',
                          'Secuencias no usan MVCC: actividad concurrente puede causar discrepancias.',
                          'No verifica RPO/RTO ni backups gestionados del proveedor.'])
    (args.output / 'verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    if not report['match']:
        raise RuntimeError('Diferencias en restauracion; revisar informe privado preservado.')
    print(f"Copia restaurada: {len(before['tables'])} tablas coinciden; origen de solo lectura.")


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Errores del driver pueden incluir host, usuario o detalles de datos.
        print(f'Operacion incompleta ({type(error).__name__}); no se publican detalles privados.')
        raise SystemExit(1)
