const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const getBestProducts = async () => {
  const url = process.env.SYSCOM_URL + "marcas/ezviz/productos";
  const resSyscomProducts = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: process.env.SYSCOM_AUTH,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  const syscomProducts = await resSyscomProducts.json();
  if (!syscomProducts) {
    console.log("Error de comunicación con syscom");
  } else {
    printProducts(syscomProducts.productos);
  }
};

const printProducts = async (products) => {
  for (let i = 0; i < products.length; i++) {
    let diferencia;
    let porcentaje;
    if (products[i].precios.precio_especial) {
      diferencia =
        Number(products[i].precios.precio_especial) -
        Number(products[i].precios.precio_descuento);
      porcentaje = diferencia / Number(products[i].precios.precio_especial);
    } else {
      diferencia =
        Number(products[i].precios.precio_lista) -
        Number(products[i].precios.precio_descuento);
      porcentaje = diferencia / Number(products[i].precios.precio_lista);
    }
    if (porcentaje >= 0.4)
      console.log(
        "Producto mamalón: " +
          products[i].modelo +
          ", Porcentaje de utilidad: " +
          porcentaje * 100
      );
  }
};

module.exports = getBestProducts;
