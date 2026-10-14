from pachifast import AppModule, MigrationTarget

module = AppModule(
    name="compat",
    kind="app",
    migration_targets=(
        MigrationTarget(
            name="compat",
            database_url_resolver="apps.compat.settings:get_database_url",
            model_modules=("apps.compat.models",),
            version_table="compat_alembic_version",
        ),
    ),
)
