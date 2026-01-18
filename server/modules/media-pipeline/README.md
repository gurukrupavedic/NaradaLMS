# Media Pipeline Module

## Purpose
Handles the storage, retrieval, and mapping of media assets (primarily audio) to educational content.

## Responsibilities
- **Audio Management**: Upload and storage of chapter audio files.
- **Time-Mapping**: Manages the precise timestamps mapping audio to text segments.
- **Asset Delivery**: Generates signed URLs or serves public media assets.

## Key Domain Invariants
1.  **Segment-Based**: Audio mappings are strictly tied to `segment_id` and timestamps.
2.  **Immutability**: Once mapped, audio segments should remain stable unless the underlying text structure changes.
3.  **Performance**: Media metadata should be optimized for fast retrieval during the learning experience.

## Exports
- `mediaService`: Application logic for media handling.
- `mediaStorage`: Database access for media records.
