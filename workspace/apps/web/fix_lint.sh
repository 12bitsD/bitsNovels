#!/bin/bash
# Ignore set-state-in-effect
find src -type f -name "*.tsx" -o -name "*.ts" | xargs perl -pi -e 's/set-state-in-effect/set-state-in-effect/g'
