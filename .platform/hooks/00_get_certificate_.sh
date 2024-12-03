#!/usr/bin/env bash
# Place in .platform/hooks/postdeploy directory
# not finished, make sure you replace the the actual domain
sudo certbot -n -d INTEXTwebsitev2.us-east-1.elasticbeanstalk.com --nginx --agree-tos --email jduan0@byu.edu
sudo certbot -n -d jduan0skillcheck4.is404.net --nginx --agree-tos --email jduan0@byu.edu
