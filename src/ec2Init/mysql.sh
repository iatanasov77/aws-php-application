#!/bin/bash

#Change these values and keep in safe place
db_root_password=__DATABASE_ROOT_PASSWORD__
db_username=vankosoft_user
db_user_password=PassWord4-user
db_name=vankosoft_db

#and download mysql package to yum  and install mysql server from yum
yum install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm
yum localinstall -y https://dev.mysql.com/get/mysql80-community-release-el9-1.noarch.rpm
rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql-2023
yum install -y mysql-community-server

systemctl start mysqld

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

systemctl enable mysqld.service
