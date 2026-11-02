"""Inspect existing native captures; never resize or edit them."""
import hashlib
import json
from pathlib import Path
from PIL import Image

folder = Path(__file__).resolve().parent
names = [
    'final-pending-desktop-native', 'final-pending-mobile-native',
    'final-error-friendly-mobile-native', 'verified-error-friendly-desktop-native',
    'verified-film-result-desktop-native', 'verified-film-result-mobile-native',
    'verified-game-model-question-desktop-native', 'verified-game-result-desktop-native',
    'verified-game-result-mobile-native', 'verified-library-all4-desktop-native',
    'verified-library-all4-mobile-native', 'verified-library-evenings-mobile-native',
    'verified-series-model-question-mobile-native', 'verified-series-clarification-mobile-native',
    'verified-series-result-desktop-native', 'verified-series-result-mobile-top-native',
    'verified-series-result-mobile-card-native', 'verified-cartoon-model-question-desktop-native',
    'verified-cartoon-review-desktop-native', 'verified-cartoon-result-desktop-native',
    'verified-cartoon-result-mobile-top-native', 'verified-cartoon-result-mobile-card-native',
    'fix-cartoon-context-desktop-native', 'fix-cartoon-context-mobile-native',
    'fix-library-archive-desktop-native', 'fix-library-archive-319-native',
    'fix-library-all4-desktop-native',
    'fix-library-media-familiar-native',
]
metadata = json.loads((folder / 'capture-metadata.json').read_text(encoding='utf-8'))
by_name = {row['name']: row for row in metadata['captures']}
items = []
for name in names:
    path = folder / (name + '.png')
    with Image.open(path) as picture:
        width, height = picture.size
        fmt = picture.format
        assert width >= 280 and height >= 650, (name, width, height)
    items.append({
        'path': str(path), 'width': width, 'height': height, 'format': fmt,
        'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        'dom': by_name.get(name), 'coverage': 'native viewport, partial document',
    })
report = {
    'captureMethod': 'CUA getScreenshot; originals unedited',
    'limitations': 'Native dimensions differ from CSS viewport. Natural scroll position varies. Not full-document or pixel-fidelity evidence. Tiny advanced-fallback files outside this explicit list are excluded.',
    'captures': items, 'libraryFilters': metadata['libraryFilterChecks'],
}
(folder / 'artifact-manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'verifiedNativeCaptures': len(items), 'libraryDomains': len(metadata['libraryFilterChecks'])}))
