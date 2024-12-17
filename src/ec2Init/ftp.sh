#!/bin/bash

##############################################################################
# Example: https://medium.com/tensult/configure-ftp-on-aws-ec2-85b5b56b9c94
##############################################################################

dnf -y install vsftpd

##############################################################################################
# Configure FTP Server
# GET IP: https://stackoverflow.com/questions/40685191/using-the-public-ip-in-a-bash-script
##############################################################################################
adduser __FTP_USER__
usermod --password $(echo __FTP_PASSWORD__ | openssl passwd -1 -stdin) __FTP_USER__
usermod -d /etc/httpd/ __FTP_USER__
usermod -a -G root __FTP_USER__
chkconfig --level 345 vsftpd on

IP_ADDR=`curl -s http://whatismyip.akamai.com/`
echo -e "\n" >> /etc/vsftpd/vsftpd.conf
echo "pasv_enable=YES" >> /etc/vsftpd/vsftpd.conf
echo "pasv_min_port=__PASV_MIN_PORT__" >> /etc/vsftpd/vsftpd.conf
echo "pasv_max_port=__PASV_MAX_PORT__" >> /etc/vsftpd/vsftpd.conf
echo "pasv_address=${IP_ADDR}" >> /etc/vsftpd/vsftpd.conf

echo -e "\n" >> /etc/vsftpd/vsftpd.conf
echo "chroot_local_user=YES" >> /etc/vsftpd/vsftpd.conf
echo "allow_writeable_chroot=YES" >> /etc/vsftpd/vsftpd.conf

systemctl restart vsftpd
