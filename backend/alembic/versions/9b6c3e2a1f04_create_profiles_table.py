"""create profiles table

Revision ID: 9b6c3e2a1f04
Revises: 4f2a91d7c8e1
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "9b6c3e2a1f04"
down_revision: Union[str, Sequence[str], None] = "4f2a91d7c8e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "profiles",

        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("career_path", sa.String(length=64), nullable=True),
        sa.Column("goals", sa.Text(), nullable=True),
        sa.Column("purpose", sa.String(length=120), nullable=True),
        sa.Column("experience_level", sa.String(length=20), nullable=False, server_default="Beginner"),
        sa.Column("weekly_hours", sa.Integer(), nullable=True),
        sa.Column(
            "known_skills",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("onboarding_completed", sa.Boolean(), nullable=False, server_default=sa.false()),

        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("ix_profiles_user_id", "profiles", ["user_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_profiles_user_id", table_name="profiles")
    op.drop_table("profiles")
