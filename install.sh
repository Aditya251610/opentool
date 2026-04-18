#!/bin/bash
set -euo pipefail

# ─── OpenTool CLI Installer ─────────────────────────────────────────────────
# Usage: curl -fsSL https://raw.githubusercontent.com/Aditya251610/opentool/main/install.sh | bash
#
# Options (via environment variables):
#   OPENTOOL_VERSION=0.1.0    Install a specific version (default: latest)
#   NO_COLOR=1                Disable colored output
#   OPENTOOL_SKIP_VERIFY=1    Skip post-install verification

# ─── Colors ──────────────────────────────────────────────────────────────────

if [[ -t 1 ]] && [[ -z "${NO_COLOR:-}" ]] && command -v tput >/dev/null 2>&1 && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
    BOLD="$(tput bold)"
    DIM="$(tput dim)"
    RESET="$(tput sgr0)"
    RED="$(tput setaf 1)"
    GREEN="$(tput setaf 2)"
    YELLOW="$(tput setaf 3)"
    BLUE="$(tput setaf 4)"
    CYAN="$(tput setaf 6)"
else
    BOLD="" DIM="" RESET="" RED="" GREEN="" YELLOW="" BLUE="" CYAN=""
fi

STEP=0
TOTAL_STEPS=4

step()  { STEP=$((STEP + 1)); printf '\n%s[%d/%d]%s %s%s%s\n' "$BLUE" "$STEP" "$TOTAL_STEPS" "$RESET" "$BOLD" "$1" "$RESET"; }
info()  { printf '%s  →%s %s\n' "$CYAN" "$RESET" "$1"; }
ok()    { printf '%s  ✓%s %s\n' "$GREEN" "$RESET" "$1"; }
warn()  { printf '%s  !%s %s\n' "$YELLOW" "$RESET" "$1"; }
err()   { printf '%s  ✗%s %s\n' "$RED" "$RESET" "$1" >&2; }

# ─── Banner ──────────────────────────────────────────────────────────────────

print_banner() {
    printf '%s' "$BOLD$CYAN"
    cat <<'BANNER'

   ╔═══════════════════════════════════════╗
   ║                                       ║
   ║   ⚡  O P E N T O O L   C L I  ⚡    ║
   ║                                       ║
   ╚═══════════════════════════════════════╝

BANNER
    printf '%s' "$RESET"
    printf '%s  The open-source MCP tool server CLI%s\n' "$DIM" "$RESET"
    printf '%s  https://github.com/Aditya251610/opentool%s\n\n' "$DIM" "$RESET"
}

# ─── Error trap ──────────────────────────────────────────────────────────────

print_troubleshooting() {
    cat <<EOF

${BOLD}Troubleshooting${RESET}
${DIM}───────────────${RESET}

  ${BOLD}1. Node.js not found${RESET}
     Install Node.js 18+ via nvm:
       curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
       nvm install 20

  ${BOLD}2. Permission denied (EACCES)${RESET}
     Fix npm global permissions:
       mkdir -p ~/.npm-global
       npm config set prefix '~/.npm-global'
       echo 'export PATH=~/.npm-global/bin:\$PATH' >> ~/.bashrc
       source ~/.bashrc

  ${BOLD}3. 'opentool' not found after install${RESET}
     Ensure npm global bin is on your PATH:
       npm bin -g
     Add it to your shell profile if needed.

EOF
}

trap 'rc=$?; if [ "$rc" -ne 0 ]; then err "Installation failed (exit $rc)"; print_troubleshooting; fi' EXIT

# ─── Step 1: Detect OS ──────────────────────────────────────────────────────

print_banner
step "Detecting environment"

OS="unknown"
ARCH="$(uname -m 2>/dev/null || echo unknown)"
case "$(uname -s 2>/dev/null || echo unknown)" in
    Linux*)  OS="linux" ;;
    Darwin*) OS="macos" ;;
    MINGW*|MSYS*|CYGWIN*)
        err "Windows detected. Use PowerShell instead:"
        err "  npm install -g opentool-cli"
        exit 1
        ;;
esac

if [[ "$OS" == "unknown" ]]; then
    err "Unsupported OS. Install manually: npm i -g opentool-cli"
    exit 1
fi

info "os: $OS ($ARCH)"
ok "Supported platform"

# ─── Step 2: Check Node.js ──────────────────────────────────────────────────

step "Checking Node.js"

NODE_MIN_MAJOR=18

if ! command -v node >/dev/null 2>&1; then
    err "Node.js not found"
    info "Install Node.js 18+ from https://nodejs.org"
    info "  or via nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash"
    exit 1
fi

NODE_VERSION="$(node --version 2>/dev/null || echo v0.0.0)"
NODE_MAJOR="$(echo "$NODE_VERSION" | sed 's/^v//' | cut -d. -f1)"

if [[ "$NODE_MAJOR" -lt "$NODE_MIN_MAJOR" ]]; then
    err "Node.js $NODE_VERSION is too old (need ≥ 18)"
    info "Upgrade: nvm install 20"
    exit 1
fi

ok "Node.js $NODE_VERSION"

if ! command -v npm >/dev/null 2>&1; then
    err "npm not found (should come with Node.js)"
    exit 1
fi

NPM_VERSION="$(npm --version 2>/dev/null || echo unknown)"
ok "npm $NPM_VERSION"

# ─── Step 3: Install ────────────────────────────────────────────────────────

step "Installing opentool-cli"

INSTALL_VERSION="${OPENTOOL_VERSION:-latest}"

if [[ "$INSTALL_VERSION" == "latest" ]]; then
    info "Installing latest version from npm"
    npm install -g opentool-cli
else
    info "Installing version $INSTALL_VERSION"
    npm install -g "opentool-cli@$INSTALL_VERSION"
fi

# Verify install location
if ! command -v opentool >/dev/null 2>&1; then
    # Try to find it
    NPM_BIN="$(npm bin -g 2>/dev/null || true)"
    if [[ -n "$NPM_BIN" && -x "$NPM_BIN/opentool" ]]; then
        warn "'opentool' not on PATH. Add this to your shell profile:"
        warn "  export PATH=\"$NPM_BIN:\$PATH\""
    else
        err "'opentool' binary not found after install"
        exit 1
    fi
fi

INSTALLED_VERSION="$(opentool --version 2>/dev/null || echo unknown)"
ok "Installed opentool-cli $INSTALLED_VERSION"

# ─── Step 4: Verify ─────────────────────────────────────────────────────────

step "Verifying installation"

if [[ "${OPENTOOL_SKIP_VERIFY:-0}" == "1" ]]; then
    warn "Verification skipped (OPENTOOL_SKIP_VERIFY=1)"
else
    info "Running: opentool --version"
    if opentool --version >/dev/null 2>&1; then
        ok "opentool --version works"
    else
        err "opentool --version failed"
        exit 1
    fi

    info "Running: opentool --help"
    if opentool --help >/dev/null 2>&1; then
        ok "opentool --help works"
    else
        err "opentool --help failed"
        exit 1
    fi
fi

# ─── Done ────────────────────────────────────────────────────────────────────

cat <<EOF

${GREEN}${BOLD}✓ OpenTool CLI installed successfully!${RESET}

  ${DIM}Version:${RESET}  $INSTALLED_VERSION
  ${DIM}Binary:${RESET}   $(command -v opentool 2>/dev/null || echo 'opentool')

${BOLD}Get started:${RESET}

  ${CYAN}opentool init${RESET}              First-time setup
  ${CYAN}opentool login${RESET}             Log in to your server
  ${CYAN}opentool connect github${RESET}    Connect a provider
  ${CYAN}opentool tools${RESET}             List available tools
  ${CYAN}opentool${RESET}                   Launch interactive REPL
  ${CYAN}opentool doctor${RESET}            Run diagnostics

${DIM}Docs: https://github.com/Aditya251610/opentool${RESET}

EOF

# Clear failure trap
trap - EXIT
