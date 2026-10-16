# Mobile interaction preference

The user likes rotating a phone sideways to reveal a new interactive experience, as in the E & J piano keyboard. Consider this pattern for future mobile website concepts when it fits the brief. Keep the portrait website usable and make returning to it straightforward.

The user confirmed that both rotation and sound now work on their iPhone. Reuse the lessons from `ej-piano/device-view.js` and the piano components in `ej-piano/a`, `b`, and `c`:

- Detect phones independently of their current orientation. A landscape viewport wider than 767 px must not send a phone to a desktop export that lacks the interaction. Keep the chosen export stable while rotating.
- Start audio from a user gesture. Touch-down may precede audio permission; retry a blocked first note on touch release. Wait for audio startup before starting the short note's release timer.
- Feature-detect `navigator.audioSession` and request `playback` when playing sound. Resume both `suspended` and `interrupted` audio contexts, and recreate a closed context. Preserve working behavior on Android and desktop.
- Check actual audio output, first taps, held notes, release tails, and interruption recovery. A key changing color or an audio context reporting a state does not establish that sound is produced.

Regression references: `../../scripts/ej-piano-device-view.test.mjs` and `../../scripts/ej-piano-audio.test.mjs`. The iPhone fixes are recorded in commits `0f7f4e8` and `d1a0a5b`.
