#!/bin/bash
# builds truth.tsv: name layer infill cm3 seconds supportFlag
cd "$(dirname "$0")"; : > truth.tsv
for f in stl/*.stl; do for cfg in "0.2 15" "0.2 40" "0.12 15" "0.28 15"; do set -- $cfg
  r=$(./slice.sh $f $1 $2); IFS='|' read g t sup <<< "$r"
  sec=$(echo "$t" | awk '{s=0; for(i=1;i<=NF;i++){v=$i; if(v~/d$/)s+=v*86400; else if(v~/h$/)s+=v*3600; else if(v~/m$/)s+=v*60; else if(v~/s$/)s+=v+0}; print s}')
  echo -e "$(basename $f .stl)\t$1\t$2\t$g\t$sec\t$sup" >> truth.tsv
done; done; cat truth.tsv
