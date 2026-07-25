# Base map image

Drop the extracted Palpagos base map texture here as `base.png`.

The app positions it using the two world corner points in `src/coords.js`
(`WORLD_BOUNDS_SAV`). If markers land off the island, nudge those two points
until a couple of known landmarks line up.

Until `base.png` exists, the app draws a placeholder rectangle so markers are
still visible.
