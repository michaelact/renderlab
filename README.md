# RenderLab

A fully client-side, multi-file HTML/CSS/JS editor with live preview. No
backend — everything runs in the browser (localStorage + the File System
Access API for real local folders).

## Quick start (Docker)

**Prerequisites:** Docker and Docker Compose.

- Docker Desktop (Mac/Windows/Linux): https://docs.docker.com/get-docker/
- Or Docker Engine + the Compose plugin on Linux: https://docs.docker.com/engine/install/

Verify they're installed:

```bash
docker --version
docker compose version
```

Then, from the project root:

```bash
docker compose -f docker-compose.local.yaml up --build
```

Open http://localhost:8080.

To stop it: `docker compose -f docker-compose.local.yaml down`.

## Quick start (without Docker)

Requires Node.js 24+ (current LTS).

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Testing

```bash
npx playwright install   # first time only
npm test
```
