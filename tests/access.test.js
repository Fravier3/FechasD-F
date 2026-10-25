import test from 'node:test';
import assert from 'node:assert/strict';
import {validAccessCode,unlockWithCode} from '../access.js';
test('el código es texto numérico de cuatro dígitos y conserva ceros iniciales',()=>{assert.equal(validAccessCode('0012'),true);for(const value of [12,'12','12345','abcd',' 1234'])assert.equal(validAccessCode(value),false);});
test('el código se envía al servidor y no se comprueba en el cliente',async()=>{
 const token='a'.repeat(43);let received;
 const result=await unlockWithCode('0012',{url:'https://example.com',key:'public',fetcher:async(url,options)=>{received={url,options};return{ok:true,status:200,json:async()=>({access:token})};}});
 assert.equal(result,token);assert.equal(received.url,'https://example.com/functions/v1/fechas-access');assert.deepEqual(JSON.parse(received.options.body),{code:'0012'});assert.equal(received.options.cache,'no-store');
});
test('rechaza un código incorrecto y comunica límites de intentos',async()=>{
 await assert.rejects(()=>unlockWithCode('1234',{url:'https://example.com',key:'public',fetcher:async()=>({ok:false,status:401,json:async()=>({error:'incorrect_code'})})}),/no es correcto/);
 await assert.rejects(()=>unlockWithCode('1234',{url:'https://example.com',key:'public',fetcher:async()=>({ok:false,status:429,json:async()=>({retry_after:900})})}),/15 minutos/);
});
