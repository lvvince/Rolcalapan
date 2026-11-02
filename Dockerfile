# ---------- 1) Build React ----------
FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- 2) PHP + Apache ----------
FROM php:8.4-apache

RUN apt-get update \
 && apt-get install -y --no-install-recommends unzip git \
 && rm -rf /var/lib/apt/lists/* \
 && docker-php-ext-install pdo pdo_mysql mysqli \
 && a2enmod rewrite

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf

WORKDIR /var/www/html
COPY backend/ ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader

# React build -> public/
COPY --from=web /web/dist/ ./public/

RUN chown -R www-data:www-data /var/www/html \
 && chmod -R 755 /var/www/html \
 && chmod -R 775 /var/www/html/runtime

ENV PORT=80
EXPOSE 80