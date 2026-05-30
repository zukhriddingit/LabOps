#!/usr/bin/env bash
# Smoke-test the LabOps Guardian API. Start the server first:
#   uvicorn labops_api.app:app --reload --port 8000
set -euo pipefail
BASE="${1:-http://localhost:8000}"

echo "== move C17 to Bench 2 =="
curl -s -X POST "$BASE/api/samples/C17/move" \
  -H 'Content-Type: application/json' \
  -d '{"from_location":"Freezer","to_location":"Bench 2","from_temperature":"-60C","allowed_room_temp_minutes":20}'
echo; echo

echo "== validate 0.02% v/v in 100 mL = 20 uL =="
curl -s -X POST "$BASE/api/tools/validate_calculation" \
  -H 'Content-Type: application/json' \
  -d '{"calculation_type":"percent_volume_volume","target_percent":0.02,"final_volume_ml":100,"user_answer_ul":20}'
echo; echo

echo "== find 15 mL tubes =="
curl -s -X POST "$BASE/api/tools/find_inventory" \
  -H 'Content-Type: application/json' -d '{"item_name":"15 mL tubes"}'
echo; echo

echo "== retrieve centrifuge SOP for C17 =="
curl -s -X POST "$BASE/api/tools/retrieve_sop" \
  -H 'Content-Type: application/json' \
  -d '{"query":"centrifuge setup for cardiovascular tissue sample","sample_id":"C17"}'
echo; echo

echo "== draft emergency message to postdoc =="
curl -s -X POST "$BASE/api/tools/send_emergency_message" \
  -H 'Content-Type: application/json' \
  -d '{"recipient_role":"postdoc","message":"C17 is at 18 minutes room temp on Bench 2.","confirmed":false}'
echo; echo

echo "== night-shift handoff =="
curl -s -X POST "$BASE/api/tools/generate_handoff" \
  -H 'Content-Type: application/json' -d '{"shift":"night"}'
echo
