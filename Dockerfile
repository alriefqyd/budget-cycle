FROM php:8.2-fpm

# Install required packages and extensions
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libzip-dev \
    zip \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev && \
    update-ca-certificates && \
    docker-php-ext-configure gd --with-freetype --with-jpeg && \
    docker-php-ext-install pdo_mysql zip gd

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Set working directory
WORKDIR /var/www

# Raise memory_limit above the 128M default — bulk Excel imports exhaust it
# once Debugbar's query collector accumulates enough data (see the .ini for why).
COPY docker/php/zz-memory-limit.ini /usr/local/etc/php/conf.d/zz-memory-limit.ini

# Copy application code
COPY . /var/www

# Set permissions
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache
