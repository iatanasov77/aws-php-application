#!/bin/bash

#install apache server
dnf install -y httpd
 
#since amazon ami 2018 is no longer supported ,to install latest php and mysql we have to do some tricks.
dnf install -y php__PHP_VERSION__ php__PHP_VERSION__-{common,mbstring,gd,mysqlnd,bcmath,xml,fpm,intl,zip,devel}

#install imagick extension
dnf -y install gcc ImageMagick ImageMagick-devel ImageMagick-perl php-pear
pecl install imagick
chmod 755 /usr/lib64/php/modules/imagick.so
cat <<EOF >>/etc/php.d/20-imagick.ini
extension=imagick
EOF

systemctl restart php-fpm.service
dnf -y install composer

systemctl start  httpd.service
systemctl enable  httpd.service

