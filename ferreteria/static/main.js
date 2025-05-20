let productoSeleccionado = null;

document.addEventListener('DOMContentLoaded', () => {
  const productosSelect = document.getElementById("productosSelect");
  const sucursalSelect = document.getElementById("sucursalSelect");
  const cantidadInput = document.getElementById("cantidad");
  const totalCLPSpan = document.getElementById("totalCLP");
  const totalUSDSpan = document.getElementById("totalUSD");

  // Cargar productos al iniciar
  fetch("/api/productos")
    .then(res => res.json())
    .then(data => {
      productosSelect.innerHTML = "";
      data.forEach(producto => {
        const option = document.createElement("option");
        option.value = producto.codigo;
        option.textContent = `${producto.nombre} - ${producto.marca}`;
        option.dataset.producto = JSON.stringify(producto);
        productosSelect.appendChild(option);
      });

      if (data.length > 0) {
        seleccionarProducto(data[0]);
      }
    });

  // Cuando cambia el producto
  productosSelect.addEventListener("change", (e) => {
    const producto = JSON.parse(e.target.selectedOptions[0].dataset.producto);
    seleccionarProducto(producto);
  });

  // Cuando cambia la sucursal o la cantidad
  sucursalSelect.addEventListener("change", actualizarTotales);
  cantidadInput.addEventListener("input", actualizarTotales);

  function seleccionarProducto(producto) {
    productoSeleccionado = producto;
    // Llenar select de sucursales con las del producto
    sucursalSelect.innerHTML = "";
    producto.stock.forEach(s => {
      const option = document.createElement("option");
      option.value = s.sucursal_id;
      option.textContent = `Sucursal ${s.sucursal_id} - $${s.precio} - ${s.cantidad} disponibles`;
      option.dataset.precio = s.precio;
      option.dataset.stock = s.cantidad;
      sucursalSelect.appendChild(option);
    });

    // Reset cantidad a 1
    cantidadInput.value = 1;

    // Actualizar totales para el primer stock
    actualizarTotales();
  }

  function actualizarTotales() {
    if (!productoSeleccionado) return;

    const cantidad = parseInt(cantidadInput.value) || 0;
    const sucursalId = parseInt(sucursalSelect.value);
    const stockSucursal = productoSeleccionado.stock.find(s => s.sucursal_id === sucursalId);

    if (!stockSucursal) {
      alert("Sucursal seleccionada no tiene stock");
      totalCLPSpan.textContent = "$0";
      totalUSDSpan.textContent = "$0";
      return;
    }

    if (cantidad > stockSucursal.cantidad) {
      alert("Cantidad supera el stock disponible");
      cantidadInput.value = stockSucursal.cantidad;
      return;
    }

    const totalCLP = cantidad * stockSucursal.precio;
    totalCLPSpan.textContent = `$${totalCLP.toLocaleString()}`;

    fetch(`/api/convertir?clp=${totalCLP}`)
      .then(res => res.json())
      .then(data => {
        totalUSDSpan.textContent = `$${data.usd}`;
      });
  }
});
