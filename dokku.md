# Deploying to Dokku

## Create the app

```bash
# On your Dokku server
dokku apps:create versions
```

## Set the GitHub token

The token is needed both at build time (initial deploy) and at runtime (scheduled rebuilds via `app.json` cron).

```bash
dokku config:set versions GITHUB_TOKEN=ghp_your_token_here
dokku docker-options:add versions build "--build-arg GITHUB_TOKEN=ghp_your_token_here"
```

## Configure the domain (optional)

```bash
dokku domains:set versions versions.yourdomain.com
```

If you use the [letsencrypt plugin](https://github.com/dokku/dokku-letsencrypt):

```bash
dokku letsencrypt:enable versions
```

## Deploy

From your local machine, add the Dokku remote and push:

```bash
git remote add dokku dokku@your-server:versions
git push dokku main
```

Dokku detects the `Dockerfile`, builds the image (fetching version data during `npm run build`), and starts the container serving static files on port 3000.

## Scheduled rebuilds

Version data is frozen at build time. The `app.json` file defines a [scheduled cron task](https://dokku.com/docs/processes/scheduled-cron-tasks/) that runs `npm run build` inside the container every 6 hours to refresh the data.

This works automatically after deploy — no extra setup needed. You can manage it with:

```bash
dokku cron:list versions        # list scheduled tasks
dokku cron:report versions      # show cron configuration
```

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
