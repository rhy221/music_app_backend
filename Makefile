# ==========================================
# POLYGLOT MUSIC STREAMING - SETUP WORKSPACE
# ==========================================

NX_PLUGINS = @nx/next @nx/node @nx/js @nx/eslint @nx/jest @nxrocks/nx-spring-boot @nx-go/nx-go @nxlv/python

.PHONY: help install-plugins init-dirs init-infra init-ci setup-all

help:
	@echo "Cac lenh co san:"
	@echo "  make install-plugins : Cai dat Nx plugins (TS, Go, Java, Python)"
	@echo "  make init-dirs       : Tao cau truc thu muc cho 9 services"
	@echo "  make init-infra      : Tao docker-compose.yml"
	@echo "  make init-ci         : Tao GitHub Actions"
	@echo "  make setup-all       : Chay tat ca cac buoc tren"

install-plugins:
	@echo "Installing Nx plugins..."
	npm install -D $(NX_PLUGINS)

init-dirs:
	@echo "Creating directory structure..."
	@powershell -Command "mkdir -Force services/gateway, services/streaming-service, services/upload-service, \
		services/user-service, services/catalog-service, services/playlist-service, \
		services/notification-service, services/search-service, services/recommend-service, \
		libs/shared-types, frontend, infra, helm-chart, contracts, docs, .github/workflows"

init-infra:
	@echo "Creating infra/docker-compose.yml..."
	@echo version: '3.8' > infra/docker-compose.yml
	@echo services: >> infra/docker-compose.yml
	@echo   postgres: >> infra/docker-compose.yml
	@echo     image: postgres:16 >> infra/docker-compose.yml
	@echo     environment: >> infra/docker-compose.yml
	@echo       POSTGRES_USER: admin >> infra/docker-compose.yml
	@echo       POSTGRES_PASSWORD: password >> infra/docker-compose.yml
	@echo       POSTGRES_DB: music_db >> infra/docker-compose.yml
	@echo     ports: >> infra/docker-compose.yml
	@echo       - "5432:5432" >> infra/docker-compose.yml
	@echo   redis: >> infra/docker-compose.yml
	@echo     image: redis:7 >> infra/docker-compose.yml
	@echo     ports: >> infra/docker-compose.yml
	@echo       - "6379:6379" >> infra/docker-compose.yml
	@echo   rabbitmq: >> infra/docker-compose.yml
	@echo     image: rabbitmq:3.13-management >> infra/docker-compose.yml
	@echo     ports: >> infra/docker-compose.yml
	@echo       - "5672:5672" >> infra/docker-compose.yml
	@echo       - "15672:15672" >> infra/docker-compose.yml
	@echo   minio: >> infra/docker-compose.yml
	@echo     image: minio/minio >> infra/docker-compose.yml
	@echo     command: server /data --console-address ":9001" >> infra/docker-compose.yml
	@echo     environment: >> infra/docker-compose.yml
	@echo       MINIO_ROOT_USER: admin >> infra/docker-compose.yml
	@echo       MINIO_ROOT_PASSWORD: password123 >> infra/docker-compose.yml
	@echo     ports: >> infra/docker-compose.yml
	@echo       - "9000:9000" >> infra/docker-compose.yml
	@echo       - "9001:9001" >> infra/docker-compose.yml

init-ci:
	@echo "Creating .github/workflows/ci.yml..."
	@echo name: CI > .github/workflows/ci.yml
	@echo on: >> .github/workflows/ci.yml
	@echo "  push:" >> .github/workflows/ci.yml
	@echo "    branches: [ main ]" >> .github/workflows/ci.yml
	@echo jobs: >> .github/workflows/ci.yml
	@echo "  main:" >> .github/workflows/ci.yml
	@echo "    runs-on: ubuntu-latest" >> .github/workflows/ci.yml
	@echo "    steps:" >> .github/workflows/ci.yml
	@echo "      - uses: actions/checkout@v4" >> .github/workflows/ci.yml
	@echo "      - run: npm ci" >> .github/workflows/ci.yml
	@echo "      - run: npx nx affected --target=build" >> .github/workflows/ci.yml

setup-all: install-plugins init-dirs init-infra init-ci