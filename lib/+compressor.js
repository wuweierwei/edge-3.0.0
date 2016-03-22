/*! ander <anderpang@qq.com> 2016/3/15 */
"use strict";
var spawn=require("child_process").spawn,
    fs=require("fs"),
    path=require("path"),
    stream=require("stream"),
    Readable=stream.Readable,
    Writable=stream.Writable,
    util=require("util"),
    zlib=require("zlib"),
    cssRule=require("./cssRule"),
    config=require("../config"),    
    charset=config.charset||"utf8",
    jar;



Function.prototype.method=function(name,fn){
  return this.prototype[name]=fn,this;
};

/* Reader start */
function Reader(opt) {
  Readable.call(this,opt);
}
util.inherits(Reader, Readable);
Reader.method("_read", function(){}).method("writeFile",function(out,isGzipFile){
  this.push(null);
  isGzipFile?
     this.pipe(zlib.createGzip()).pipe(fs.createWriteStream(out+".gz")):
     this.pipe(fs.createWriteStream(out));
});
/* Reader end */

/* Writer start */
function getWriter(){
  var w=new Writable({
    write:function(buffer,encoding,next){
      this._data.push(buffer);
      next();
    }
  });
  w._data=[];
  w.toString=function(charset){
    return Buffer.concat(this._data).toString(charset||"utf8");
  };
  return w;
}
/* Writer end */

fs.readdirSync(__dirname).some(function(file){
   if(path.extname(file)===".jar"){
     jar=path.join(__dirname,file);
     return true;
   }
});

function compress(realpath,outpath,name,type)
{
  var mergejson=path.join(realpath,"merge.json"),mergeList,isMerge=false;
  if(config.openMerge&&fs.existsSync(mergejson))
  {
     mergeList=require(mergejson);
     mergeList.forEach(function(list){
       if(list.indexOf(name)!=-1)
       {
         isMerge=true;
         _compressMulti(realpath,outpath,name,list,type);
       }
     });
  }
  
  isMerge||_compressOne(path.join(realpath,name),path.join(outpath,name),type);
}

//获取子进程
function _getCP(type,src,out)
{
    var args=["-jar",jar,"--charset",charset,"--type",type],cp=spawn("java",args);

    cp.stderr.on('data',function(data){
      console.log("process stderr:", data);
    });

    cp.on("exit",function(){
      console.log("\x1b[32m Success\x1b[0m :",src,"->",out);
    });
    
    return cp;
} 

//css处理
function _cssDispose(str){
   var keyframes=[];

     str=cssRule.keyframes.out(str,keyframes); //先把@keyframes给提出来
     
     cssRule.rules.forEach(function(rule){
       str=str.replace(rule.reg,rule.fn);
     });
     
     str=cssRule.keyframes.put(str,keyframes); //先把@keyframes填进去
     
     keyframes=null;

     return str;
}

//生成压缩、及gzip数据
function _dataListener(cp,out,isGzip)
{
   var outReader=new Reader(),gzipReader;

   if(isGzip)
   {
     gzipReader=new Reader();

     cp.stdout.on('data',function(buffer){
       outReader.push(buffer);
       gzipReader.push(buffer);
     });

     cp.stdout.on("end",function(){
        outReader.writeFile(out,false);
        gzipReader.writeFile(out,true);
     });
   }
   else
   {
     cp.stdout.on('data',function(buffer){
        outReader.push(buffer);
      });
      cp.stdout.on("end",function(){
        outReader.writeFile(out,false);
     });
   }
}

//单文件压缩
function _compressOne(src,out,type){
  
   var cp,stm=fs.createReadStream(src),writer; 

    if(type==="css")
    {   
       writer=getWriter();
       writer.on("finish",function(){

           var cssText=_cssDispose(this.toString(charset)), //解析出css兼容文本
               cp=_getCP(type,src,out);

           _dataListener(cp,out,config.cssGzip);
           cp.stdin.write(cssText);
           cp.stdin.end();
       });
       stm.pipe(writer);

    }
    else
    {
      cp=_getCP(type,src,out);

      _dataListener(cp,out,config.jsGzip);
      
      stm.on("end",function(){
        cp.stdin.end();
      });

      stm.pipe(cp.stdin);
    }
}

//合并文件
function _compressMulti(realpath,outpath,name,list,type)
{
   var filename=list.map(function(nm){return path.basename(nm)}).join(","),out=path.join(outpath,filename),realnames=[],isExists=true,errfile;

   //检查文件是否存在
   list.some(function(nm){
       var src=path.join(realpath,nm);
       if(nm!==name&&!fs.existsSync(src))
       {
         isExists=false;
         errfile=src;
         return true;
       }
       realnames.push(src);      
   });

   if(!isExists)
   {
     console.log("\x1b [31m Not found the file\x1b[0m：",errfile);
     return;
   }

   list=realnames.map(function(src){
     return new Promise(function(resolve){
         resolve(fs.createReadStream(src));
     });
   });

   Promise.all(list).then(function(streams){ 
     var cp,loop,cssTexts;
     streams.reverse();
     cp=_getCP(type,"Merge",out);

     if(type==="css")
     {
        cssTexts=[];
        _dataListener(cp,out,config.cssGizp);
        loop=function(){
          var writer=getWriter(),s;
          if(streams.length)
          {
            s=streams.pop();
            writer.on("finish",function(){
               cssTexts.push(this.toString(charset));
               loop();
            });
            s.pipe(writer);
          }
          else
          {
            cssTexts.forEach(function(text){
               cp.stdin.write(_cssDispose(text));
            });
            cp.stdin.end();
          }
        }
        loop();
     }
     else
     { 
       _dataListener(cp,out,config.jsGzip);
        loop=function(){
             var s;
            if(streams.length)
            {            
              s=streams.pop();
              s.on("end",loop);
              s.pipe(cp.stdin,{end:false});
            }
            else
            {
              cp.stdin.end();            
            }
         };

         loop();
     }
   });
}

module.exports=compress;