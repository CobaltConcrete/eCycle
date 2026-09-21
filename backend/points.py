from models import CommentTable, ForumTable, UserTable


def refresh_points(session, userids):
    """Recalculate affected authors in the same transaction as the mutation."""
    session.flush()
    for userid in set(userids):
        user = session.get(UserTable, userid)
        if user:
            user.points = (
                session.query(ForumTable).filter_by(posterid=userid).count() * 10
                + session.query(CommentTable)
                .filter_by(posterid=userid, deleted=False)
                .count()
                * 5
            )
