/*! ander <anderpang@qq.com> 2016/3/17 */
"use strict";
var path=require("path"),
    spawn=require("child_process").spawn,
    child;

function _start(){
    child=spawn("node",[path.join(__dirname,"lib","client.js")]);

    child.stdout.setEncoding('utf8'); 
    child.stderr.setEncoding('utf8');

    child.stdout.on("data",function(data){ 
      console.log(data); 
    }); 

    child.stderr.on("data",function(data) {
       if(data.indexOf("FSEvent.FSWatcher._handle.onchange")===-1)
       {
         console.log("\x1b[31mERROR\x1b[0m:\n"+data); 
       }
       this.emit("exit",99);
    }); 

    child.on("exit",function(code, signal) {
      if(code===99||code===1)
      {
        clearClient();
        process.nextTick(_start);
        console.log("\x1b[44m Ready to restart... \x1b[0m ");
      }
      else
      {
       console.log("\x1b[44m Server was closed! \x1b[0m");
      }
   });   
}

function clearClient(){
  child.kill();  
}

function start(){
  _start();

  process.on("uncaughtException",function(err){
    console.log("\x1b[31Main process\x1b[0m:\n",err);
    clearClient();
  });
}

start();