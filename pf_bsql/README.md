**Installation**  
npm install pf_bsql  

**Usage**

**insert**  
`
const bsql = require("pf_bsql");

var query = bsql._insert("user_info").columns(["email","nick","age"]).values(["test@gmail.com","test",11]).build();

var query = bsql._insert("user_info").row({"email":"test@gmail.com","nick":"test","age":11}).build();

console.log(query.sql,query.values)
`

**update**  
`
var query = bsql._update("uinfo").change("age","+",2).where("email","=","test@gmail.com").build();

console.log(query.sql,query.values);
// UPDATE `uinfo` SET `age`=`age`+? WHERE `email`=? , [2,"test@gmail.com"]
`

**select**  
`
var query = bsql._query("uinfo").select(["id","age"]).where("id","<",3).build();

console.log(query.sql,query.values);  
// SELECT `id`,`age` FROM `uinfo` WHERE `id`<? , [3]
`