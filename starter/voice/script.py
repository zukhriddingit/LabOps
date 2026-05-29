"""The scripted user turns for the LabOps Guardian demo.

Pre-generated as audio (Speechmatics TTS, 16 kHz) so the stage demo is deterministic and
never depends on a flaky live microphone. Each line is phrased so the Command Generator can
naturally fill the LabOps slots.
"""

USER_TURNS = [
    "Guardian, I'm taking Cardio Sample C17 out of minus 60 and putting it on Bench 2. "
    "It can stay at room temperature for 20 minutes.",
    "I calculated 20 microliters for 0.02 percent in 100 mL. Is that correct?",
    "Where are the 15 mL tubes?",
    "What centrifuge setup applies for this tissue sample?",
    "My gloves are contaminated. Message the postdoc that C17 is near the room-temp limit.",
    "Yes, send it.",
    "Give the night shift a handoff.",
]
