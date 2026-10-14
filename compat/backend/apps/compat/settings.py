from pachifast.config import get_settings


def get_database_url() -> str:
    """Le tabelle di prova stanno nel database auth: nessun altro database da configurare."""
    return get_settings().AUTH_DATABASE_URL
