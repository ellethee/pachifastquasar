from pachifast.config import get_settings


def get_database_url() -> str:
    """The test tables live in the auth database: no other database to configure."""
    return get_settings().AUTH_DATABASE_URL
