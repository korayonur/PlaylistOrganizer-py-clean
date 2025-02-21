# -*- mode: python ; coding: utf-8 -*-
import os
import sys
from PyInstaller.utils.hooks import collect_dynamic_libs, collect_all, collect_submodules

# Gerekli dosyaların yollarını belirle
base_dir = os.path.dirname(os.path.abspath('__main__.py'))
resources_dir = os.path.join(base_dir, 'resources')
config_file = os.path.join(base_dir, 'config.py')
apiserver_file = os.path.join(base_dir, 'apiserver.py')

# Python modülleri
domain_dir = os.path.join(base_dir, 'domain')
application_dir = os.path.join(base_dir, 'application')
infrastructure_dir = os.path.join(base_dir, 'infrastructure')
presentation_dir = os.path.join(base_dir, 'presentation')

# Collect all required binaries and data
binaries = []
datas = []

# Temel sistem modülleri
system_modules = [
    'socket',
    '_socket',
    '_ssl',
    'ssl',
    '_posixshmem',
    '_multiprocessing',
    'email',
    'email.parser',
    'email.feedparser',
    'email._policybase',
    'email.utils',
    'psutil',
    'psutil._psutil_posix',
    'psutil._psutil_osx',
    'psutil._psutil_darwin',
]

# Hash algoritmaları için gerekli modüller
hash_modules = [
    '_md5',
    '_sha1',
    '_sha256',
    '_sha512',
    '_blake2',
    '_sha3',
    'hashlib',
    '_hashlib'
]

# Tüm modülleri topla
all_modules = system_modules + hash_modules

for module in all_modules:
    try:
        bins, dts, hiddenimports = collect_all(module)
        binaries.extend(bins)
        datas.extend(dts)
    except Exception:
        pass

# pkg_resources için tüm alt modülleri topla
pkg_resources_submodules = collect_submodules('pkg_resources')

# psutil için tüm alt modülleri topla
psutil_submodules = collect_submodules('psutil')

a = Analysis(
    ['__main__.py'],
    pathex=[base_dir],
    binaries=binaries,
    datas=[
        (resources_dir, 'resources'),
        (config_file, '.'),
        (apiserver_file, '.'),
        (domain_dir, 'domain'),
        (application_dir, 'application'),
        (infrastructure_dir, 'infrastructure'),
        (presentation_dir, 'presentation'),
        (os.path.join(base_dir, 'musicfiles.db.json'), '.'),
    ] + datas,
    hiddenimports=[
        'sqlalchemy',
        'pydantic',
        'aiofiles',
        'loguru',
        'asyncio',
        'apiserver',
        'domain',
        'application',
        'infrastructure',
        'presentation',
        'xmltodict',
        'fastapi',
        'fastapi.middleware',
        'fastapi.middleware.cors',
        'starlette',
        'starlette.middleware',
        'starlette.middleware.cors',
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.protocols',
        'json',
        'typing',
        'multiprocessing.resource_tracker',
        'multiprocessing.shared_memory',
        'multiprocessing.heap',
        'multiprocessing.pool',
        'multiprocessing.connection',
        'multiprocessing.queues',
        'multiprocessing.popen_spawn_posix',
        'multiprocessing.process',
        'multiprocessing.util',
        'multiprocessing.context',
        'multiprocessing.managers',
        'psutil',
        'psutil._psutil_posix',
        'psutil._psutil_osx',
        'psutil._psutil_darwin',
    ] + pkg_resources_submodules + psutil_submodules + all_modules,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='playlist_organizer',
    debug=True,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=True,
    target_arch='arm64',
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
    version='1.0.0',
    manifest=None,
    resources=[],
    exe_name='Playlist Organizer'
)

app = BUNDLE(
    exe,
    name='PlaylistOrganizer.app',
    icon=None,
    bundle_identifier='com.playlistorganizer.app',
    info_plist={
        'CFBundleName': 'Playlist Organizer',
        'CFBundleDisplayName': 'Playlist Organizer',
        'CFBundleGetInfoString': "Playlist Organizer",
        'CFBundleVersion': "1.0.0",
        'CFBundleShortVersionString': "1.0.0",
        'NSHighResolutionCapable': 'True',
        'LSEnvironment': {
            'PATH': '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'
        },
        'CFBundleExecutable': 'Playlist Organizer',
        'CFBundleIdentifier': 'com.playlistorganizer.app',
        'CFBundlePackageType': 'APPL',
        'LSMinimumSystemVersion': '10.10.0',
    },
)
