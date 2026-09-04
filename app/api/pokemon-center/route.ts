import { getChatGPTUser } from '@/app/chatgpt-auth';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key:string]:JsonValue };

function skuFromInput(input:string){
  const value=input.trim();
  try{
    const url=new URL(value);
    if(url.hostname!=='pokemoncenter.com'&&!url.hostname.endsWith('.pokemoncenter.com'))return null;
    const parts=url.pathname.split('/').filter(Boolean);
    const index=parts.indexOf('product');
    return index>=0?parts[index+1]?.toUpperCase()||null:null;
  }catch{return /^[a-z0-9-]{3,40}$/i.test(value)?value.toUpperCase():null}
}

function findProduct(value:JsonValue):Record<string,JsonValue>|null{
  if(Array.isArray(value)){for(const child of value){const found=findProduct(child);if(found)return found}return null}
  if(value&&typeof value==='object'){
    const obj=value as Record<string,JsonValue>,type=obj['@type'];
    if(type==='Product'||(Array.isArray(type)&&type.includes('Product')))return obj;
    for(const child of Object.values(obj)){const found=findProduct(child);if(found)return found}
  }
  return null;
}

function text(value:JsonValue|undefined){return typeof value==='string'?value.trim():''}
function priceFrom(product:Record<string,JsonValue>|null){
  if(!product)return null;
  const offers=Array.isArray(product.offers)?product.offers[0]:product.offers;
  if(!offers||typeof offers!=='object')return null;
  const raw=(offers as Record<string,JsonValue>).price;
  const price=Number(raw);
  return Number.isFinite(price)&&price>0?price:null;
}

export async function POST(request:Request){
  const user=await getChatGPTUser();
  if(!user)return Response.json({errorCode:'AUTH_REQUIRED'},{status:401});
  const {input=''}=await request.json().catch(()=>({})) as {input?:string};
  const requestedSku=skuFromInput(input);
  if(!requestedSku)return Response.json({errorCode:'INVALID_ID'},{status:400});
  let sourceUrl:string;
  try{const parsed=new URL(input);sourceUrl=parsed.toString()}catch{sourceUrl=`https://www.pokemoncenter.com/product/${encodeURIComponent(requestedSku)}`}
  try{
    const response=await fetch(sourceUrl,{headers:{'accept':'text/html,application/xhtml+xml','accept-language':'en-US,en;q=0.9','user-agent':'Mozilla/5.0 (compatible; CardVault/1.0)'}});
    const finalUrl=new URL(response.url);
    if(!response.ok||(finalUrl.hostname!=='pokemoncenter.com'&&!finalUrl.hostname.endsWith('.pokemoncenter.com')))throw new Error('fetch');
    const html=await response.text();
    let product:Record<string,JsonValue>|null=null;
    for(const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
      try{product=findProduct(JSON.parse(match[1]) as JsonValue);if(product)break}catch{}
    }
    const sourceId=text(product?.sku).toUpperCase()||html.match(/(?:Original\s+)?SKU[^A-Z0-9]{0,20}([A-Z0-9][A-Z0-9-]{2,39})/i)?.[1]?.toUpperCase()||requestedSku;
    const name=text(product?.name)||html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1]?.trim()||'';
    const fallbackPrice=Number(html.match(/["']price["']\s*:\s*["']?([0-9]+(?:\.[0-9]{1,2})?)/i)?.[1]||NaN);
    const officialPrice=priceFrom(product)??(Number.isFinite(fallbackPrice)&&fallbackPrice>0?fallbackPrice:null);
    return Response.json({product:{sourceId,name,officialPrice,sourceUrl:response.url},complete:Boolean(name&&officialPrice)});
  }catch{return Response.json({product:{sourceId:requestedSku,name:'',officialPrice:null,sourceUrl},complete:false})}
}
