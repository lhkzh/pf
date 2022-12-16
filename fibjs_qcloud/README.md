qcloud api for fibjs version

COSObject支持：腾讯云cos的object的crud。    
SCFClient：云函数的基础支持  
ApiBase: api基础调用支持（可参照SCFClient 编写其他自己需要的api函数调用）    

<pre>
const COSBucket=require("fibjs_qcloud").COSBucket;
const COSObject=require("fibjs_qcloud").COSObject;
let conf = {secretId:SECRET_ID, secretKey:SECRET_KEY, appId:APPID, endpoint:"https://xxxx-10000.cos.ap-shanghai.myqcloud.com", bucket:"xxxx-10000"};
let bucket = new COSBucket(conf);
let cosObj = new COSObject(conf);

bucket.listObjects({prefix:"wx/", "max-keys":1000})；

cosObj.headObject("wx/tmp.jpg");
cosObj.deleteObject("wx/tmp.jpg");
</pre>