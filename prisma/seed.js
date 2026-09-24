require('dotenv').config();
const {PrismaClient}=require('@prisma/client');
const bcrypt=require('bcryptjs');
const prisma=new PrismaClient();

async function main(){
  await prisma.orderItem.deleteMany();await prisma.order.deleteMany();await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();await prisma.product.deleteMany();await prisma.store.deleteMany();await prisma.user.deleteMany();
  const passwordHash=await bcrypt.hash('DevPassword123!',12);
  const [admin,ama,tunde,buyer]=await Promise.all([
    prisma.user.create({data:{fullName:'MarketHub Admin',email:'admin@nextgen.local',phone:'+234 800 000 0000',passwordHash,role:'ADMIN'}}),
    prisma.user.create({data:{fullName:'Ama Okoro',email:'ama@freshnest.local',phone:'+234 803 555 0192',passwordHash,role:'SELLER',status:'APPROVED'}}),
    prisma.user.create({data:{fullName:'Tunde Bello',email:'tunde@urbanloom.local',phone:'+234 805 124 0876',passwordHash,role:'SELLER',status:'PENDING'}}),
    prisma.user.create({data:{fullName:'Maya Johnson',email:'maya@example.local',phone:'+234 810 900 4110',passwordHash,role:'BUYER',cart:{create:{}}}})
  ]);
  const fresh=await prisma.store.create({data:{sellerId:ama.id,name:'The Heritage Vault - Vintage Online Store',description:'Curated timeless vintage fashion, retro vinyl, classic leather accessories, and rare antique home decor.',address:'17 Admiralty Way',city:'Lekki',state:'Lagos',country:'Nigeria',phone:ama.phone,status:'APPROVED'}});
  await prisma.store.create({data:{sellerId:tunde.id,name:'Tunde’s Market Finds',description:'Pending neighbourhood collection.',address:'8 Unity Close',city:'Surulere',state:'Lagos',country:'Nigeria',phone:tunde.phone,status:'PENDING'}});
  await prisma.product.createMany({data:[
    {storeId:fresh.id,name:'1970s Classic Gold Chronograph Watch',description:'Authentic vintage Japanese movement with genuine leather strap.',price:45000,quantity:8,category:'Vintage Accessories',imageUrl:'/uploads/vintage_gold_watch.jpg'},
    {storeId:fresh.id,name:'Handcrafted Full-Grain Leather Briefcase',description:'Aged saddle-tan leather with antique brass buckles and durable canvas lining.',price:38500,quantity:12,category:'Vintage Leather',imageUrl:'/uploads/vintage_leather_bag.jpg'},
    {storeId:fresh.id,name:'Mid-Century Brass Desk Lamp',description:'Restored 1960s warm brass architectural desk lamp with rotatable shade.',price:24000,quantity:6,category:'Home & Curios'},
    {storeId:fresh.id,name:'Hass Avocados',description:'Creamy, ripe avocados.',price:2200,quantity:18,category:'Fresh food'},
    {storeId:fresh.id,name:'Vine Tomatoes',description:'Sweet tomatoes for cooking.',price:1450,quantity:26,category:'Fresh food'}
  ]});
  console.log('Seeded. DEVELOPMENT ONLY password for all accounts: DevPassword123!');
}
main().finally(()=>prisma.$disconnect());
