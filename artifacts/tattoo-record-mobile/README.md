# Tattoo Record Mobile

Native Expo companion for Tattoo Record. It uses the shared Express API, the same bearer-token auth contract, and runtime media URLs from the web product.

## Local development

Run the managed `artifacts/tattoo-record-mobile: expo` workflow. The workflow injects `EXPO_PUBLIC_DOMAIN`; the QR code in the Replit URL bar opens the app in Expo Go. Use a phone-sized preview (400 × 720) when checking layouts.

## Configuration

- `EXPO_PUBLIC_DOMAIN` is injected by the workflow and is used for API requests.
- `EXPO_PUBLIC_API_URL` may override the API origin for a separately hosted environment.
- `EXPO_PUBLIC_DEMO_MODE=true` enables the existing demo-login buttons when the backend allows them.
- Auth tokens are stored with `expo-secure-store`; invalid sessions are cleared and the user is returned to the signed-out screen.

## iOS distribution

The app is configured with the stable bundle identifier `com.tattoorecord.mobile`, portrait orientation, app icon, splash color, and photo/camera permission descriptions. Publishing through Replit Expo Launch requires the user’s Apple Developer membership, App Store Connect access, signing agreement acceptance, and any required app privacy answers. The user starts the build/submission from the Publish flow; no Apple credentials are stored in this project.