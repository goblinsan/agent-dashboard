"""Add repository_path column to projects

Revision ID: 5c2b1b9e3a7f
Revises: f021487b4d37
Create Date: 2025-09-29 23:04:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "5c2b1b9e3a7f"
down_revision = "f021487b4d37"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("repository_path", sa.String(length=1024), nullable=True))


def downgrade() -> None:
    op.drop_column("projects", "repository_path")
