/*
	node-chrome-pak
	Written by Hwang, C. W. ( hikipro95(at)gmail.com )

	This script released under MIT License.
*/

/*
	version number	 = 0x00 ~ 0x03
	resource count	 = 0x04 ~ 0x07
	encoding		   = 0x08
	
	resource info :
		resource id	       = 2 bytes
		offset of resource = 4 bytes
*/

var fs = require('fs');
var	path = require('path');

var helpMsg =
	"Usage: " + process.argv[0] + " " + path.basename(process.argv[1]) + " pack   [source directory] [.pak file path]\n" +
	"       " + process.argv[0] + " " + path.basename(process.argv[1]) + " unpack [.pak file path] [destination directory]\n" +
	"       " + process.argv[0] + " " + path.basename(process.argv[1]) + " replace [.pak file path] [res id] [new file path]";

console.log(
	"node-chrome-pak\n" +
	"Written by Hwang, C. W. (hikipro95@gmail.com)\n"
);

if (!process.argv[3]) {
	console.log(helpMsg);
	return;
}

if (process.argv[2] == "pack") {
	pack(process.argv[3], process.argv[4]);
} else if (process.argv[2] == "unpack") {
	unpack(process.argv[3], process.argv[4]);
} else if (process.argv[2] == "replace") {
	replace(process.argv[3], process.argv[4], process.argv[5]);
} else {
	console.log(helpMsg);
	return;
}

function replace(pakFilePath, srcResourceId, newFilePath) {
	var pakBuf = fs.readFileSync(pakFilePath);
	var pakFile = fs.openSync(pakFilePath, "r+");

	var resCount = pakBuf.readUInt32LE(0x04);

	var position = 9;

	var resInfo = [];
	var srcHeaderId = 0;

	for (var i = 0; i < resCount; i++) {
		resInfo.push({
			id: pakBuf.readUInt16LE(position),
			offset: pakBuf.readUInt32LE(position + 0x02)
		});

		if (resInfo[i].id === srcResourceId) {
			srcHeaderId = i;
		}

		position += 0x06;
	}

	var newFileBuf = fs.readFileSync(newFilePath);

	var srcResourceOffset = resInfo[srcHeaderId].offset;
	var srcNextResourceOffset = resInfo[srcHeaderId + 1].offset;

	position = 0x00;

	var originSize = resInfo[srcHeaderId + 1].offset - resInfo[srcHeaderId].offset;

	var headerBuf = new Buffer(resCount * 0x06);
	for (var i = 0; i < resCount; i++) {
		headerBuf.writeUInt16LE(resInfo[i].id, position);

		if (i > srcHeaderId) {
			headerBuf.writeUInt32LE(resInfo[i].offset + (newFileBuf.length - originSize), position + 0x02);
		} else {
			headerBuf.writeUInt32LE(resInfo[i].offset, position + 0x02);
		}

		position += 0x06;
	}

	var backupBuf = pakBuf.slice(srcNextResourceOffset, pakBuf.length);

	fs.writeSync(pakFile, headerBuf, 0, headerBuf.length, 0x09);
	fs.writeSync(pakFile, newFileBuf, 0, newFileBuf.length, srcResourceOffset);
	fs.writeSync(pakFile, backupBuf, 0, backupBuf.length, srcResourceOffset + newFileBuf.length);
}

function pack(srcDir, packDstPath) {
	var dst_path = (packDstPath ? packDstPath : __dirname + "/packed.pak");

	var pakFile = fs.openSync(dst_path, "w+");

	var items = fs.readdirSync(srcDir);

	var versionNumberBuf = new Buffer(0x04);
	versionNumberBuf.writeUInt32LE(0x04, 0);

	var resCountBuf = new Buffer(0x04);
	resCountBuf.writeUInt32LE(items.length, 0x00);

	var encodingBuf = new Buffer(0x01);
	encodingBuf[0] = 0x01;

	fs.writeSync(pakFile, versionNumberBuf, 0, 4, 0x00);
	fs.writeSync(pakFile, resCountBuf, 0, 4, 0x04);
	fs.writeSync(pakFile, encodingBuf, 0, 1, 0x08);

	var position = 0x09;
	var tmpOffset = 0x09 + (items.length * 0x06);

	for (var i = 0; i < items.length; i++) {
		var id = parseInt(items[i]);
		var idBuf = new Buffer(2);

		idBuf.writeUInt16LE(id, 0x00);

		var size = fs.statSync(srcDir + "/" + items[i]).size;
		var offsetBuf = new Buffer(4);

		offsetBuf.writeUInt32LE(tmpOffset, 0x00);
		tmpOffset += size;

		fs.writeSync(pakFile, idBuf, 0, 2, position);
		fs.writeSync(pakFile, offsetBuf, 0, 4, position + 0x02);

		position += 0x06;
	}

	for (var i = 0; i < items.length; i++) {
		var fileBuf = fs.readFileSync(srcDir + "/" + items[i]);

		fs.writeSync(pakFile, fileBuf, 0, fileBuf.length, position);
		position += fileBuf.length;
	}

	fs.closeSync(pakFile);
}

function unpack(pakFilePath, extractDstDir) {
	var pakBuf = fs.readFileSync(pakFilePath);

	var dstDir = (extractDstDir ? extractDstDir : __dirname + "/extracted/");

	var versionNumber = pakBuf.readUInt32LE(0x00);
	var resCount = pakBuf.readUInt32LE(0x04);
	var encoding = pakBuf.readUInt8(0x08);

	var position = 0x09;

	var resInfo = [];

	for (var i = 0; i < resCount; i++) {
		resInfo.push({
			id: pakBuf.readUInt16LE(position),
			offset: pakBuf.readUInt32LE(position + 0x02)
		});

		position += 0x06;
	}

	console.log("file count = " + resCount);
	console.log("unpacking at " + dstDir);

	for (var i = 0; i < resCount; i++) {
		var size = 0;

		if (i != resCount - 1) {
			size = resInfo[i + 1].offset - resInfo[i].offset;
		} else {
			size = pakBuf.length - resInfo[i].offset;
		}

		var resFileName = resInfo[i].id.toString();

		console.log("name: " + resFileName + ", offset: 0x" + resInfo[i].offset.toString(16) + ", size: 0x" + size.toString(16));

		var resBuf = pakBuf.slice(resInfo[i].offset, resInfo[i].offset + size);

		var encodingStr = getEncodingStr(encoding);

		if (size > 0x08) {
			if (resBuf.readUInt32BE(0x00) == 0x89504E47) { // ‰PNG
				resFileName += ".png";
			} else if (encodingStr && (resBuf.toString(encodingStr, 0, 1) === "<")) {
				resFileName += ".html";
			}
		}

		if (!fs.existsSync(dstDir)) {
			fs.mkdirSync(dstDir);
		}

		fs.writeFileSync(dstDir + resFileName, resBuf);
	}

	console.log("unpack process complete!");
}

function getEncodingStr(encoding) {
	return (encoding === 0x01) ? "utf-8" : null;
}