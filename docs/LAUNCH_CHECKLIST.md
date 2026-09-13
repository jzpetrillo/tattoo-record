# Launch checklist

## Seed the production admin

Production admin seeding runs when the API server starts. Before starting it against the
production database, configure `SEED_ADMIN_EMAIL`, `SEED_ADMIN_USERNAME`, and
`SEED_ADMIN_PASSWORD` as production secrets.

Run the production build and start it with the explicit production-seed safeguard:

```sh
pnpm --filter @workspace/api-server run build
PRODUCTION_SEED=1 pnpm --filter @workspace/api-server run start
```

`PRODUCTION_SEED=1` requires all three admin credentials even if `NODE_ENV` is missing or
incorrectly set. The API exits without changing the admin account when any credential is
missing or invalid. After the startup reports that the seed admin was created, reconciled,
or already exists, stop the one-off process and start the normal production deployment.