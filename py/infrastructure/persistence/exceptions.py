"""
Veritabanı ve repository katmanı için özel exception sınıfları.
"""


class DatabaseError(Exception):
    """Veritabanı işlemleri sırasında oluşan hatalar için özel exception sınıfı."""

    pass


class RepositoryError(Exception):
    """Repository işlemleri sırasında oluşan hatalar için özel exception sınıfı."""

    pass
