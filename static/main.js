let sucursales = [];

document.addEventListener("DOMContentLoaded", () => {
  cargarSucursales();

  document
    .getElementById("sucursalSelect")
    .addEventListener("change", cargarProductos);
  document
    .getElementById("productoSelect")
    .addEventListener("change", mostrarPrecioYTotal);
  document.getElementById("cantidad").addEventListener("input", calcularTotal);
});

async function cargarSucursales() {
  try {
    const res = await fetch("/sucursales");
    if (!res.ok) throw new Error("No se pudo cargar las sucursales");

    const data = await res.json();
    sucursales = data;

    const selectSucursal = document.getElementById("sucursalSelect");
    selectSucursal.innerHTML =
      '<option value="">-- Selecciona una sucursal --</option>';

    sucursales.forEach((sucursal) => {
      const option = document.createElement("option");
      option.value = sucursal.sucursal_id;
      option.textContent = sucursal.nombre_sucursal;
      selectSucursal.appendChild(option);
    });
  } catch (err) {
    alert("Error al cargar sucursales: " + err.message);
  }
}

function cargarProductos() {
  const idSucursal = document.getElementById("sucursalSelect").value;
  const sucursal = sucursales.find((s) => s.sucursal_id == idSucursal);

  const formatter = new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const selectProducto = document.getElementById("productoSelect");
  selectProducto.innerHTML =
    '<option value="">-- Selecciona un producto --</option>';

  if (sucursal && sucursal.productos) {
    sucursal.productos.forEach((producto) => {
      const option = document.createElement("option");
      option.value = producto.producto_id;
      option.textContent = `${producto.nombre_producto} - ${formatter.format(
        producto.precio
      )}`;
      option.dataset.precio = producto.precio;
      selectProducto.appendChild(option);
    });
  }

  // Reiniciar los precios
  document.getElementById("precioUnitario").textContent = "0";
  document.getElementById("total").textContent = "0";
  document.getElementById("totalUSD").textContent = "0";
}
function mostrarPrecioYTotal() {
  console.log("Cambiando producto...");
  console.log("nom");
  const selectProducto = document.getElementById("productoSelect");
  const selectedOption = selectProducto.options[selectProducto.selectedIndex];

  const precio = selectedOption?.dataset?.precio;
  if (!precio) return;

  document.getElementById("precioUnitario").textContent = precio;
  calcularTotal();
}

async function calcularTotal() {
  const precio = parseInt(
    document.getElementById("precioUnitario").textContent
  );
  const cantidad = parseInt(document.getElementById("cantidad").value);

  // Formateadores para CLP y USD
  const formatterCLP = new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  });

  const formatterUSD = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });

  if (!isNaN(precio) && cantidad > 0) {
    const total = precio * cantidad;

    // Mostrar total formateado en CLP
    document.getElementById("total").textContent = formatterCLP.format(total);

    try {
      const res = await fetch("/calcular_usd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ total_clp: total }),
      });

      const data = await res.json();
      const totalUSD = data.total_usd;

      document.getElementById("totalUSD").textContent =
        totalUSD != null ? formatterUSD.format(totalUSD) : "Error";
    } catch {
      document.getElementById("totalUSD").textContent = "Error";
    }
  } else {
    document.getElementById("total").textContent = formatterCLP.format(0);
    document.getElementById("totalUSD").textContent = formatterUSD.format(0);
  }
}

function confirmarCompra() {
  const sucursalId = document.getElementById("sucursalSelect").value;
  const productoId = document.getElementById("productoSelect").value;
  const cantidad = parseInt(document.getElementById("cantidad").value);

  // Obtener texto del total y eliminar símbolos y puntos
  const totalText = document
    .getElementById("total")
    .textContent.replace(/\$/g, "")  
    .replace(/\./g, "")              
    .trim();

  const totalCLP = parseInt(totalText);

  console.log("Sucursal:", sucursalId);
  console.log("Producto:", productoId);
  console.log("Cantidad:", cantidad);
  console.log("Total CLP (parseado):", totalCLP);

  if (
    !sucursalId ||
    !productoId ||
    isNaN(cantidad) ||
    cantidad <= 0 ||
    isNaN(totalCLP)
  ) {
    mostrarToast("⚠️ Completa todos los campos correctamente.");
    return;
  }

  iniciarPago(totalCLP, sucursalId, cantidad);
}


function iniciarPago(monto, sucursal, cantidad) {
  fetch("/iniciar_pago", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: monto,
      sucursal: sucursal,
      cantidad: cantidad,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.url && data.token) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = data.url;

        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "token_ws";
        input.value = data.token;

        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
      } else {
        mostrarToast("❌ Error al iniciar el pago.");
      }
    })
    .catch((error) => {
      console.error("Error en el pago:", error);
      mostrarToast("❌ Hubo un problema al conectar con el servidor.");
    });
}

function mostrarToast(mensaje) {
  const toast = document.getElementById("miToast");
  const toastMensaje = document.getElementById("toastMensaje");

  if (toast && toastMensaje) {
    toastMensaje.textContent = mensaje;
    toast.classList.add("mostrar");

    setTimeout(() => {
      toast.classList.remove("mostrar");
    }, 3000);
  } else {
    alert(mensaje); // Fallback si el toast no existe
  }
}
