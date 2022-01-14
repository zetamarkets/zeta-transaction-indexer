# zeta-transaction-indexer

Indexes all tranasctions that interact with the Zeta program.

## Install dependencies

```sh
yarn install
```

## Testing locally

Build the docker image locally

```sh
docker build -t zeta-event-queue-indexer:latest .
```

Then run the image, grabbing environmental variables from a `.env` file (you can see an example in `.env.example`)

```sh
docker run --rm --env-file=.env zeta-event-queue-indexer
```
