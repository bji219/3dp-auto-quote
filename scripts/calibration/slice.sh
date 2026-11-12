#!/bin/bash
# usage: slice.sh file.stl layer infill% -> "grams seconds"
f=$1; lh=$2; inf=$3; out=$(mktemp --suffix=.gcode)
prusa-slicer --export-gcode "$f" -o "$out" --dont-arrange --center 125,125 \
 --nozzle-diameter 0.4 --filament-diameter 1.75 --filament-density 1.24 --layer-height $lh --first-layer-height 0.2 \
 --extrusion-width 0.45 --perimeters 2 --top-solid-layers 5 --bottom-solid-layers 3 --top-solid-min-thickness 1.0 --bottom-solid-min-thickness 0.6 \
 --fill-density ${inf}% --fill-pattern grid --skirts 0 --brim-width 0 \
 --support-material --support-material-threshold 45 --support-material-spacing 2 \
 --perimeter-speed 160 --external-perimeter-speed 160 --small-perimeter-speed 160 --infill-speed 200 --solid-infill-speed 150 --top-solid-infill-speed 150 \
 --support-material-speed 120 --support-material-interface-speed 120 --bridge-speed 60 --gap-fill-speed 100 --travel-speed 400 --first-layer-speed 60 \
 --max-volumetric-speed 18 --gcode-flavor marlin2 --bed-shape 0x0,256x0,256x256,0x256 --max-print-height 256 \
 --machine-max-acceleration-x 6000 --machine-max-acceleration-y 6000 --machine-max-acceleration-extruding 6000 --machine-max-acceleration-travel 6000 --machine-max-acceleration-e 10000 \
 --machine-max-feedrate-x 500 --machine-max-feedrate-y 500 --machine-max-feedrate-e 120 --machine-max-jerk-x 9 --machine-max-jerk-y 9 \
 --default-acceleration 6000 --cooling=0 --slowdown-below-layer-time 0 --min-print-speed 100 --fan-below-layer-time 0 >$out.err 2>&1 || { echo "ERR $(grep -iv "^[0-9]* =>" $out.err | tail -2)"; exit; }
g=$(grep -m1 "filament used \[cm3\]" "$out" | sed "s/.*= //")
t=$(grep -m1 "estimated printing time (normal mode)" "$out" | sed 's/.*= //')
sup=$(grep -c "^;TYPE:Support" "$out")
echo "$g|$t|$sup"; rm -f "$out" "$out.err"
