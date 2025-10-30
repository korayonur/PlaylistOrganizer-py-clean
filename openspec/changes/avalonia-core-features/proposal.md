# Avalonia Core Features Proposal

## Why
Avalonia uygulaması temel özelliklerle çalışıyor ancak eksik olan core functionality'ler var. Mevcut durumda playlist'ler görünüyor ve track'ler yükleniyor, ancak import, search, ve diğer temel özellikler eksik.

## What Changes
- **ADDED**: Import functionality (M3U, VDJFolder parsing)
- **ADDED**: Search functionality (playlist ve track arama)
- **ADDED**: Track validation (dosya varlığı kontrolü)
- **ADDED**: Progress tracking (import süreci takibi)
- **ADDED**: Error handling (hata yönetimi)
- **MODIFIED**: Database schema (foreign keys, constraints)
- **MODIFIED**: UI responsiveness (loading states, progress bars)

## Impact
- Affected specs: ui-interaction, mimari
- Affected code: Services/, ViewModels/, Views/
- Database: musicfiles.db schema updates
- UI: MainWindow.axaml, ProgressOverlay.axaml
