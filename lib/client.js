/*! ander <anderpang@qq.com> 2016/3/17 */
"use strict";var fs=require("fs"),path=require("path"),compress=require("./compressor"),config=require("../config");function watch(a,b){var e=fs.readdirSync(a),c={},f=0;if(!b){b=path.dirname(a)}var d=fs.watch(a,function(j,h){if(!h){return}h=new Buffer(h,"binary").toString("utf8");if(h.indexOf(" - 副本.")!==-1||h.indexOf("新建")!==-1){return}if(j==="rename"){var k=path.join(a,h);console.log(k);if(fs.existsSync(k)&&fs.lstatSync(k).isDirectory()){process.exit(99);return}}if(j==="change"){var m=path.join(a,h);if(fs.lstatSync(m).isDirectory()){return}if(h==="merge.json"){delete require.cache[path.join(a,h)];return}var i=path.extname(h),l,g;clearTimeout(f);if(i===".js"){if(!c.hasOwnProperty(h)){if(checkOutPath(b)){c[h]=[a,b,h,"js"]}else{console.log("Not found the path:\x1b[41m",b,"\x1b[0m")}}}else{if(i===".css"){if(!c.hasOwnProperty(h)){if(checkOutPath(b)){c[h]=[a,b,h,"css"]}else{console.log("Not found the path:\x1b[41m",b,"\x1b[0m")}}}}f=setTimeout(function(){Object.keys(c).forEach(function(n){compress.apply(null,c[n])});c={}},100)}});e.forEach(function(g){var h=path.join(a,g);fs.lstatSync(h).isDirectory()&&watch(h,path.join(b,g))})}function checkOutPath(a){if(fs.existsSync(a)){return true}var f=[a],d,b;d=path.dirname(a);while(!fs.existsSync(d)){f.push(d);d=path.dirname(a)}b=f.length;try{while(b--){fs.mkdirSync(f[b])}}catch(c){return false}return true}fs.lstat(config.path,function(b,a){if(b){console.log("\x1b[41m 未能找到config.js文件中配置的path路径！\x1b[0m")}else{if(a.isDirectory()){fs.realpath(config.path,function(d,c){watch(c)});console.log("\x1b[44m Listening on path:\x1b[0m",config.path)}else{console.log("\x1b[41m config.js文件中,path配置必须是文件夹！\x1b[0m")}}});