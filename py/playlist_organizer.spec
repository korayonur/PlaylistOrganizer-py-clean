# -*- mode: python ; coding: utf-8 -*-
import os
import sys
from PyInstaller.utils.hooks import collect_all, collect_submodules

# Dosya yolları
block_cipher = None
resources_path = os.path.join(os.path.dirname(os.path.abspath(SPEC)), 'resources')
config_file = os.path.join(os.path.dirname(os.path.abspath(SPEC)), 'config.py')
app_path = os.path.join(os.path.dirname(os.path.abspath(SPEC)))

# Gerekli sistem modülleri
system_modules = ['os', 'sys', 'time', 'json', 'logging', 'threading', 'datetime']
hash_modules = ['_md5', 'hashlib']

# Toplama işlemi
a = Analysis(
    ['main.py'],
    pathex=[app_path],
    binaries=[],
    datas=[
        (resources_path, 'resources'),
        (config_file, '.'),
    ],
    hiddenimports=[
        'uvicorn',
        'fastapi',
        'starlette',
        'pydantic',
        'multipart',
        'webview',
    ] + system_modules + hash_modules + collect_submodules('fastapi') + collect_submodules('starlette'),
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'matplotlib', 'numpy', 'pandas', 'scipy', 'PIL', 'tkinter', 'PySide2', 'PySide6',
        'PyQt5', 'PyQt6', 'PyQt5.QtCore', 'PyQt5.QtGui', 'PyQt5.QtWidgets',
        'PyQt5.QtBluetooth', 'PyQt5.QtDBus', 'PyQt5.QtDesigner', 'PyQt5.QtHelp',
        'PyQt5.QtLocation', 'PyQt5.QtMultimedia', 'PyQt5.QtMultimediaWidgets',
        'PyQt5.QtNetwork', 'PyQt5.QtNfc', 'PyQt5.QtOpenGL', 'PyQt5.QtPositioning',
        'PyQt5.QtPrintSupport', 'PyQt5.QtQml', 'PyQt5.QtQuick', 'PyQt5.QtQuickWidgets',
        'PyQt5.QtSensors', 'PyQt5.QtSerialPort', 'PyQt5.QtSql', 'PyQt5.QtSvg',
        'PyQt5.QtTest', 'PyQt5.QtWebEngine', 'PyQt5.QtWebEngineCore', 'PyQt5.QtWebEngineWidgets', 
        'PyQt5.QtWebChannel', 'PyQt5.QtXml', 'PyQt5.QtXmlPatterns',
        'sqlalchemy', 'sqlalchemy.ext.declarative', 'sqlalchemy.orm', 'sqlalchemy.dialects.sqlite',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

# Gereksiz dosyaları kaldır
a.binaries = [x for x in a.binaries if not 'PyQt' in x[0]]
a.datas = [x for x in a.datas if not 'PyQt' in x[0]]

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='PlaylistOrganizer',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=True,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='PlaylistOrganizer',
)

app = BUNDLE(
    coll,
    name='PlaylistOrganizer.app',
    bundle_identifier='com.koray.playlistorganizer',
    info_plist={
        'NSPrincipalClass': 'NSApplication',
        'NSAppleScriptEnabled': False,
        'NSHighResolutionCapable': True,
        'CFBundleShortVersionString': '1.0.0',
        'CFBundleVersion': '1.0.0',
        'CFBundleDisplayName': 'Playlist Organizer',
        'CFBundleName': 'Playlist Organizer',
        'LSApplicationCategoryType': 'public.app-category.music',
        'LSMinimumSystemVersion': '10.15',
    },
)