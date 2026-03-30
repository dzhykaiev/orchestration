#!/usr/bin/env bash
set -e

LOGS_DIR="$(dirname "$0")/../logs"
mkdir -p "$LOGS_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Kill any previous instances on our ports
lsof -ti:3000,3001 | xargs kill -9 2>/dev/null || true

echo "Starting infrastructure..."
docker compose up -d 2>&1

echo "Waiting for Postgres..."
until docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
  sleep 0.5
done
echo "Postgres ready."

echo "Waiting for Redis..."
until docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; do
  sleep 0.5
done
echo "Redis ready."

echo ""
echo "Starting services (logs in $LOGS_DIR/)..."
echo ""

# Start API
pnpm --filter @orchestration/api run dev > "$LOGS_DIR/api_${TIMESTAMP}.log" 2>&1 &
API_PID=$!
echo "  API started (PID $API_PID) → logs/api_${TIMESTAMP}.log"

# Start Orchestrator
pnpm --filter @orchestration/orchestrator run dev > "$LOGS_DIR/orchestrator_${TIMESTAMP}.log" 2>&1 &
ORCH_PID=$!
echo "  Orchestrator started (PID $ORCH_PID) → logs/orchestrator_${TIMESTAMP}.log"

# Start Web
pnpm --filter @orchestration/web run dev > "$LOGS_DIR/web_${TIMESTAMP}.log" 2>&1 &
WEB_PID=$!
echo "  Web started (PID $WEB_PID) → logs/web_${TIMESTAMP}.log"

# Wait for API to be ready
echo ""
echo "Waiting for API..."
for i in $(seq 1 30); do
  if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "API ready at http://localhost:3001"
    break
  fi
  sleep 1
done

echo "Web dashboard at http://localhost:3000"
echo ""
echo "Tailing all logs (Ctrl+C to stop all services)..."
echo "=================================================="
echo ""

# Save PIDs for cleanup
echo "$API_PID $ORCH_PID $WEB_PID" > "$LOGS_DIR/.pids"

cleanup() {
  echo ""
  echo "Stopping services..."
  kill $API_PID $ORCH_PID $WEB_PID 2>/dev/null
  wait $API_PID $ORCH_PID $WEB_PID 2>/dev/null
  echo "All services stopped. Logs saved in $LOGS_DIR/"
}
trap cleanup EXIT INT TERM

# Tail all logs with prefixes
tail -f "$LOGS_DIR/api_${TIMESTAMP}.log" "$LOGS_DIR/orchestrator_${TIMESTAMP}.log" "$LOGS_DIR/web_${TIMESTAMP}.log" 2>/dev/null
