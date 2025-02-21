import asyncio
import os

from PyQt6.QtCore import QSize, Qt, QTimer
from PyQt6.QtGui import QFont, QIcon
from PyQt6.QtWidgets import (
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QMainWindow,
    QMessageBox,
    QProgressBar,
    QPushButton,
    QStatusBar,
    QTableWidget,
    QTableWidgetItem,
    QTreeWidget,
    QTreeWidgetItem,
    QVBoxLayout,
    QWidget,
)

from ...application.use_cases.get_playlist_songs import GetPlaylistSongsUseCase
from ...application.use_cases.get_playlist_tree import GetPlaylistTreeUseCase
from ...application.use_cases.index_music_files import IndexMusicFilesUseCase
from ...application.use_cases.search_music_files import SearchMusicFilesUseCase
from ...domain.services.similarity_calculator import SimilarityCalculator
from ...domain.services.text_normalizer import TextNormalizer
from ...domain.value_objects.supported_formats import SupportedFormats
from ...infrastructure.persistence.json_database import JsonDatabase
from ...infrastructure.persistence.repositories.json_music_file_repository import (
    JsonMusicFileRepository,
)
from ...infrastructure.persistence.repositories.json_playlist_repository import (
    JsonPlaylistRepository,
)


class MainWindow(QMainWindow):
    """Ana pencere"""

    def __init__(self):
        super().__init__()

        # Pencere ayarları
        self.setWindowTitle("Playlist Organizer")
        self.setMinimumSize(1200, 800)

        # Servisler ve repository'ler
        self._init_services()

        # UI bileşenleri
        self._init_ui()

        # Verileri yükle
        QTimer.singleShot(0, lambda: asyncio.create_task(self._load_data()))

    def _init_services(self):
        """Servisleri ve repository'leri başlatır"""
        # Sabit yollar
        self.playlists_root = os.path.expanduser("~/Library/Application Support/VirtualDJ/Folders")
        self.music_root = os.path.expanduser("~/Music/KorayMusics")
        self.db_path = "musicfiles.db.json"

        # Servisler
        self.text_normalizer = TextNormalizer()
        self.similarity_calculator = SimilarityCalculator()
        self.supported_formats = SupportedFormats()

        # Veritabanı
        self.database = JsonDatabase(self.db_path)

        # Repository'ler
        self.music_file_repository = JsonMusicFileRepository(self.database)
        self.playlist_repository = JsonPlaylistRepository(self.playlists_root)

        # Use case'ler
        self.index_music_files = IndexMusicFilesUseCase(
            music_file_repository=self.music_file_repository,
            text_normalizer=self.text_normalizer,
            supported_formats=self.supported_formats,
        )

        self.search_music_files = SearchMusicFilesUseCase(
            music_file_repository=self.music_file_repository,
            text_normalizer=self.text_normalizer,
            similarity_calculator=self.similarity_calculator,
        )

        self.get_playlist_tree = GetPlaylistTreeUseCase(
            playlist_repository=self.playlist_repository
        )

        self.get_playlist_songs = GetPlaylistSongsUseCase(
            playlist_repository=self.playlist_repository
        )

    def _init_ui(self):
        """UI bileşenlerini oluşturur"""
        # Ana widget
        main_widget = QWidget()
        self.setCentralWidget(main_widget)

        # Ana layout
        main_layout = QVBoxLayout(main_widget)

        # Üst toolbar
        toolbar_layout = QHBoxLayout()

        self.index_button = QPushButton("İndeksle")
        self.index_button.setIcon(QIcon.fromTheme("view-refresh"))
        self.index_button.clicked.connect(self._index_files)
        toolbar_layout.addWidget(self.index_button)

        toolbar_layout.addStretch()

        main_layout.addLayout(toolbar_layout)

        # İçerik layout'u
        content_layout = QHBoxLayout()

        # Sol panel: Playlist ağacı
        left_panel = QVBoxLayout()

        playlist_label = QLabel("Playlist Ağacı")
        playlist_label.setFont(QFont("Arial", 12, QFont.Weight.Bold))
        left_panel.addWidget(playlist_label)

        self.playlist_tree = QTreeWidget()
        self.playlist_tree.setHeaderLabels(["Playlist"])
        self.playlist_tree.setIconSize(QSize(16, 16))
        self.playlist_tree.itemClicked.connect(self._on_playlist_selected)
        left_panel.addWidget(self.playlist_tree)

        content_layout.addLayout(left_panel)

        # Sağ panel: Playlist içeriği
        right_panel = QVBoxLayout()

        content_label = QLabel("Playlist İçeriği")
        content_label.setFont(QFont("Arial", 12, QFont.Weight.Bold))
        right_panel.addWidget(content_label)

        self.content_table = QTableWidget()
        self.content_table.setColumnCount(3)
        self.content_table.setHorizontalHeaderLabels(["Dosya Yolu", "Durum", "Önerilen"])
        self.content_table.horizontalHeader().setSectionResizeMode(
            0, QHeaderView.ResizeMode.Stretch
        )
        right_panel.addWidget(self.content_table)

        content_layout.addLayout(right_panel)

        main_layout.addLayout(content_layout)

        # Alt bilgi çubuğu
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)

        # İlerleme çubuğu
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        self.status_bar.addPermanentWidget(self.progress_bar)

    async def _load_data(self):
        """Verileri yükler"""
        try:
            # Playlist ağacını yükle
            result = await self.get_playlist_tree.execute()
            if result["success"]:
                self._populate_playlist_tree(result["data"])
                self.status_bar.showMessage(
                    f"Toplam {result['stats']['totalNodes']} öğe yüklendi "
                    f"({result['stats']['folders']} klasör, "
                    f"{result['stats']['playlists']} playlist)"
                )
        except Exception as e:
            QMessageBox.critical(self, "Hata", f"Veriler yüklenirken hata oluştu: {e}")

    def _populate_playlist_tree(self, items, parent=None):
        """Playlist ağacını doldurur"""
        for item in items:
            tree_item = QTreeWidgetItem(parent or self.playlist_tree)
            tree_item.setText(0, item["name"])
            tree_item.setIcon(
                0, QIcon.fromTheme("folder" if item["type"] == "folder" else "audio-x-generic")
            )
            tree_item.setData(0, Qt.ItemDataRole.UserRole, item)

            if item.get("children"):
                self._populate_playlist_tree(item["children"], tree_item)

    async def _on_playlist_selected(self, item):
        """Playlist seçildiğinde çağrılır"""
        try:
            playlist_data = item.data(0, Qt.ItemDataRole.UserRole)
            if playlist_data["type"] != "playlist":
                return

            # Playlist içeriğini yükle
            result = await self.get_playlist_songs.execute(playlist_data["path"])
            if result["success"]:
                self._populate_content_table(result["songs"], result["stats"])
        except Exception as e:
            QMessageBox.critical(self, "Hata", f"Playlist içeriği yüklenirken hata oluştu: {e}")

    def _populate_content_table(self, songs, stats):
        """İçerik tablosunu doldurur"""
        self.content_table.setRowCount(len(songs))

        for i, song in enumerate(songs):
            # Dosya yolu
            path_item = QTableWidgetItem(song["path"])
            self.content_table.setItem(i, 0, path_item)

            # Durum
            status_item = QTableWidgetItem("✅ Mevcut" if song["exists"] else "❌ Bulunamadı")
            status_item.setForeground(
                Qt.GlobalColor.darkGreen if song["exists"] else Qt.GlobalColor.darkRed
            )
            self.content_table.setItem(i, 1, status_item)

            # Önerilen (eğer dosya bulunamadıysa)
            if not song["exists"]:
                suggestion_item = QTableWidgetItem("🔍 Ara")
                suggestion_item.setForeground(Qt.GlobalColor.blue)
                self.content_table.setItem(i, 2, suggestion_item)

        self.status_bar.showMessage(
            f"Toplam {stats['totalSongs']} şarkı "
            f"({stats['existingSongs']} mevcut, "
            f"{stats['missingSongs']} eksik)"
        )

    async def _index_files(self):
        """Müzik dosyalarını indeksler"""
        try:
            self.index_button.setEnabled(False)
            self.progress_bar.setVisible(True)
            self.progress_bar.setRange(0, 0)
            self.status_bar.showMessage("İndeksleniyor...")

            result = await self.index_music_files.execute(self.music_root)

            if result["status"] == "success":
                self.status_bar.showMessage(
                    f"İndeksleme tamamlandı: {result['data']['total_files']} dosya, "
                    f"{result['data']['duration']:.1f} saniye"
                )

                if result["data"]["error_count"] > 0:
                    QMessageBox.warning(
                        self,
                        "Uyarı",
                        f"{result['data']['error_count']} dosya işlenirken hata oluştu",
                    )
            else:
                raise Exception(result["message"])

        except Exception as e:
            QMessageBox.critical(self, "Hata", f"İndeksleme sırasında hata oluştu: {e}")
        finally:
            self.index_button.setEnabled(True)
            self.progress_bar.setVisible(False)
