from typing import List

from loguru import logger

from ...domain.entities.playlist import Playlist
from ...domain.repositories.playlist_repository import PlaylistRepository


class GetPlaylistTreeUseCase:
    """Playlist ağacını getirme use case'i"""

    def __init__(self, playlist_repository: PlaylistRepository):
        self.playlist_repository = playlist_repository

    async def execute(self) -> dict:
        """Playlist ağacını getirir"""
        try:
            tree = await self.playlist_repository.get_playlist_tree()

            stats = {
                "totalNodes": self._count_nodes(tree),
                "folders": self._count_by_type(tree, "folder"),
                "playlists": self._count_by_type(tree, "playlist"),
            }

            return {"success": True, "data": tree, "stats": stats}

        except Exception as e:
            logger.error("Playlist ağacı oluşturulurken hata", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "details": {"error_code": getattr(e, "code", None), "error_message": str(e)},
            }

    def _count_nodes(self, tree: List[Playlist]) -> int:
        """Ağaçtaki toplam düğüm sayısını hesaplar"""
        return sum(1 + (self._count_nodes(node.children) if node.children else 0) for node in tree)

    def _count_by_type(self, tree: List[Playlist], type_: str) -> int:
        """Belirli tipteki düğüm sayısını hesaplar"""
        return sum(
            (1 if node.type == type_ else 0)
            + (self._count_by_type(node.children, type_) if node.children else 0)
            for node in tree
        )
