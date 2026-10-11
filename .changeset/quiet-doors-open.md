---
---

Pre-release fix, no version bump: nanoterm has not been published yet, so this
lands as part of `1.0.0`.

The setup wizard's "What would you like to do?" menu now has an Exit choice.
It was the only screen without a way back, so someone who opened the wizard just
to look could leave only with Ctrl+C, which made the wizard look stuck rather
than finished.
