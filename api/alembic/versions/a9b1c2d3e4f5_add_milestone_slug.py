"""add milestone slug

Revision ID: a9b1c2d3e4f5
Revises: d4e5f6a7b8c9
Create Date: 2025-10-05 12:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = 'a9b1c2d3e4f5'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = [c['name'] for c in inspector.get_columns('milestones')]
    if 'slug' not in cols:
        # add slug column (nullable) to milestones
        op.add_column('milestones', sa.Column('slug', sa.String(length=255), nullable=True))

    # create unique index on project_id + slug if it doesn't already exist
    existing_indexes = {idx['name'] for idx in inspector.get_indexes('milestones')}
    idx_name = op.f('ux_milestones_project_id_slug')
    if idx_name not in existing_indexes:
        op.create_index(idx_name, 'milestones', ['project_id', 'slug'], unique=True)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_indexes = {idx['name'] for idx in inspector.get_indexes('milestones')}
    idx_name = op.f('ux_milestones_project_id_slug')
    if idx_name in existing_indexes:
        op.drop_index(idx_name, table_name='milestones')

    cols = [c['name'] for c in inspector.get_columns('milestones')]
    if 'slug' in cols:
        op.drop_column('milestones', 'slug')
