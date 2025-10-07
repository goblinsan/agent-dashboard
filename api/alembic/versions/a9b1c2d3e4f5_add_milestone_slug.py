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
    # Bail out entirely if table doesn't exist (e.g., partial environments)
    try:
        cols = [c['name'] for c in inspector.get_columns('milestones')]
    except Exception:
        return
    if 'slug' not in cols:
        # add slug column (nullable) to milestones
        op.add_column('milestones', sa.Column('slug', sa.String(length=255), nullable=True))

    # create unique index on project_id + slug if it doesn't already exist
    existing_indexes = {idx['name'] for idx in inspector.get_indexes('milestones')}
    idx_names = {op.f('ux_milestones_project_id_slug'), 'ux_milestones_project_slug'}
    if not (idx_names & existing_indexes):
        op.create_index(op.f('ux_milestones_project_id_slug'), 'milestones', ['project_id', 'slug'], unique=True)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    try:
        existing_indexes = {idx['name'] for idx in inspector.get_indexes('milestones')}
    except Exception:
        existing_indexes = set()
    for idx_name in (op.f('ux_milestones_project_id_slug'), 'ux_milestones_project_slug'):
        if idx_name in existing_indexes:
            try:
                op.drop_index(idx_name, table_name='milestones')
            except Exception:
                pass

    try:
        cols = [c['name'] for c in inspector.get_columns('milestones')]
    except Exception:
        cols = []
    if 'slug' in cols:
        try:
            op.drop_column('milestones', 'slug')
        except Exception:
            pass
