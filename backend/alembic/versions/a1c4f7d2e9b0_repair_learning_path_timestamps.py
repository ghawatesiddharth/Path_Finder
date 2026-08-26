"""repair missing learning path timestamps

Revision ID: a1c4f7d2e9b0
Revises: 9b6c3e2a1f04
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1c4f7d2e9b0"
down_revision: Union[str, Sequence[str], None] = "9b6c3e2a1f04"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("learning_paths")}

    if "created_at" not in columns:
        op.add_column(
            "learning_paths",
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        )
        op.alter_column("learning_paths", "created_at", nullable=False)

    if "updated_at" not in columns:
        op.add_column(
            "learning_paths",
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        )
        op.alter_column("learning_paths", "updated_at", nullable=False)


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("learning_paths")}

    if "updated_at" in columns:
        op.drop_column("learning_paths", "updated_at")
    if "created_at" in columns:
        op.drop_column("learning_paths", "created_at")