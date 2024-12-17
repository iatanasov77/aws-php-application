#!/bin/bash

cd __PHPMYADMIN_BASE_PATH__
wget https://www.phpmyadmin.net/downloads/phpMyAdmin-latest-all-languages.tar.gz

mkdir phpMyAdmin && tar -xvzf phpMyAdmin-latest-all-languages.tar.gz -C phpMyAdmin --strip-components 1
rm phpMyAdmin-latest-all-languages.tar.gz

cp phpMyAdmin/config.sample.inc.php phpMyAdmin/config.inc.php
