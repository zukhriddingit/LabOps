---
sop_id: reagent_calculation_policy
title: Reagent Calculation Policy
applies_to: [reagent, dilution, percent, concentration, calculation]
tags: [reagent, calculation, percent, dilution, vv, wv, stock]
required_fields: [calculation_type, target_percent, final_volume_ml]
---

# Reagent Calculation Policy

## Percent solutions
- **% v/v** (volume/volume): volume of solute = (percent / 100) × final volume.
  - Example: 0.02% v/v in 100 mL → 0.0002 × 100 mL = 0.02 mL = **20 µL**.
- **% w/v** (weight/volume): mass of solute (g) = (percent / 100) × final volume (mL).
  This needs a mass, not a volume — ask for the compound.
- **Stock dilution**: C1·V1 = C2·V2. This needs the **stock concentration** before validating.

## Policy
1. Always state the assumption (v/v, w/v, or stock-based) before confirming a number.
2. If the basis is ambiguous, ask which one applies — do not guess.
3. Report the formula used so the human can check it.

## Caution
Never confirm a reagent calculation as "correct" without stating the assumption it relies on.
