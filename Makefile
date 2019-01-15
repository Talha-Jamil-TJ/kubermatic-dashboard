SHELL=/bin/bash
REPO=quay.io/kubermatic/ui-v2
IMAGE_TAG = $(shell echo $$(git rev-parse HEAD && if [[ -n $$(git status --porcelain) ]]; then echo '-dirty'; fi)|tr -d ' ')
CC=npm

all: install run

install:
	@$(CC) ci

check: install
	@$(CC) run check

run:
	@$(CC) start

test-full: test e2e

test:
	@$(CC) run test

test-headless: install
	@$(CC) run test:headless

run-e2e: install
	@$(CC) run e2e

dist: install
	@$(CC) run build -prod

build:
	CGO_ENABLED=0 go build -ldflags '-w -extldflags '-static'' -o dashboard-v2 .

docker-build: build dist
	docker build -t $(REPO):$(IMAGE_TAG) .

docker-push:
	docker push $(REPO):$(IMAGE_TAG)
