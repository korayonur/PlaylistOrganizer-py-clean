# -*- mode: python ; coding: utf-8 -*-
import os
import sys
from PyInstaller.utils.hooks import collect_dynamic_libs, collect_all, collect_submodules

# Gerekli dosyaların yollarını belirle
base_dir = os.path.abspath('.')
resources_dir = os.path.join(base_dir, 'resources')
config_file = os.path.join(base_dir, 'config.py')
apiserver_file = os.path.join(base_dir, 'apiserver.py')
main_file = os.path.join(base_dir, 'main.py')

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

# webview için tüm alt modülleri topla
webview_submodules = collect_submodules('webview')

# fastapi için tüm alt modülleri topla
fastapi_submodules = collect_submodules('fastapi')

# uvicorn için tüm alt modülleri topla
uvicorn_submodules = collect_submodules('uvicorn')

# starlette için tüm alt modülleri topla
starlette_submodules = collect_submodules('starlette')

# Multiprocessing için gerekli modüller
multiprocessing_modules = [
    'multiprocessing',
    'multiprocessing.synchronize',
    'multiprocessing.popen_spawn_posix',
    'multiprocessing.popen_fork',
    'multiprocessing.popen_forkserver',
    'multiprocessing.popen_spawn_win32',
    'multiprocessing.spawn',
    'multiprocessing.semaphore_tracker',
]

a = Analysis(
    [main_file],
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
        'webview',
        'webview.platforms.cocoa',
        'requests',
        'urllib3',
        'charset_normalizer',
        'idna',
        'certifi',
        'python-Levenshtein',
        'strsim',
        'python-magic',
        'rapidfuzz',
        'python-multipart',
    ] + pkg_resources_submodules + psutil_submodules + webview_submodules + fastapi_submodules + uvicorn_submodules + starlette_submodules + all_modules + multiprocessing_modules,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=2,  # Optimize bytecode
)

pyz = PYZ(a.pure)

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
    argv_emulation=False,
    target_arch='arm64',
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)

# Collect all files into a directory
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='PlaylistOrganizer',
)

# Create a Mac application bundle
app = BUNDLE(
    coll,
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
        'NSPrincipalClass': 'NSApplication',
        'NSAppleScriptEnabled': False,
        'CFBundleDocumentTypes': [],
        'LSMinimumSystemVersion': '11.0.0',  # macOS Big Sur ve üzeri için
        'LSApplicationCategoryType': 'public.app-category.utilities',
        'NSRequiresAquaSystemAppearance': False,  # Dark mode desteği
        'NSAppTransportSecurity': {
            'NSAllowsArbitraryLoads': True
        },
        # Multiprocessing için gerekli ayarlar
        'PyRuntimeLocations': [
            '@executable_path/../Frameworks/libpython3.11.dylib',
            '/opt/homebrew/opt/python@3.11/Frameworks/Python.framework/Versions/3.11/Python'
        ],
    },
) 