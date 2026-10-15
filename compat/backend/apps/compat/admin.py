"""Generic admin of the test model (search, filters, bulk action)."""

from pachifast.admin import ModelAdmin, admin_action, register_admin

from .models import CompatItem


@register_admin(CompatItem)
class ItemAdmin(ModelAdmin):
    """Test items."""

    name = "item"
    title = "Item"
    list_display = ["name", "status", "quantity", "active"]
    search_fields = ["name"]
    list_filter = ["status", "active"]
    actions = ["archive"]

    @admin_action(label="Archive selected")
    async def archive(self, session, rows) -> str:
        """Sets the status of the selected rows to archived."""
        for row in rows:
            row.status = "archived"
        return f"{len(rows)} archived"
