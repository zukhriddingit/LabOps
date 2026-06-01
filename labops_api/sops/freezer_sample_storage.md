---
sop_id: freezer_sample_storage
title: Freezer & Sample Storage Policy
applies_to: [storage, freezer, cold chain]
tags: [freezer, storage, cold chain, temperature, sample]
required_fields: [sample_id, storage_temperature]
---

# Freezer & Sample Storage Policy

## Storage temperatures
- Tissue samples are stored at **-60 °C** in the Freezer.
- Freezer alarm threshold: warmer than **-50 °C** triggers an escalation.

## Removing a sample
1. Record sample id, source freezer, and the time removed.
2. State the allowed room-temperature window before removal (default **20 minutes**).
3. The Guardian starts a warning reminder 2 minutes before the limit and an escalation at
   the limit.

## Returning a sample
1. Return to the original freezer at the original storage temperature.
2. Confirm the door is sealed and the temperature has recovered.

## Caution
Do not exceed the stated room-temperature window. If you cannot return the sample in time,
escalate to a postdoc before the limit.
