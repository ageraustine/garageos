"""Clean up duplicate estimate versions - keep only latest per job

Revision ID: 016
Revises: 015
Create Date: 2024-01-01

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = "016"
down_revision = "015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Clean up duplicate estimates - each job should have only ONE estimate.
    Keep the latest version (highest version number) and delete older ones.
    """
    connection = op.get_bind()

    # Find jobs with multiple estimates
    jobs_with_duplicates = connection.execute(
        sa.text("""
            SELECT job_id, COUNT(*) as count
            FROM estimates
            GROUP BY job_id
            HAVING COUNT(*) > 1
        """)
    ).fetchall()

    for job_id, count in jobs_with_duplicates:
        # Get the latest estimate (keep this one)
        latest = connection.execute(
            sa.text("""
                SELECT id FROM estimates
                WHERE job_id = :job_id
                ORDER BY version DESC
                LIMIT 1
            """),
            {"job_id": job_id}
        ).fetchone()

        if latest:
            latest_id = latest[0]

            # Delete line items from older estimates
            connection.execute(
                sa.text("""
                    DELETE FROM line_items
                    WHERE estimate_id IN (
                        SELECT id FROM estimates
                        WHERE job_id = :job_id AND id != :latest_id
                    )
                """),
                {"job_id": job_id, "latest_id": latest_id}
            )

            # Delete older estimates
            connection.execute(
                sa.text("""
                    DELETE FROM estimates
                    WHERE job_id = :job_id AND id != :latest_id
                """),
                {"job_id": job_id, "latest_id": latest_id}
            )

    # Reset version to 1 for all remaining estimates (clean slate)
    connection.execute(
        sa.text("UPDATE estimates SET version = 1")
    )


def downgrade() -> None:
    # Cannot restore deleted data
    pass
