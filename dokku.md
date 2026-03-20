# Deploying to Dokku

## Create the app

```bash
# On your Dokku server
dokku apps:create versions
```

## Set the GitHub token

The token is passed as a Docker build arg so it's available when fetching version data during `npm run build`. It is not present in the final image.

```bash
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

Dokku detects the `Dockerfile`, runs the multi-stage build (Node.js fetches version data, then nginx serves the static output), and starts the container.

## Set up scheduled rebuilds

Version data is frozen at build time. A cron job on the server keeps it fresh.

```bash
# On your Dokku server, add to root's crontab:
sudo crontab -e
```

Add this line to rebuild every 6 hours:

```
0 */6 * * * dokku ps:rebuild versions > /dev/null 2>&1
```

Each rebuild fetches the latest version data from all APIs and produces a new static site.

## Useful commands

```bash
# Check app status
dokku ps:report versions

# View build/runtime logs
dokku logs versions

# Manual rebuild (e.g. after adding a package to packages.yml and pushing)
dokku ps:rebuild versions

# Update the GitHub token
dokku docker-options:remove versions build "--build-arg GITHUB_TOKEN=ghp_old_token"
dokku docker-options:add versions build "--build-arg GITHUB_TOKEN=ghp_new_token"
dokku ps:rebuild versions
```
