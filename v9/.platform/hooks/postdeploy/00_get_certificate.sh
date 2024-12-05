#!/usr/bin/env bash
# Place in .platform/hooks/postdeploy directory
# not finished, make sure you replace the the actual domain
sudo certbot -n -d intextwebsitev2.us-east-1.elasticbeanstalk.com --nginx --agree-tos --email jduan0@byu.edu
sudo certbot -n -d  intextgroup13.is404.net --nginx --agree-tos --email jduan0@byu.edu