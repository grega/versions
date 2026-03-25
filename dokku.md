# Deploying to Dokku

## Create the app

```bash
# On your Dokku server
dokku apps:create versions
```

## Set the GitHub token

The token is needed both at build time (initial deploy) and at runtime (scheduled rebuilds).

```bash
dokku config:set versions GITHUB_TOKEN=ghp_your_token_here
dokku docker-options:add versions build "--build-arg GITHUB_TOKEN=ghp_your_token_here"
```

## Set up Plausible analytics (optional)

If you use [Plausible](https://plausible.io/) for analytics, set the domain to enable the tracking script:

```bash
dokku config:set versions PLAUSIBLE_DOMAIN=versions.yourdomain.com PLAUSIBLE_ENDPOINT=https://analytics.yourdomain.com
dokku docker-options:add versions build "--build-arg PLAUSIBLE_DOMAIN=versions.yourdomain.com"
dokku docker-options:add versions build "--build-arg PLAUSIBLE_ENDPOINT=https://analytics.yourdomain.com"
dokku ps:rebuild versions
```

If omitted, no analytics script is loaded.

## Configure the domain (optional)

```bash
dokku domains:set versions versions.yourdomain.com
```

## Deploy

From your local machine, add the Dokku remote and push:

```bash
git remote add dokku dokku@your-server:versions
git push dokku main
```

Dokku detects the `Dockerfile`, builds the image (fetching version data during `npm run build`), and starts the container serving static files on port 5000. The container automatically rebuilds the site every 6 hours to refresh version data.

## Set up port mapping

Dokku needs to know which port the container listens on so nginx can proxy to it:

```bash
dokku ports:add versions http:80:5000
```

## Enable HTTPS (optional)

The app must be deployed and running before enabling Let's Encrypt - the ACME challenge needs to reach your app via HTTP to verify domain ownership.

If you use the [letsencrypt plugin](https://github.com/dokku/dokku-letsencrypt):

```bash
dokku letsencrypt:enable versions
```

## Scheduled rebuilds

Version data is frozen at build time. The web container runs a background loop (`start.sh`) that rebuilds the site every 6 hours to refresh version data. This works automatically after deploy - no extra setup needed.

## Useful commands

```bash
# Check app status
dokku ps:report versions

# View build/runtime logs
dokku logs versions

# Manual rebuild (e.g. after adding a package to packages.yml and pushing)
dokku ps:rebuild versions

# Update the GitHub token
dokku config:set versions GITHUB_TOKEN=ghp_new_token
dokku docker-options:remove versions build "--build-arg GITHUB_TOKEN=ghp_old_token"
dokku docker-options:add versions build "--build-arg GITHUB_TOKEN=ghp_new_token"
dokku ps:rebuild versions
```
