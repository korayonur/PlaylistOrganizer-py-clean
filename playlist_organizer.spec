# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

system_modules = [
    'socket', '_socket', '_ssl', 'ssl', 
    'email', 'email.mime.text', 'email.mime.multipart',
    'hashlib', '_hashlib', '_md5', '_sha1', '_sha256', '_sha512'
]

a = Analysis(
    ['__main__.py'],
    pathex=['/Users/koray/projects/PlaylistOrganizer-py/py'],
    binaries=[],
    datas=[
        ('resources', 'resources'),  # Web UI dosyaları
        ('presentation/gui/views', 'presentation/gui/views'),  # GUI view'ları
        ('presentation/gui/assets', 'presentation/gui/assets'),  # GUI assetleri
    ],
    hiddenimports=[
        'engineio.async_drivers.aiohttp',
        'sqlalchemy.ext.baked',
        'sqlalchemy.ext.declarative',
        *system_modules,  # Sistem modüllerini ekle
        'presentation.gui.app',
        'presentation.api',
        'config',
        'aiohttp',
        'fastapi',
        'uvicorn',
        'sqlalchemy',
        'xmltodict',
        'pydantic'
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(
    a.pure, 
    a.zipped_data,
    cipher=block_cipher
)

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
    target_arch='arm64',  # M1 için
    codesign_identity='Apple Development',  # Code signing ekle
    entitlements_file='entitlements.plist',  # Entitlements ekle
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
    icon=None,
    bundle_identifier='com.koray.playlistorganizer',
    info_plist={
        'LSMinimumSystemVersion': '11.0',
        'NSHighResolutionCapable': True,
        'CFBundleSupportedPlatforms': ['MacOSX'],
        'CFBundleVersion': '1.0.0',
        'CFBundleShortVersionString': '1.0.0',
        'NSAppleEventsUsageDescription': 'App requires access to send Apple Events',
        'NSMicrophoneUsageDescription': 'App requires access to microphone',
        'NSCameraUsageDescription': 'App requires access to camera',
    }
)

# hiddenimports listesine eklenecek
hiddenimports = [
    'presentation.gui.app',
    'presentation.api',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
] 