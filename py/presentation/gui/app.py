import asyncio
import sys

import qasync
from PyQt6.QtWidgets import QApplication

from .main_window import MainWindow


class Application(QApplication):
    """Uygulama sınıfı"""

    def __init__(self, argv):
        super().__init__(argv)

        self.setApplicationName("Playlist Organizer")
        self.setApplicationVersion("1.0.0")

        # Ana pencere
        self.main_window = MainWindow()
        self.main_window.show()


def main():
    """Uygulamayı başlatır"""
    app = Application(sys.argv)

    try:
        loop = qasync.QEventLoop(app)
        asyncio.set_event_loop(loop)
        with loop:
            loop.run_forever()
    except KeyboardInterrupt:
        sys.exit(0)
