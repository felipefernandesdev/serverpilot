FROM php:8.3-fpm-alpine

RUN set -eux; \
    apk add --no-cache \
        freetype libpng libjpeg-turbo \
        freetype-dev libpng-dev libjpeg-turbo-dev \
        libxml2-dev \
        oniguruma-dev \
        libzip-dev \
        icu-dev \
        libwebp-dev \
        curl-dev \
        autoconf gcc g++ make pkgconf \
        imagemagick-dev imagemagick \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j$(nproc) \
        mysqli \
        pdo_mysql \
        gd \
        xml \
        mbstring \
        zip \
        curl \
        exif \
        intl \
        bcmath \
        opcache \
    && pecl install imagick \
    && docker-php-ext-enable imagick \
    && apk del --purge \
        freetype-dev libpng-dev libjpeg-turbo-dev libxml2-dev \
        oniguruma-dev libzip-dev icu-dev libwebp-dev curl-dev \
        autoconf gcc g++ make pkgconf imagemagick-dev

RUN apk add --no-cache \
        libwebp \
        icu-libs \
        libzip

RUN { \
        echo 'opcache.memory_consumption=128'; \
        echo 'opcache.interned_strings_buffer=8'; \
        echo 'opcache.max_accelerated_files=4000'; \
        echo 'opcache.revalidate_freq=2'; \
        echo 'opcache.fast_shutdown=1'; \
        echo 'opcache.enable_cli=1'; \
    } > /usr/local/etc/php/conf.d/opcache.ini
