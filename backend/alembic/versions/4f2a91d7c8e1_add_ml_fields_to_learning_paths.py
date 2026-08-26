"""add ml fields to learning_paths (goal, career_path, content, progress)

Revision ID: 4f2a91d7c8e1
Revises: 23adcebf063e
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "4f2a91d7c8e1"
down_revision: Union[str, Sequence[str], None] = "23adcebf063e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("learning_paths", sa.Column("goal", sa.Text(), nullable=True))
    op.add_column("learning_paths", sa.Column("career_path", sa.String(length=64), nullable=True))
    op.add_column(
        "learning_paths",
        sa.Column(
            "content",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
    )
    op.add_column(
        "learning_paths",
        sa.Column("progress", sa.Float(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("learning_paths", "progress")
    op.drop_column("learning_paths", "content")
    op.drop_column("learning_paths", "career_path")
    op.drop_column("learning_paths", "goal")
