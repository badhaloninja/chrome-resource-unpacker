chrome-resource-unpacker 
With android chrome v69 files
=============
node script for pack/unpack .pak file of chrome

Forked from https://bitbucket.org/hikipro/node-chrome-pak

Then from https://github.com/DiscoElevator/chrome-resource-unpacker

### Usage ###
-------------
    node main.js pack [source directory] [.pak file path]
    node main.js unpack [.pak file path] [destination directory]
    node main.js replace [.pak file path] [res id] [new file path]
    node main.js unpack resources.pak resources_unpacked
    node main.js unpack chrome_100_percent.pak chrome_100_percent_unpacked

### Tested Version ###
-------------
* Chrome 34.0.1847.131 m
* node.js v0.10.28


### License ###
-------------
MIT License

