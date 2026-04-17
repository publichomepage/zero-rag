# Installation Guide

## System Requirements
NovaPlatform requires the following minimum system specifications:
- **CPU**: 2 cores or more
- **RAM**: 4GB minimum, 8GB recommended
- **Disk**: 10GB free space
- **OS**: macOS 13+, Ubuntu 22.04+, or Windows 11+

## Installing the CLI
The NovaPlatform CLI is the primary tool for managing your projects.

### Via npm (Recommended)
```bash
npm install -g @nova/cli
```

### Via Homebrew (macOS)
```bash
brew tap novaplatform/tools
brew install nova-cli
```

### Via curl (Linux)
```bash
curl -fsSL https://nova.dev/install.sh | bash
```

## Verifying Installation
After installation, verify the CLI is working:
```bash
nova --version
# Should output: nova-cli v3.2.1
```

## Docker Setup
NovaPlatform uses Docker for local development and testing. Ensure Docker Desktop is running:
```bash
docker info
```

If you encounter permission issues on Linux, add your user to the docker group:
```bash
sudo usermod -aG docker $USER
```

## IDE Extensions
We recommend installing the NovaPlatform extension for your IDE:
- **VS Code**: Search for "NovaPlatform" in the Extensions marketplace
- **JetBrains**: Install via Settings > Plugins > Marketplace
- **Neovim**: Use the `nova.nvim` plugin via your package manager

## Troubleshooting Installation
If you encounter issues:
1. Clear npm cache: `npm cache clean --force`
2. Check Node.js version: `node --version` (must be 20+)
3. Try installing with sudo: `sudo npm install -g @nova/cli`
4. See our [Troubleshooting Guide](troubleshooting.md) for more solutions
