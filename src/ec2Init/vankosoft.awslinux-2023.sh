#!/bin/bash
# AUTOMATIC VANKOSOFT INSTALLER IN  AWS LINUX 2 AMI

#Change these values and keep in safe place
db_root_password=__DATABASE_ROOT_PASSWORD__
db_username=vankosoft_user
db_user_password=PassWord4-user
db_name=vankosoft_db

#########################
# install LAMP Server
#########################

yum update -y
#install apache server
yum install -y httpd
 
#since amazon ami 2018 is no longer supported ,to install latest php and mysql we have to do some tricks.
yum clean metadata
yum install -y php__PHP_VERSION__ php__PHP_VERSION__-{common,mbstring,gd,mysqlnd,bcmath,xml,fpm,intl,zip,devel}

#install imagick extension
yum -y install gcc ImageMagick ImageMagick-devel ImageMagick-perl php-pear
pecl install imagick
chmod 755 /usr/lib64/php/modules/imagick.so
cat <<EOF >>/etc/php.d/20-imagick.ini
extension=imagick
EOF

systemctl restart php-fpm.service

#and download mysql package to yum  and install mysql server from yum
yum install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm
yum localinstall -y https://dev.mysql.com/get/mysql80-community-release-el9-1.noarch.rpm
rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql-2023
yum install -y mysql-community-server

systemctl start  httpd
systemctl start mysqld

# Change OWNER and permission of directory /var/www
usermod -a -G apache ec2-user
chown -R ec2-user:apache /var/www
find /var/www -type d -exec chmod 2775 {} \;
find /var/www -type f -exec chmod 0664 {} \;

# AUTOMATIC mysql_secure_installation
# change permission of error log file to extract initial root password 
chown  ec2-user:apache /var/log/mysqld.log
temppassword=$(grep 'temporary password' /var/log/mysqld.log | grep -o ".\{12\}$")
echo MySql Temp Password: ${temppassword} ;
chown  mysql:mysql /var/log/mysqld.log

#change root password to db_root_password
mysql -p"$temppassword" --connect-expired-password  -e "SET password FOR 'root'@'localhost' = \"$db_root_password\";FLUSH PRIVILEGES;" 
mysql -p"$db_root_password"  -e "DELETE FROM mysql.user WHERE User='';"
mysql -p"$db_root_password" -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');"


# Create database user and grant privileges
mysql -u root -p"$db_root_password" -e "CREATE USER \"$db_username\"@\"localhost\" IDENTIFIED BY \"$db_user_password\";GRANT ALL ON *.* TO \"$db_username\"@\"localhost\";FLUSH PRIVILEGES;"

# Create database
mysql -u $db_username -p"$db_user_password" -e "CREATE DATABASE $db_name;"

# Change permission of /var/www/html/
chown -R ec2-user:apache /var/www/html
chmod -R 774 /var/www/html

#  enable .htaccess files in Apache config using sed command
sed -i '/<Directory "\/var\/www\/html">/,/<\/Directory>/ s/AllowOverride None/AllowOverride all/' /etc/httpd/conf/httpd.conf

#Make apache and mysql to autostart and restart apache
systemctl enable  httpd.service
systemctl enable mysqld.service
systemctl restart httpd.service

#install phpMyAdmin
cd /var/www/html
wget https://www.phpmyadmin.net/downloads/phpMyAdmin-latest-all-languages.tar.gz

mkdir phpMyAdmin && tar -xvzf phpMyAdmin-latest-all-languages.tar.gz -C phpMyAdmin --strip-components 1
rm phpMyAdmin-latest-all-languages.tar.gz

cp phpMyAdmin/config.sample.inc.php phpMyAdmin/config.inc.php
