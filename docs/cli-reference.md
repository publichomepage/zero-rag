# CLI Reference

## Global Commands

### `nova init [name]`
Create a new NovaPlatform project.

**Options:**
- `--template <template>` - Use a project template (api, fullstack, worker)
- `--database <type>` - Pre-configure database (postgres, mysql, sqlite, mongodb)
- `--auth <provider>` - Include authentication (jwt, oauth, session)
- `--no-git` - Skip git initialization

**Example:**
```bash
nova init my-api --template api --database postgres --auth jwt
```

### `nova dev`
Start the development server with hot reload.

**Options:**
- `--port <port>` - Specify port (default: 3000)
- `--host <host>` - Specify host (default: localhost)
- `--profile <profile>` - Use configuration profile
- `--debug` - Enable debug mode with detailed logging
- `--inspect` - Enable Node.js inspector on port 9229

### `nova build`
Build the project for production.

**Options:**
- `--docker` - Generate Dockerfile and build Docker image
- `--minify` - Minify the output (default: true)
- `--sourcemaps` - Generate source maps
- `--analyze` - Show bundle analysis

### `nova deploy`
Deploy to a target environment.

**Options:**
- `--target <target>` - Deployment target (docker, k8s, lambda, cloudflare)
- `--env <environment>` - Environment (staging, production)
- `--dry-run` - Show what would be deployed without deploying

## Database Commands

### `nova db migrate`
Run pending database migrations.

### `nova db migrate:create <name>`
Create a new migration file.

### `nova db migrate:rollback`
Rollback the last migration batch.

### `nova db migrate:status`
Show the status of all migrations.

### `nova db seed`
Run database seed files.

### `nova db seed:create <name>`
Create a new seed file.

### `nova db reset`
⚠️ Drop all tables and re-run all migrations and seeds.

## Auth Commands

### `nova auth create-key`
Generate a new API key.

**Options:**
- `--name <name>` - Name for the API key
- `--expires <duration>` - Expiration time (e.g., "30d", "1y")
- `--scopes <scopes>` - Comma-separated list of scopes

### `nova auth revoke-key <key-id>`
Revoke an existing API key.

## Utility Commands

### `nova analyze`
Analyze the project for issues.

**Options:**
- `--circular` - Check for circular dependencies
- `--unused` - Find unused exports
- `--performance` - Performance analysis

### `nova test`
Run the test suite (see Testing Guide for details).

### `nova lint`
Run the linter with auto-fix.

### `nova format`
Format all source files using Prettier.

### `nova docs`
Generate API documentation from your route definitions.

**Options:**
- `--format <format>` - Output format (openapi, markdown)
- `--output <path>` - Output file path
