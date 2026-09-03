import { env } from 'cloudflare:workers';
export type InventoryRow={id:number;productId:number;name:string;itemType:'card'|'sealed';printing:string;quantity:number;marketPrice:number|null;updatedAt:string|null};
export async function listInventory(ownerId:string):Promise<InventoryRow[]>{const r=await env.DB.prepare(`SELECT id,product_id AS productId,name,item_type AS itemType,printing,quantity,market_price AS marketPrice,updated_at AS updatedAt FROM inventory WHERE owner_id=? ORDER BY id DESC`).bind(ownerId).all<InventoryRow>();return r.results}
