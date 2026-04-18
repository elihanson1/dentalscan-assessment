# DentalScan AI — UX Audit

## UX Observations

**Capture Button Feedback**
The capture button lacks clear state signaling. On mobile, there was no obvious visual cue indicating the button was active and ready — a color transition (e.g., grey → green or blue) tied to camera readiness would significantly improve affordance and reduce user hesitation.

**Guidance Overlay Usability**
The crosshair/dot tracking concept is sound, but execution on mobile felt strenuous — particularly during side-angle scans (Left/Right views). Achieving alignment required awkward head or wrist positioning. The color-change sensitivity was too aggressive, minor real-world movements caused rapid color oscillation that was hard to correct from, making the visual feedback feel unreliable and confusing rather than helpful.

**Pre-Scan Reference Framing**
There is no onboarding context before the capture flow begins. A brief carousel or swipeable reference screen showing example photos for each of the 5 angles, dismissed with a "Got it" button, would set user expectations and likely improve first-attempt image quality.

**Angle Guidance Overlay**
Replacing or augmenting the current circle overlay with a translucent facial silhouette at the precise optimal angle per scan step would be more intuitive. Matching your face to a ghost outline is a clearer instruction than matching to a color state.

**AI Result Accuracy**
A 99% confidence result flagging a missing tooth that is not missing is a critical false positive. This represents a real trust and liability concern — confidence thresholds and model calibration should be reviewed before any clinical use.