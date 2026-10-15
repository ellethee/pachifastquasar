"""Test table for the generic admin CRUD."""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from pachifast.database import Base


class CompatItem(Base):
    """Test row: string, integer, boolean and status."""

    __tablename__ = "compat_item"

    id: Mapped[int | None] = mapped_column(primary_key=True, default=None, nullable=False)
    name: Mapped[str] = mapped_column(String(120), index=True)
    status: Mapped[str] = mapped_column(String(20), index=True, default="draft")
    quantity: Mapped[int] = mapped_column(default=0)
    active: Mapped[bool] = mapped_column(default=True)
