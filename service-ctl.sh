#!/bin/bash
# WaveCap Service Control Script
# Manages the WaveCap launchd service on macOS

set -e

SERVICE_LABEL="com.wavecap.server"
PLIST_PATH="$HOME/Library/LaunchAgents/com.wavecap.server.plist"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$HOME/Library/Logs/wavecap-server.log"
ERROR_LOG="$HOME/Library/Logs/wavecap-server-error.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_status() {
    # Check if service is loaded and get its status
    local result
    if result=$(launchctl list "$SERVICE_LABEL" 2>/dev/null); then
        local pid=$(echo "$result" | awk '{print $1}')
        local exit_code=$(echo "$result" | awk '{print $2}')

        if [[ "$pid" != "-" && "$pid" =~ ^[0-9]+$ ]]; then
            echo -e "${GREEN}Running${NC} (PID: $pid)"
            return 0
        elif [[ "$exit_code" != "0" && "$exit_code" != "-" ]]; then
            echo -e "${RED}Stopped${NC} (exit code: $exit_code)"
            return 1
        else
            echo -e "${YELLOW}Loaded but not running${NC}"
            return 1
        fi
    else
        echo -e "${RED}Not loaded${NC}"
        return 2
    fi
}

install_service() {
    print_status "Installing WaveCap service..."

    # Create plist if it doesn't exist
    if [[ ! -f "$PLIST_PATH" ]]; then
        print_status "Creating plist at $PLIST_PATH"
        cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$SERVICE_LABEL</string>

    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/caffeinate</string>
        <string>-s</string>
        <string>$PROJECT_DIR/backend/.venv/bin/python</string>
        <string>-m</string>
        <string>wavecap_backend</string>
    </array>

    <key>WorkingDirectory</key>
    <string>$PROJECT_DIR/backend</string>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
        <key>Crashed</key>
        <true/>
    </dict>

    <key>ThrottleInterval</key>
    <integer>30</integer>

    <key>ExitTimeOut</key>
    <integer>15</integer>

    <key>StandardOutPath</key>
    <string>$LOG_FILE</string>

    <key>StandardErrorPath</key>
    <string>$ERROR_LOG</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>$PROJECT_DIR/backend/.venv/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    </dict>

    <key>ProcessType</key>
    <string>Interactive</string>
</dict>
</plist>
EOF
    fi

    # Validate plist
    if ! plutil -lint "$PLIST_PATH" > /dev/null 2>&1; then
        print_error "Invalid plist syntax"
        return 1
    fi

    # Enable the service (this is the key for macOS Sequoia)
    print_status "Enabling service..."
    launchctl enable "gui/$(id -u)/$SERVICE_LABEL" 2>/dev/null || true

    print_status "Service installed successfully"
}

start_service() {
    print_status "Starting WaveCap service..."

    # First, ensure it's installed and enabled
    install_service

    # Try to bootout first if already loaded (ignore errors)
    launchctl bootout "gui/$(id -u)/$SERVICE_LABEL" 2>/dev/null || true

    # Small delay to let things settle
    sleep 1

    # Bootstrap the service (modern launchctl approach)
    if launchctl bootstrap "gui/$(id -u)" "$PLIST_PATH" 2>/dev/null; then
        print_status "Service started via bootstrap"
    else
        # Try legacy load
        if launchctl load "$PLIST_PATH" 2>/dev/null; then
            print_status "Service started via legacy load"
        else
            print_warning "launchctl failed (common when not in GUI terminal)"
            print_warning "The service is enabled and will start on next login."
            print_status "Starting server directly in background..."
            start_direct
            return
        fi
    fi

    # Wait for service to start
    sleep 2

    # Check status
    echo -n "Status: "
    check_status
}

start_direct() {
    # Start the server directly (not as a launchd service)
    # This is useful when launchctl doesn't work from the current terminal

    # Check if already running
    if pgrep -f "wavecap_backend" > /dev/null 2>&1; then
        print_status "WaveCap is already running"
        return 0
    fi

    # Start in background with caffeinate
    cd "$PROJECT_DIR/backend"
    nohup /usr/bin/caffeinate -s "$PROJECT_DIR/backend/.venv/bin/python" -m wavecap_backend \
        >> "$LOG_FILE" 2>> "$ERROR_LOG" &

    local pid=$!
    sleep 3

    if kill -0 $pid 2>/dev/null; then
        print_status "Server started directly (PID: $pid)"
        print_warning "Note: This is not running as a launchd service"
        print_warning "The launchd service will take over on next login/reboot"
    else
        print_error "Failed to start server"
        return 1
    fi
}

stop_service() {
    print_status "Stopping WaveCap service..."

    # Try modern bootout first
    if launchctl bootout "gui/$(id -u)/$SERVICE_LABEL" 2>/dev/null; then
        print_status "Service stopped via bootout"
    else
        # Fall back to legacy unload
        launchctl unload "$PLIST_PATH" 2>/dev/null || true
    fi

    # Also kill any directly-started processes
    if pgrep -f "wavecap_backend" > /dev/null 2>&1; then
        print_status "Stopping direct process..."
        pkill -f "wavecap_backend" 2>/dev/null || true
        sleep 2
    fi

    echo -n "Status: "
    check_status || true
}

restart_service() {
    print_status "Restarting WaveCap service..."
    stop_service
    sleep 2
    start_service
}

show_status() {
    echo "WaveCap Service Status"
    echo "======================"
    echo -n "Service: "
    check_status
    echo ""

    # Check if server is responding
    echo -n "Health: "
    if curl -s --connect-timeout 2 http://localhost:8000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC} (server responding)"
    else
        echo -e "${RED}Not responding${NC}"
    fi
    echo ""

    # Show recent log entries
    echo "Recent logs (last 5 lines):"
    echo "----------------------------"
    tail -5 "$LOG_FILE" 2>/dev/null || echo "(no logs)"
}

show_logs() {
    local lines=${1:-50}
    echo "=== Standard Output (last $lines lines) ==="
    tail -n "$lines" "$LOG_FILE" 2>/dev/null || echo "(no logs)"
    echo ""
    echo "=== Standard Error (last $lines lines) ==="
    tail -n "$lines" "$ERROR_LOG" 2>/dev/null || echo "(no error logs)"
}

follow_logs() {
    print_status "Following logs (Ctrl+C to stop)..."
    tail -f "$LOG_FILE" "$ERROR_LOG" 2>/dev/null
}

uninstall_service() {
    print_status "Uninstalling WaveCap service..."
    stop_service

    # Disable the service
    launchctl disable "gui/$(id -u)/$SERVICE_LABEL" 2>/dev/null || true

    # Remove plist (optional, ask first)
    if [[ -f "$PLIST_PATH" ]]; then
        read -p "Remove plist file? [y/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm "$PLIST_PATH"
            print_status "Plist removed"
        fi
    fi

    print_status "Service uninstalled"
}

show_help() {
    echo "WaveCap Service Control"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  start      Start the service"
    echo "  stop       Stop the service"
    echo "  restart    Restart the service"
    echo "  status     Show service status"
    echo "  logs [n]   Show last n log lines (default: 50)"
    echo "  follow     Follow logs in real-time"
    echo "  install    Install/reinstall the service"
    echo "  uninstall  Uninstall the service"
    echo "  help       Show this help"
}

# Main
case "${1:-}" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "${2:-50}"
        ;;
    follow)
        follow_logs
        ;;
    install)
        install_service
        ;;
    uninstall)
        uninstall_service
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac
