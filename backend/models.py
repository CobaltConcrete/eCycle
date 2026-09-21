import bcrypt
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import backref, relationship

from database import Base


class AuthIdentity(Base):
    __tablename__ = "authidentity"

    auth_user_id = Column(String(36), primary_key=True)
    userid = Column(
        Integer, ForeignKey("usertable.userid"), unique=True, nullable=False
    )
    disabled = Column(Boolean, nullable=False, default=False, server_default="false")


class UserTable(Base):
    __tablename__ = "usertable"

    userid = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    points = Column(BigInteger, default=0)
    usertype = Column(String(50), nullable=False)

    def check_password(self, password):
        try:
            return bcrypt.checkpw(
                password.encode("utf-8"), self.password.encode("utf-8")
            )
        except ValueError:
            return False

    @classmethod
    def create_user(cls, username, password, usertype):
        hashed_password = bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt(rounds=12)
        ).decode("utf-8")
        return cls(username=username, password=hashed_password, usertype=usertype)


class ShopTable(Base):
    __tablename__ = "shoptable"

    shopid = Column(
        Integer, ForeignKey("usertable.userid"), primary_key=True, nullable=False
    )
    shopname = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longtitude = Column(Float, nullable=False)
    addressname = Column(String(255), nullable=False)
    website = Column(String(255))
    actiontype = Column(String(255), nullable=False)

    user = relationship("UserTable", backref=backref("shop", uselist=False))


class ChecklistOptionTable(Base):
    __tablename__ = "checklistoptiontable"

    checklistoptionid = Column(Integer, primary_key=True, autoincrement=True)
    checklistoptiontype = Column(String(100), nullable=False)


class UserChecklistTable(Base):
    __tablename__ = "userchecklisttable"

    userid = Column(Integer, ForeignKey("usertable.userid"), primary_key=True)
    checklistoptionid = Column(
        Integer, ForeignKey("checklistoptiontable.checklistoptionid"), primary_key=True
    )

    user = relationship("UserTable", backref=backref("checklist_options", lazy=True))
    option = relationship("ChecklistOptionTable", backref=backref("users", lazy=True))


class ForumTable(Base):
    __tablename__ = "forumtable"

    forumid = Column(Integer, primary_key=True, autoincrement=True)
    forumtext = Column(String(255), nullable=False)
    shopid = Column(Integer, ForeignKey("shoptable.shopid"), nullable=False)
    posterid = Column(Integer, ForeignKey("usertable.userid"), nullable=False)
    time = Column(String(50), nullable=False)

    shop = relationship("ShopTable", backref=backref("forums", lazy=True))
    poster = relationship("UserTable", backref=backref("posts", lazy=True))


class CommentTable(Base):
    __tablename__ = "commenttable"

    commentid = Column(Integer, primary_key=True, autoincrement=True)
    commenttext = Column(String(255), nullable=False)
    forumid = Column(Integer, ForeignKey("forumtable.forumid"), nullable=False)
    posterid = Column(Integer, ForeignKey("usertable.userid"), nullable=False)
    replyid = Column(Integer, ForeignKey("commenttable.commentid"), nullable=True)
    encodedimage = Column(Text, nullable=True)
    time = Column(String(50), nullable=False)
    deleted = Column(Boolean, nullable=False, default=False)

    forum = relationship("ForumTable", backref=backref("comments", lazy=True))
    poster = relationship("UserTable", backref=backref("comments", lazy=True))
    reply = relationship("CommentTable", remote_side=[commentid], backref="replies")


class UserHistoryTable(Base):
    __tablename__ = "userhistorytable"

    userid = Column(
        Integer,
        ForeignKey("usertable.userid", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    shopid = Column(
        Integer,
        ForeignKey("shoptable.shopid", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    time = Column(String(50), nullable=False)

    user = relationship("UserTable", backref=backref("history", lazy=True))
    shop = relationship("ShopTable", backref=backref("history", lazy=True))


class ReportTable(Base):
    __tablename__ = "reporttable"

    reportid = Column(Integer, primary_key=True, autoincrement=True)
    commentid = Column(
        Integer,
        ForeignKey("commenttable.commentid", ondelete="CASCADE"),
        nullable=False,
    )
    reporterid = Column(
        Integer, ForeignKey("usertable.userid", ondelete="CASCADE"), nullable=False
    )
    time = Column(String(50), nullable=False)
    dangerscore = Column(
        Integer, nullable=False, default=1
    )  # Added danger score column

    comment = relationship("CommentTable", backref=backref("reports", lazy=True))
    reporter = relationship("UserTable", backref=backref("reports", lazy=True))
