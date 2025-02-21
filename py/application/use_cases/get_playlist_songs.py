from loguru import logger

from ...domain.repositories.playlist_repository import PlaylistRepository


class GetPlaylistSongsUseCase:
    """Playlist şarkılarını getirme use case'i"""

    def __init__(self, playlist_repository: PlaylistRepository):
        self.playlist_repository = playlist_repository

    async def execute(self, playlist_path: str) -> dict:
        """Playlist şarkılarını getirir"""
        try:
            if not playlist_path:
                return {"success": False, "error": "Path parametresi gerekli"}

            songs = await self.playlist_repository.get_playlist_songs(playlist_path)

            stats = {
                "totalSongs": len(songs),
                "existingSongs": len([s for s in songs if s.exists]),
                "missingSongs": len([s for s in songs if not s.exists]),
            }

            return {"success": True, "songs": songs, "stats": stats}

        except Exception as e:
            logger.error("Playlist okuma hatası", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "details": {"error_code": getattr(e, "code", None), "error_message": str(e)},
            }
