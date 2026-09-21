"""One-time, empty-database import from an inspected local PostgreSQL container.

Run without --apply first. Never loads archive SQL into the configured database.
"""

import argparse
import hashlib
import json
import subprocess
from pathlib import Path

from sqlalchemy import create_engine, inspect, select, text

import models  # noqa: F401 — register all application tables
from config import Config
from database import Base

TABLES = (
    "usertable",
    "shoptable",
    "checklistoptiontable",
    "userchecklisttable",
    "forumtable",
    "commenttable",
    "userhistorytable",
    "reporttable",
)


def read_source(container):
    data = {}
    for name in TABLES:
        result = subprocess.run(
            [
                "docker",
                "exec",
                container,
                "psql",
                "-X",
                "-U",
                "postgres",
                "-d",
                "postgres",
                "-At",
                "-v",
                "ON_ERROR_STOP=1",
                "-c",
                f"SELECT row_to_json(t) FROM public.{name} t",
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            check=True,
        )
        data[name] = [json.loads(line) for line in result.stdout.splitlines()]
    return data


def validate_source(data):
    for name, rows in data.items():
        table = Base.metadata.tables[name]
        keys = set()
        for row in rows:
            if set(row) != set(table.columns.keys()):
                raise ValueError(f"Column mismatch: {name}")
            key = tuple(row[col.name] for col in table.primary_key)
            if key in keys:
                raise ValueError(f"Duplicate primary key: {name}")
            keys.add(key)
            for col in table.columns:
                value = row[col.name]
                if value is None and not col.nullable:
                    raise ValueError(f"Unexpected null: {name}.{col.name}")
                length = getattr(col.type, "length", None)
                if value is not None and length and len(value) > length:
                    raise ValueError(f"Value too long: {name}.{col.name}")
        for fk in table.foreign_keys:
            parent = fk.column
            valid = {row[parent.name] for row in data[parent.table.name]}
            if any(
                row[fk.parent.name] is not None and row[fk.parent.name] not in valid
                for row in rows
            ):
                raise ValueError(f"Missing foreign key: {name}.{fk.parent.name}")


def fingerprint(rows):
    # Compare every value, including images, without displaying sensitive data.
    encoded = sorted(json.dumps(dict(row), sort_keys=True) for row in rows)
    return hashlib.sha256("\n".join(encoded).encode()).hexdigest()


def require_empty(connection):
    if inspect(connection).get_table_names(schema="public"):
        raise ValueError("Refusing import: public schema already contains tables")


def populate(connection, data):
    require_empty(connection)
    connection.exec_driver_sql("SET LOCAL search_path TO public")
    Base.metadata.create_all(connection)
    for name in TABLES:
        table = Base.metadata.tables[name]
        rows = data[name]
        # Insert replies after all comments exist, preserving arbitrary ID order.
        if name == "commenttable":
            rows = [dict(row, replyid=None) for row in rows]
        if rows:
            connection.execute(table.insert(), rows)
        if name == "commenttable":
            for row in data[name]:
                if row["replyid"] is not None:
                    connection.execute(
                        table.update()
                        .where(table.c.commentid == row["commentid"])
                        .values(replyid=row["replyid"])
                    )
    for name in TABLES:
        table = Base.metadata.tables[name]
        actual = connection.execute(select(table)).mappings().all()
        if fingerprint(actual) != fingerprint(data[name]):
            raise ValueError(f"Data verification failed: {name}")
        for col in table.primary_key:
            if col.autoincrement is True:
                connection.execute(
                    text(
                        "SELECT setval(pg_get_serial_sequence(:table, :column), "
                        ":value, :called)"
                    ),
                    {
                        "table": f"public.{name}",
                        "column": col.name,
                        "value": max((r[col.name] for r in data[name]), default=1),
                        "called": bool(data[name]),
                    },
                )
    migration = (Path(__file__).parent / "migrations/001_auth_identity.sql").read_text(
        encoding="utf-8"
    )
    # Keep the migration inside this import's single transaction.
    migration = "\n".join(
        line
        for line in migration.splitlines()
        if line.strip() not in {"BEGIN;", "COMMIT;"}
    )
    # Compile PostgreSQL format('%I') literals through SQLAlchemy so psycopg2
    # does not mistake them for its own parameter placeholders.
    connection.execute(text(migration))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--container", required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    try:
        data = read_source(args.container)
        validate_source(data)
        print(json.dumps({"source_counts": {k: len(v) for k, v in data.items()}}))
        engine = create_engine(
            Config.DATABASE_URL,
            hide_parameters=True,
            connect_args={"connect_timeout": 10},
        )
        with engine.begin() as connection:
            if not args.apply:
                connection.exec_driver_sql("SET TRANSACTION READ ONLY")
            require_empty(connection)
            if args.apply:
                populate(connection, data)
        engine.dispose()
        print(
            "Committed and verified all source records; Auth mappings remain empty."
            if args.apply
            else "Preview passed; no target changes. Use --apply to import."
        )
    except Exception as exc:
        # SQL/driver exceptions can include passwords, row contents and connection details.
        print(f"Import failed ({type(exc).__name__}); no row contents logged.")
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
