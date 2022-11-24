const { Product } = require("../models/Product");

const getPrices = async () => {
    var productsString = "";
    const products = await Product.find();
    
    if (!products) {
        console.log("No products");
    } else {
        products.forEach(product=>{
            productsString =+ product.sysId + ",";
        });
        productsString = productsString.slice(0, -1);
        console.log("Products string: " + productsString);
        const syscomAuth = process.env.SYSCOM_AUTH;
        const url = process.env.SYSCOM_URL + "productos/" + productsString;
        const resSyscomProducts = await fetch("https://developers.syscom.mx/api/v1/productos/"+productsString,{
            method: 'GET',
            headers: {
              Authorization: "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImY2MWIzYjE2NTBjMzA4ZDFlYzU2NWJhYTZjZDdjMmZjOTJhN2I3NWIzNDZkMGVkZDAxMDVjNGJhZmJlODJiMDY4MGJlOGNjZTlmYzQ1MDM3In0.eyJhdWQiOiJrOGlWTVoxQ2traWRveE14bE9QQm1KOGM0Wk80YmJrRSIsImp0aSI6ImY2MWIzYjE2NTBjMzA4ZDFlYzU2NWJhYTZjZDdjMmZjOTJhN2I3NWIzNDZkMGVkZDAxMDVjNGJhZmJlODJiMDY4MGJlOGNjZTlmYzQ1MDM3IiwiaWF0IjoxNjY4NTQxODU3LCJuYmYiOjE2Njg1NDE4NTcsImV4cCI6MTcwMDA3Nzg1Nywic3ViIjoiIiwic2NvcGVzIjpbXX0.t-1qkhVeL_2n-SFLwyuz5Dy-FHdPIAg3rD_z5yarjAxFquz-nbqb2vHXu_fgOXwHAPZJOKDc60Vm2VnsymXmu2nZ6pb1MMyBBsjeuzC4j6cY-9OT2V_HMQ3Ym7fYoKTe7IahlObelTi3oQ31AOE57KxXlyeaVo8B7qS0aQjpGt2Icdt9CIWReR3z_k57XCWcDH_220iNPC7FRFq89vHeoBcs26z7kZmdNZxjaryjGTiS1rXLCGt-WEYEmA5ZGXMEncokV7SnCTpDgSJqaeEvTAp--nF2V0oghtQiFhG30swPDU4ZmICH02ucbeVK-YQ7ZhHXN1Fnayuzumf4wdoOSGvHDrwPmY66AF9WhHbpTAJf9vaO7kImwtU1SLehLtdvtVB7bEMFMfqUXef3_Mz70siUd__2iKcGIb7Dm2eyEM5WXMRgYaexXFdwEvrKAmgZS8SmCmz0ZD_nH4D1WEmwesnYuuY-6PixcgBQZOM6IAPsvAgVAXUSWS5kN0h_7aiR5bRk5KFVMYw0r2OTZMx6u5i7Yqdjr5c1YxrB8XyojHu4itqz-kAtUUJIEiND3Iq9s5gt_kO-EO-cYQE-ckNFT4WxCO4OpoCkQK15xLyHb-CekZoWVJyEMRV3vbIZiJo_x_d3-NE9TK7lHyapfiK6Qat3AgBQ2MkNE4Pc_BVZCmM"
              ,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          });
        const syscomProducts = resSyscomProducts.json();
        if(!syscomProducts){
            console.log("No products received from syscom");
        }else{
            updateProducts(syscomProducts);
        }
    }
};

const updateProducts = async (products) => {
    for(let i = 0; i < products.length; i++){
        const filter = { sysID: products[i].producto_id };
        const update = { price: products[i].precios.precio_descuento };
        const productCreated = await Product.findOneAndUpdate(filter, update);
        if(!productCreated) {
            console.log("Product " + products[i].producto_id + " was not updated");
        }else{
            console.log("Product " + products[i].producto_id + " was successfully updated");
        }
    }
}

module.exports = getPrices;