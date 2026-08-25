# Tattoo Record Mobile

Native Expo companion for Tattoo Record. It uses the shared Express API, the same bearer-token auth contract, and runtime media URLs from the web product.

## Local development

Run the managed `artifacts/tattoo-record-mobile: expo` workflow. The workflow injects `EXPO_PUBLIC_DOMAIN`; the QR code in the Replit URL bar opens the app in Expo Go. Use a phone-sized preview (400 × 720) when checking layouts.

## Configuration

- `EXPO_PUBLIC_DOMAIN` is injected by the workflow and is used for API requests.
- `EXPO_PUBLIC_API_URL` may override the API origin for a separately hosted environment.
- `EXPO_PUBLIC_DEMO_MODE=true` enables the existing demo-login buttons when the backend allows them.
- Auth tokens are stored with `expo-secure-store`; invalid sessions are cleared and the user is returned to the signed-out screen.

## Native-device release check

Use the QR code from the managed Expo workflow to open the same build on one iPhone and one Android phone. Complete the following before distribution:

1. Sign in, force an expired-token response if possible, confirm the app returns to sign-in, then sign in and sign out again.
2. From **Create**, grant photo-library and camera permission, then publish one image and one video below the server’s 50 MB limit. Deny each permission once to confirm the app explains what is needed; if the OS no longer allows another prompt, use **Open settings** to restore it.
3. Open an existing conversation, check its history, type and send a new message with the keyboard open, then dismiss the keyboard and confirm the composer remains above the home indicator.
4. Open Notifications, Bookings, Saved work, and Settings from the account menu. Confirm the bottom navigation, sheet actions, and form submit buttons are not obscured by the status bar, home indicator, or keyboard.

The automated build validates iOS and Android bundles, but the final camera, media-library, secure-storage, and physical keyboard pass must be completed on actual devices.

## iOS distribution

The app is configured with the stable bundle identifier `com.tattoorecord.mobile`, portrait orientation, app icon, splash color, and photo/camera permission descriptions. Publishing through Replit Expo Launch requires the user’s Apple Developer membership, App Store Connect access, signing agreement acceptance, and any required app privacy answers. The user starts the build/submission from the Publish flow; no Apple credentials are stored in this project.