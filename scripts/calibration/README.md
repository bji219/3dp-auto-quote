# Estimator calibration

Checks the quote engine's material and time estimates against PrusaSlicer.

```bash
cd scripts/calibration
mkdir -p stl && npx tsx gen.ts stl      # 13 watertight test solids
./truth.sh                              # slice each at 4 settings -> truth.tsv (needs prusa-slicer)
npx tsx compare.ts .                    # engine vs slicer, per part
```

`slice.sh` holds the slicer settings; they mirror `FAST_COREXY` in
`src/lib/quote-engine/config.ts`. If you change the printer profile, change both.

Last run (PrusaSlicer 2.7.2, 52 slices, bridge case excluded): material mean
error 4.0% (worst 15%), time mean error 8.2% (worst 28%), bias under 1%.

Known limit: a flat span between two supports (a bridge) is counted as an
overhang, so material is overestimated if such a part is printed bridge-down.
Auto-orientation usually avoids it.

To calibrate against your own machine instead, slice a few real parts, compare
with the Job estimator at `/internal`, and set `timeCalibration` in the config.
