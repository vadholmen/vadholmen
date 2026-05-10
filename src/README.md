# Script for connecting registration form to admin spreadsheet

Some scripting is written in Apps Script, URL [here](https://script.google.com/u/1/home/projects/1oQIRBurDnl-nc65v9547ZXjPIO5YiACxDrwYsX6G2oklMS0nLSlcS4XE/edit)

Synced manually with Apps Script site through clasp. To install:
```
$ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
$ source ~/.nvm/nvm.sh 
$ nvm install 20
$ npm install -g @google/clasp
```
Also make sure to enable [Google Apps Script API](https://script.google.com/u/1/home/usersettings).

To sync the script with this git repo:
```
$ cd <this-repo>/src
$ source ~/nvm/nvm.sh
$ clasp login 1oQIRBurDnl-nc65v9547ZXjPIO5YiACxDrwYsX6G2oklMS0nLSlcS4XE
```
Now, `$ clasp pull` to fetch/archive upstream changes, or `$clasp push` to push changes.

Expected maintenance: every new year, ensure the FORM_URL and formTabName in
the top of [Code.js](Code.js) is up-to-date
