"""Read-only connectivity check. Run explicitly after configuring DATABASE_URL."""

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import SQLAlchemyError

from config import Config

EXPECTED = {
    "authidentity",
    "usertable",
    "shoptable",
    "checklistoptiontable",
    "userchecklisttable",
    "forumtable",
    "commenttable",
    "reporttable",
    "userhistorytable",
}


def main():
    engine = create_engine(Config.DATABASE_URL, connect_args={"connect_timeout": 10})
    try:
        with engine.connect() as connection:
            connection.execute(text("SET TRANSACTION READ ONLY"))
            connection.execute(text("SELECT 1"))
            missing = EXPECTED - set(
                inspect(connection).get_table_names(schema="public")
            )
            print("Database connection succeeded.")
            if missing:
                print("Missing application tables:", ", ".join(sorted(missing)))
                return 1
            print("All nine application tables exist. Row counts:")
            for name in sorted(EXPECTED):
                count = connection.scalar(text(f'SELECT count(*) FROM public."{name}"'))
                print(f"  {name}: {count}")
            print(
                "Identity ownership and access controls require separate verification."
            )
            return 0
    except SQLAlchemyError:
        # Connection errors can contain host/user details; do not dump credentials.
        print(
            "Connection failed. Check DATABASE_URL, TLS, network access and project availability."
        )
        return 1
    finally:
        engine.dispose()


if __name__ == "__main__":
    raise SystemExit(main())
